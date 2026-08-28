# ============================================================
#  deploy-medisxime.ps1  —  MedisXime deployment en GCP
#  VM: cuidame-app | IP: 35.239.162.75 | Proyecto: esmart-health
#
#  USO:
#    .\deploy-medisxime.ps1                        (deploy completo)
#    .\deploy-medisxime.ps1 -Target frontend        (solo subir el frontend compilado)
#    .\deploy-medisxime.ps1 -Target backend         (solo backend: install+migraciones+PM2)
#    .\deploy-medisxime.ps1 -DbPass "OtraPass!" -SkipUpload
#
#  -Target frontend / -Target backend asumen que la VM ya fue provisionada
#  al menos una vez con -Target all (default) — se saltan apt-get/Postgres/
#  nginx/Certbot, que solo hacen falta en el primer deploy o si cambia la
#  infraestructura.
# ============================================================

param(
    [string]$DbPass    = "medisXime2024Secure!",
    [string]$JwtSecret = "",
    [string]$SisproSecret = "",
    [string]$EmailPassword = "",
    [string]$AdminPassword = "",
    [string]$CertbotEmail = "admin@medisxime.com",
    [switch]$SkipUpload,
    [ValidateSet("all", "frontend", "backend")]
    [string]$Target = "all"
)
$DbPassword = $DbPass   # alias interno para compatibilidad con placeholders

$ErrorActionPreference = "Continue"

# ── CONFIG ──────────────────────────────────────────────────
$VM_NAME     = "cuidame-app"
$ZONE        = "us-central1-a"
$PROJECT_ID  = "esmart-health"
$VM_IP       = "35.239.162.75"
$WEB_PORT    = "80"
$HTTPS_PORT  = "443"
$APP_PORT    = "3010"
$SITE_HOST   = "docxime.cuidame.tech"
$DB_NAME     = "medisXime_prod"
$DB_USER     = "medisXime_user"
$APP_DIR     = "/var/www/medisXime"
$PROJ_ROOT   = Split-Path $PSScriptRoot -Parent

# ── SECRETOS ──────────────────────────────────────────────────
# Nunca hardcodear passwords/API keys en este script (esta ya versionado en
# git). Los secretos viven en scripts/.env.deploy (gitignored via .env.* en
# .gitignore) y se generan/persisten solos la primera vez. Ver
# scripts/.env.deploy.example para el formato.
$secretsFile = Join-Path $PSScriptRoot ".env.deploy"
$secrets = @{}
if (Test-Path $secretsFile) {
    Get-Content $secretsFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)\s*$') {
            $secrets[$Matches[1]] = $Matches[2]
        }
    }
}

function New-StrongSecret {
    $bytes = [byte[]]::new(32)
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([System.BitConverter]::ToString($bytes) -replace '-', '').ToLower()
}

function Get-OrCreateSecret([string]$Name, [string]$ParamValue) {
    if ($ParamValue) { return $ParamValue }
    if ($secrets.ContainsKey($Name) -and $secrets[$Name]) { return $secrets[$Name] }
    throw "Falta '$Name' en $secretsFile (o pasalo con -$Name). Ver scripts/.env.deploy.example."
}

# JWT_SECRET/SISPRO_SECRET: si no vienen por parametro ni existen ya en
# .env.deploy, se generan una sola vez (32 bytes aleatorios) y se persisten
# en el archivo, para que deploys futuros NO los regeneren — regenerarlos en
# cada deploy invalida todas las sesiones activas y, peor, vuelve
# irrecuperables las credenciales SISPRO ya cifradas (ver errores-conocidos.md).
$secretsChanged = $false
if (-not $JwtSecret) {
    $JwtSecret = $secrets['JWT_SECRET']
    if (-not $JwtSecret) { $JwtSecret = New-StrongSecret; $secrets['JWT_SECRET'] = $JwtSecret; $secretsChanged = $true }
}
if (-not $SisproSecret) {
    $SisproSecret = $secrets['SISPRO_SECRET']
    if (-not $SisproSecret) { $SisproSecret = New-StrongSecret; $secrets['SISPRO_SECRET'] = $SisproSecret; $secretsChanged = $true }
}
$EmailPassword = Get-OrCreateSecret 'EMAIL_PASSWORD' $EmailPassword
$AdminPassword = Get-OrCreateSecret 'ADMIN_PASSWORD' $AdminPassword

if ($secretsChanged) {
    ($secrets.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "`n" |
        Out-File -FilePath $secretsFile -Encoding utf8 -NoNewline
    Write-Host "  [OK] JWT_SECRET/SISPRO_SECRET generados y guardados en $secretsFile" -ForegroundColor Green
}

# ── HELPERS ──────────────────────────────────────────────────
function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host ("=" * 62) -ForegroundColor DarkCyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("=" * 62) -ForegroundColor DarkCyan
}
function Write-OK([string]$msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green  }
function Write-Warn([string]$msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }

# Escribe el script bash en un .sh temporal con saltos LF, lo sube y ejecuta
function Invoke-RemoteBash {
    param([string]$Script, [string]$Label = "step")

    $lf   = $Script -replace "`r`n", "`n" -replace "`r", "`n"
    $base = "medisxime_$(Get-Date -Format 'HHmmss_fff')"
    $local = Join-Path $env:TEMP "$base.sh"
    [System.IO.File]::WriteAllText($local, $lf, [System.Text.UTF8Encoding]::new($false))

    $remote    = "/tmp/$base.sh"
    $remoteLog = "/tmp/$base.log"
    $remoteRc  = "/tmp/$base.rc"
    $launcher  = "/tmp/$base.run"

    # Wrapper: corre el script en background y guarda el exit code en un archivo
    $launcherText = ((@'
#!/bin/bash
(bash __SCRIPT__ > __LOG__ 2>&1; echo $? > __RC__) &
'@) -replace '__SCRIPT__', $remote -replace '__LOG__', $remoteLog -replace '__RC__', $remoteRc)
    $launcherLf = $launcherText -replace "`r`n", "`n" -replace "`r", "`n"
    $localLauncher = Join-Path $env:TEMP "$base.run"
    [System.IO.File]::WriteAllText($localLauncher, $launcherLf, [System.Text.UTF8Encoding]::new($false))

    try {
        # Subir script principal y launcher
        gcloud compute scp $local "${VM_NAME}:${remote}" `
            --zone=$ZONE --project=$PROJECT_ID --quiet 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "SCP fallo en $Label" }

        gcloud compute scp $localLauncher "${VM_NAME}:${launcher}" `
            --zone=$ZONE --project=$PROJECT_ID --quiet 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "SCP launcher fallo en $Label" }

        # Lanzar en background — SSH retorna inmediatamente
        gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
            --command="bash $launcher" --quiet 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Lanzador fallo en $Label" }

        # Sondeo: primer chequeo inmediato (sin dormir antes), despues cada 2 s
        # -- antes dormia 15 s fijos ANTES del primer chequeo en cada vuelta,
        # asi que un paso que terminaba en 1-2 s (la mayoria, tras optimizar
        # el resto del script) igual reportaba "15 s". El trabajo remoto
        # sigue en background (inmune a que se caiga esta conexion SSH de
        # sondeo), solo se achico la espera artificial entre chequeos.
        $timeout = 900
        $elapsed = 0
        $pollInterval = 2
        Write-Host "  Ejecutando $Label " -NoNewline
        while ($true) {
            $done = ((gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
                --command="test -f $remoteRc && echo 1 || echo 0" --quiet 2>$null) -join "").Trim()
            if ($done -eq "1") { break }
            Write-Host "." -NoNewline
            Start-Sleep -Seconds $pollInterval
            $elapsed += $pollInterval
            if ($elapsed -ge $timeout) { throw "Timeout en $Label (${timeout}s)" }
        }
        Write-Host " (~$elapsed s)"

        # Log completo + exit code en UNA sola conexion SSH (antes eran 2)
        $output = (gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
            --command="cat $remoteLog; echo __RC__:`$(cat $remoteRc)" --quiet 2>$null) -join "`n"
        $markerIndex = $output.LastIndexOf('__RC__:')
        if ($markerIndex -ge 0) {
            $logText = $output.Substring(0, $markerIndex).TrimEnd("`r", "`n")
            $rc = $output.Substring($markerIndex + 7).Trim()
        } else {
            $logText = $output
            $rc = "1"
        }
        if ($logText) { Write-Host $logText }
        if ($rc -ne "0") { throw "Script remoto fallo en $Label (rc=$rc)" }

    } finally {
        gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
            --command="rm -f $remote $remoteLog $remoteRc $launcher" --quiet *>$null
        Remove-Item $local, $localLauncher -ErrorAction SilentlyContinue
    }
}

# ── PASO 1: Verificar gcloud ──────────────────────────────────
Write-Step "PASO 1/12  Verificando gcloud CLI"

$v = gcloud version 2>$null | Select-String "Google Cloud SDK"
if (-not $v) {
    Write-Error "gcloud no instalado. https://cloud.google.com/sdk/docs/install"
    exit 1
}
Write-OK $v
gcloud config set project $PROJECT_ID 2>&1 | Out-Null
Write-OK "Proyecto activo: $PROJECT_ID"

# ── PASO 2: Firewall ──────────────────────────────────────────
Write-Step "PASO 2/12  Configurando firewall GCP (puertos 80 y 443)"

$rule = gcloud compute firewall-rules list `
    --filter="name=medisxime-allow-web" --format="value(name)" 2>$null
if (-not $rule) {
    gcloud compute firewall-rules create medisxime-allow-web `
        --project=$PROJECT_ID --direction=INGRESS --priority=1000 `
        --network=default --action=ALLOW --rules=tcp:80,tcp:443 `
        --source-ranges=0.0.0.0/0 --description="medisXime HTTP/HTTPS" 2>&1 | Out-Null
    Write-OK "Regla TCP:80 y TCP:443 creada"
} else {
    Write-OK "Regla TCP:80/443 ya existe"
}

# ── ATAJO: -Target frontend ────────────────────────────────────
# Un cambio de solo-frontend no necesita tocar dependencias del sistema,
# Postgres, migraciones, nginx, Certbot ni reiniciar el backend con PM2 —
# solo reemplazar los archivos estaticos que nginx ya sirve desde
# APP_DIR/medisxime-landing/dist. Se sube un paquete chico (solo el dist/
# compilado, no todo el monorepo) y se reemplaza en el servidor con un swap
# atomico (build a una carpeta nueva, luego mv sobre la vieja) para que
# nginx nunca sirva un dist a medio escribir.
if ($Target -eq "frontend") {
    Write-Step "Deploy rapido: SOLO frontend"

    $landingDir = Join-Path $PROJ_ROOT "medisxime-landing"
    if (-not (Test-Path (Join-Path $landingDir "node_modules"))) {
        Write-Host "  node_modules no encontrado, instalando dependencias del workspace..."
        Push-Location $PROJ_ROOT
        pnpm install
        if ($LASTEXITCODE -ne 0) { Pop-Location; throw "pnpm install (local) fallo" }
        Pop-Location
    }
    Push-Location $landingDir
    pnpm run build
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Build local del frontend fallo" }
    Pop-Location
    Write-OK "Frontend compilado en medisxime-landing/dist"

    $zipPath = "$env:TEMP\xime-frontend.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath }
    Compress-Archive -Path (Join-Path $landingDir "dist\*") -DestinationPath $zipPath
    $mb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-OK "Paquete: xime-frontend.zip ($mb MB)"

    gcloud compute scp $zipPath "${VM_NAME}:/tmp/xime-frontend.zip" `
        --zone=$ZONE --project=$PROJECT_ID --quiet
    if ($LASTEXITCODE -ne 0) { throw "gcloud scp fallo" }
    Write-OK "Paquete subido a /tmp/xime-frontend.zip"

    $sFrontend = (@'
#!/bin/bash
set -euo pipefail
APP_DIR="__APP_DIR__"

echo "--- Extrayendo dist nuevo ---"
rm -rf "${APP_DIR}/medisxime-landing/dist.new"
mkdir -p "${APP_DIR}/medisxime-landing/dist.new"
unzip -o /tmp/xime-frontend.zip -d "${APP_DIR}/medisxime-landing/dist.new" > /dev/null

echo "--- Swap atomico (nginx nunca sirve un dist a medio escribir) ---"
rm -rf "${APP_DIR}/medisxime-landing/dist.old"
[ -d "${APP_DIR}/medisxime-landing/dist" ] && mv "${APP_DIR}/medisxime-landing/dist" "${APP_DIR}/medisxime-landing/dist.old"
mv "${APP_DIR}/medisxime-landing/dist.new" "${APP_DIR}/medisxime-landing/dist"
rm -rf "${APP_DIR}/medisxime-landing/dist.old"

echo "=== Frontend actualizado en ${APP_DIR}/medisxime-landing/dist ==="
find "${APP_DIR}/medisxime-landing/dist" -type f | wc -l
'@) -replace '__APP_DIR__', $APP_DIR

    Invoke-RemoteBash -Label "swap-frontend" -Script $sFrontend
    Write-OK "Frontend reemplazado en la VM (sin tocar backend/DB/nginx)"

    Start-Sleep -Seconds 2
    Invoke-RemoteBash -Label "verify" -Script (@'
#!/bin/bash
HTTP_WEB=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:__WEB_PORT__ 2>/dev/null || echo "000")
echo "nginx puerto __WEB_PORT__: HTTP $HTTP_WEB"
'@ -replace '__WEB_PORT__', $WEB_PORT)

    Write-Host ""
    Write-Host ("=" * 62) -ForegroundColor Green
    Write-Host "  FRONTEND DESPLEGADO" -ForegroundColor Green
    Write-Host ("=" * 62) -ForegroundColor Green
    Write-Host "  App: https://$SITE_HOST" -ForegroundColor White
    exit 0
}

# ── PASO 3: Empaquetar proyecto ───────────────────────────────
# En este punto $Target ya es "all" o "backend" — "frontend" salio arriba
# por su propio atajo.
if (-not $SkipUpload) {
    $landingDir = Join-Path $PROJ_ROOT "medisxime-landing"

    if ($Target -eq "all") {
        # Compilar el frontend AQUI, en la maquina local (mas rapida y sin
        # pelear por CPU/memoria con el resto de la VM) en vez de subir el
        # codigo fuente y correr "vite build" remoto. Solo se sube el dist/
        # ya compilado. Se omite por completo con -Target backend, donde el
        # dist/ que ya esta en la VM de un deploy anterior queda intacto
        # (ver PASO 8, que ya no borra todo el APP_DIR).
        Write-Step "PASO 3/12  Compilando frontend localmente"
        if (-not (Test-Path (Join-Path $landingDir "node_modules"))) {
            Write-Host "  node_modules no encontrado, instalando dependencias del workspace..."
            Push-Location $PROJ_ROOT
            pnpm install
            if ($LASTEXITCODE -ne 0) { Pop-Location; throw "pnpm install (local) fallo" }
            Pop-Location
        }
        Push-Location $landingDir
        pnpm run build
        if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Build local del frontend fallo" }
        Pop-Location
        Write-OK "Frontend compilado en medisxime-landing/dist"
    } else {
        Write-Step "PASO 3/12  Build de frontend omitido (-Target backend)"
    }

    Write-Step "PASO 4/12  Creando paquete de despliegue"

    $staging = "$env:TEMP\xime-staging"
    $zipPath = "$env:TEMP\xime-deploy.zip"

    if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
    New-Item -ItemType Directory -Path $staging | Out-Null

    Write-Host "  Copiando archivos (excluye node_modules, .git, dist)..."
    robocopy $PROJ_ROOT $staging /E `
        /XD node_modules .git .turbo dist .vite `
        /XF "*.log" ".env" ".env.local" ".env.production" `
        /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    # robocopy exit 0-7 = OK (no error)
    if ($LASTEXITCODE -gt 7) { throw "robocopy fallo: $LASTEXITCODE" }

    if ($Target -eq "all") {
        # El robocopy de arriba excluye CUALQUIER carpeta "dist" (para no
        # subir basura de builds viejos, ej. apps/backend/dist de un tsc
        # suelto) — incluido el dist/ recien compilado del frontend. Se
        # copia aparte.
        Write-Host "  Copiando medisxime-landing/dist (build local)..."
        Copy-Item -Path (Join-Path $landingDir "dist") -Destination (Join-Path $staging "medisxime-landing\dist") -Recurse
    }

    if (Test-Path $zipPath) { Remove-Item $zipPath }
    Compress-Archive -Path "$staging\*" -DestinationPath $zipPath
    $mb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-OK "Paquete: xime-deploy.zip ($mb MB)"
    Remove-Item $staging -Recurse -Force

    # ── PASO 5: Subir archivo ─────────────────────────────────
    Write-Step "PASO 5/12  Subiendo paquete a la VM"
    gcloud compute scp $zipPath "${VM_NAME}:/tmp/xime-deploy.zip" `
        --zone=$ZONE --project=$PROJECT_ID --quiet
    if ($LASTEXITCODE -ne 0) { throw "gcloud scp fallo" }
    Write-OK "Paquete subido a /tmp/xime-deploy.zip"
} else {
    Write-Step "PASO 3-5/12  Build + upload omitidos (-SkipUpload)"
}

# ── PASO 6: Instalar dependencias ────────────────────────────
# Solo en -Target all — asume que -Target backend se usa en una VM ya
# provisionada (ver cabecera del script).
if ($Target -eq "all") {
Write-Step "PASO 6/12  Instalando dependencias en VM"

# Nota: @'...'@ es literal — bash usa sus propias variables $()
Invoke-RemoteBash -Label "install-deps" -Script @'
#!/bin/bash
set -euo pipefail

# Si ya esta todo instalado (deploys despues del primero), nos saltamos
# apt-get update y todas las instalaciones — es la unica parte de este paso
# que no tenia guard y corria siempre sin necesidad.
if command -v node &>/dev/null && command -v pnpm &>/dev/null \
    && command -v pm2 &>/dev/null && command -v psql &>/dev/null \
    && (command -v nginx &>/dev/null || [ -x /usr/sbin/nginx ]) \
    && command -v certbot &>/dev/null; then
    echo "--- Dependencias ya instaladas, omitiendo apt-get update ---"
    echo "Node: $(node --version)"
    echo "pnpm: $(pnpm --version)"
    echo "Postgres: $(psql --version)"
    echo "=== Dependencias OK (sin cambios) ==="
    exit 0
fi

echo "--- Actualizando sistema ---"
sudo apt-get update -qq

# Node.js 20 LTS
if ! command -v node &>/dev/null; then
    echo "--- Instalando Node.js 20 ---"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
    sudo apt-get install -y nodejs 2>/dev/null
fi
echo "Node: $(node --version)"

# pnpm
if ! command -v pnpm &>/dev/null; then
    echo "--- Instalando pnpm ---"
    sudo npm install -g pnpm@9 2>/dev/null
fi
echo "pnpm: $(pnpm --version)"

# PM2
if ! command -v pm2 &>/dev/null; then
    sudo npm install -g pm2 2>/dev/null
fi

# PostgreSQL
if ! command -v psql &>/dev/null; then
    echo "--- Instalando PostgreSQL ---"
    sudo apt-get install -y postgresql postgresql-contrib 2>/dev/null
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
fi
echo "Postgres: $(psql --version)"

# nginx
if ! command -v nginx &>/dev/null && [ ! -x /usr/sbin/nginx ]; then
    echo "--- Instalando nginx ---"
    sudo apt-get install -y nginx 2>/dev/null
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi
if command -v nginx &>/dev/null; then
    echo "nginx: $(nginx -v 2>&1)"
elif [ -x /usr/sbin/nginx ]; then
    echo "nginx: $(/usr/sbin/nginx -v 2>&1)"
else
    echo "nginx: not found"
fi

sudo apt-get install -y unzip curl git certbot python3-certbot-nginx 2>/dev/null

echo ""
echo "=== Dependencias OK ==="
'@

Write-OK "Dependencias instaladas (Node/pnpm/PM2/PostgreSQL/nginx)"

# ── PASO 6: Configurar PostgreSQL ────────────────────────────
Write-Step "PASO 7/12  Configurando PostgreSQL"

# Usamos placeholders __VAR__ que PowerShell reemplaza antes de subir
$s06 = (@'
#!/bin/bash
set -euo pipefail
DB_NAME="__DB_NAME__"
DB_USER="__DB_USER__"
DB_PASS="__DB_PASS__"

echo "--- Asegurando peer auth para postgres ---"
PG_HBA=$(sudo find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1)
if [ -n "$PG_HBA" ]; then
    echo "  pg_hba.conf: $PG_HBA"
    sudo sed -i -E 's/^(local[[:space:]]+all[[:space:]]+postgres[[:space:]]+)(md5|scram-sha-256|password)/\1peer/' "$PG_HBA"
    sudo systemctl reload postgresql
    sleep 1
    echo "  Peer auth OK"
fi

echo "--- Creando usuario y base de datos ---"

sudo -u postgres psql -v ON_ERROR_STOP=0 <<SQL
DO \$do\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER "${DB_USER}" WITH PASSWORD '${DB_PASS}';
    RAISE NOTICE 'Usuario creado';
  ELSE
    ALTER USER "${DB_USER}" WITH PASSWORD '${DB_PASS}';
    RAISE NOTICE 'Password actualizado';
  END IF;
END
\$do\$;

SELECT 'CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}"'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')
\gexec

GRANT ALL PRIVILEGES ON DATABASE "${DB_NAME}" TO "${DB_USER}";
SQL

echo "--- Verificando conexion ---"
PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" \
    -c "SELECT current_database(), now();"

echo "=== PostgreSQL OK ==="
'@) `
    -replace '__DB_NAME__', $DB_NAME `
    -replace '__DB_USER__', $DB_USER `
    -replace '__DB_PASS__', $DbPassword

Invoke-RemoteBash -Label "setup-db" -Script $s06
Write-OK "Base de datos '$DB_NAME' lista"
} else {
    Write-Step "PASO 6-7/12  Dependencias + PostgreSQL omitidos (-Target backend)"
}

# ── PASO 7: Extraer y configurar proyecto ────────────────────
Write-Step "PASO 8/12  Configurando proyecto en VM"

$s07 = (@'
#!/bin/bash
set -euo pipefail
APP_DIR="__APP_DIR__"
DB_NAME="__DB_NAME__"
DB_USER="__DB_USER__"
DB_PASS="__DB_PASS__"
APP_PORT="__APP_PORT__"
WEB_PORT="__WEB_PORT__"
SITE_HOST="__SITE_HOST__"
JWT_SECRET="__JWT_SECRET__"
SISPRO_SECRET="__SISPRO_SECRET__"
VM_IP="__VM_IP__"
EMAIL_PASS="__EMAIL_PASS__"
ADMIN_PW="__ADMIN_PW__"

echo "--- Extrayendo proyecto ---"
# Ya no se borra todo APP_DIR antes de extraer: un -Target backend no
# incluye medisxime-landing/dist en el ZIP (el frontend no se toco), y un
# rm -rf aca borraria el dist ya desplegado. unzip -o sobreescribe en el
# lugar lo que SI viene en el ZIP y deja el resto intacto -- el unico costo
# es que un archivo borrado del repo local no se borra solo en la VM hasta
# el proximo -Target all (o una limpieza manual), aceptable frente al riesgo
# de tumbar el frontend en un deploy de solo-backend.
sudo mkdir -p "${APP_DIR}"
sudo chown "$USER" "${APP_DIR}"
set +e
unzip -o /tmp/xime-deploy.zip -d "${APP_DIR}" > /dev/null
UNZIP_RC=$?
set -e
[ $UNZIP_RC -le 1 ] || { echo "ERROR: unzip fallo con codigo $UNZIP_RC"; exit $UNZIP_RC; }

echo "--- Corrigiendo permisos (unzip Windows puede crear dirs con permisos 0) ---"
sudo chown -R "$USER":"$USER" "${APP_DIR}"
sudo find "${APP_DIR}" -type d -exec chmod 755 {} +
sudo find "${APP_DIR}" -type f -exec chmod 644 {} +

echo "--- Creando .env de produccion ---"
cat > "${APP_DIR}/apps/backend/.env" <<ENVEOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
NODE_ENV=production
PORT=${APP_PORT}
JWT_SECRET=${JWT_SECRET}
SISPRO_SECRET=${SISPRO_SECRET}
CORS_ORIGIN=https://${SITE_HOST}
EMAIL_PASSWORD=${EMAIL_PASS}
EMAIL_USER=contacto@esmart-tek.com
EMAIL_SECURE=true
EMAIL_PORT=465
EMAIL_HOST=smtp.gmail.com
ADMINPW=${ADMIN_PW}
ENVEOF

echo "--- Instalando dependencias npm (solo backend, el frontend ya viene compilado) ---"
cd "${APP_DIR}"
# Limpiar cache de pnpm para evitar conflictos con módulos del ZIP
pnpm store prune 2>/dev/null || true
# El frontend se compila localmente antes de empaquetar (ver PASO 3) y su
# dist/ ya viaja listo en el ZIP — no hace falta instalar react/vite/
# tailwind/framer-motion/etc en la VM. Se filtra el install al backend y
# sus dependencias de workspace (@medisxime/shared-types), evitando bajar
# todo el arbol de dependencias del monorepo.
pnpm install --no-frozen-lockfile --filter "@medisxime/backend..." 2>&1

echo ""
echo "=== Proyecto configurado en ${APP_DIR} ==="
ls -la "${APP_DIR}"
'@) `
    -replace '__APP_DIR__',    $APP_DIR `
    -replace '__DB_NAME__',    $DB_NAME `
    -replace '__DB_USER__',    $DB_USER `
    -replace '__DB_PASS__',    $DbPassword `
    -replace '__APP_PORT__',   $APP_PORT `
    -replace '__WEB_PORT__',   $WEB_PORT `
    -replace '__SITE_HOST__',  $SITE_HOST `
    -replace '__JWT_SECRET__', $JwtSecret `
    -replace '__SISPRO_SECRET__', $SisproSecret `
    -replace '__EMAIL_PASS__', $EmailPassword `
    -replace '__ADMIN_PW__',   $AdminPassword `
    -replace '__VM_IP__',      $VM_IP

Invoke-RemoteBash -Label "setup-project" -Script $s07
Write-OK "Proyecto extraido + .env creado + npm install completado"

# El frontend ya viene compilado en el ZIP (PASO 3, build local) — el paso
# remoto "vite build" que antes iba aqui ya no hace falta.

# ── PASO 9: Migraciones SQL ───────────────────────────────────
Write-Step "PASO 9/12  Ejecutando migraciones de base de datos (13 archivos)"

$s09 = (@'
#!/bin/bash
set -euo pipefail
APP_DIR="__APP_DIR__"
DB_USER="__DB_USER__"
DB_PASS="__DB_PASS__"
DB_NAME="__DB_NAME__"

MIGRATIONS="${APP_DIR}/apps/backend/migrations"
echo "--- Aplicando migraciones ---"

for f in $(ls "${MIGRATIONS}"/*.sql | sort); do
    echo -n "  $(basename $f) ... "
    PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" \
        -f "${f}" 2>&1 | tail -3
    echo "  listo"
done

echo ""
echo "--- Creando/actualizando usuario admin ---"
ADMIN_PW="__ADMIN_PW__"
export ADMIN_PW
ADMIN_HASH=$(node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');const it=600000;const h=c.pbkdf2Sync(process.env.ADMIN_PW,s,it,32,'sha256').toString('hex');process.stdout.write('pbkdf2\$'+it+'\$'+s+'\$'+h)")

printf "INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified)\nVALUES ('admin@medisxime.com', '%s', 'medisXime', 'Admin', 'ADMIN', TRUE, TRUE)\nON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = TRUE, is_verified = TRUE;\n" "${ADMIN_HASH}" | \
  PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}"
echo "Admin listo: admin@medisxime.com / ${ADMIN_PW}"

echo ""
echo "=== Tablas en la base de datos ==="
PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" -c "\dt"
'@) `
    -replace '__APP_DIR__', $APP_DIR `
    -replace '__DB_USER__', $DB_USER `
    -replace '__DB_PASS__', $DbPassword `
    -replace '__DB_NAME__', $DB_NAME `
    -replace '__ADMIN_PW__', $AdminPassword

Invoke-RemoteBash -Label "migrations" -Script $s09
Write-OK "Migraciones aplicadas"

# ── PASO 10-11: nginx + Certbot ────────────────────────────────
# Solo en -Target all — la config de nginx y el certificado SSL no cambian
# entre deploys de codigo, solo cuando cambia la infraestructura.
if ($Target -eq "all") {

# ── PASO 10: Configurar nginx ─────────────────────────────────
Write-Step "PASO 10/12  Configurando nginx"

# El bloque nginx usa $uri, $http_upgrade etc. (variables nginx, no PS)
# Con @'...'@ estas se preservan literales; solo reemplazamos __PLACEHOLDERS__
$s10 = (@'
#!/bin/bash
set -euo pipefail

echo "--- Escribiendo config nginx ---"
sudo tee /etc/nginx/sites-available/medisXime > /dev/null <<'NGINX_CONF'
server {
    listen __WEB_PORT__;
    server_name __SITE_HOST__;
    server_tokens off;

    # Frontend React SPA
    root __APP_DIR__/medisxime-landing/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # Assets estaticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Backend API  (proxy interno)
    location /api/ {
        proxy_pass http://127.0.0.1:__APP_PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 10s;
    }

    location = /health {
        proxy_pass http://127.0.0.1:__APP_PORT__/health;
        access_log off;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX_CONF

sudo ln -sf /etc/nginx/sites-available/medisXime /etc/nginx/sites-enabled/medisXime
sudo rm -f /etc/nginx/sites-enabled/default

echo "--- Verificando config ---"
sudo nginx -t

echo "--- Recargando nginx ---"
sudo systemctl reload nginx

echo "=== nginx OK ==="
sudo systemctl status nginx --no-pager | head -5
'@) `
    -replace '__WEB_PORT__', $WEB_PORT `
    -replace '__SITE_HOST__', $SITE_HOST `
    -replace '__VM_IP__',   $VM_IP `
    -replace '__APP_DIR__', $APP_DIR `
    -replace '__APP_PORT__', $APP_PORT

Invoke-RemoteBash -Label "setup-nginx" -Script $s10
Write-OK "nginx configurado: SPA + proxy /api"

# ── PASO 11: Emitir certificado SSL ──────────────────────────
Write-Step "PASO 11/12  Solicitando certificado SSL con Certbot"

$s11Cert = (@'
#!/bin/bash
set -euo pipefail
SITE_HOST="__SITE_HOST__"
CERTBOT_EMAIL="__CERTBOT_EMAIL__"

# Si ya existe un certificado para el dominio, Certbot no hace falta en
# cada deploy — sudo certbot renew (via el timer systemd que el paquete ya
# instala) se encarga de renovarlo antes de que expire.
if sudo test -d "/etc/letsencrypt/live/${SITE_HOST}"; then
    echo "--- Certificado ya existe para ${SITE_HOST}, omitiendo Certbot ---"
    sudo certbot certificates 2>/dev/null | grep -A2 "${SITE_HOST}" || true
    exit 0
fi

echo "--- Solicitando certificado SSL ---"
if sudo certbot --nginx -d "${SITE_HOST}" --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect; then
    echo "=== Certbot OK ==="
    sudo nginx -t
    sudo systemctl reload nginx
else
    echo "[!] Certbot fallo. Verifica que el DNS apunte a la VM y que el puerto 80 sea accesible."
    exit 0
fi
'@) `
    -replace '__SITE_HOST__', $SITE_HOST `
    -replace '__CERTBOT_EMAIL__', $CertbotEmail

Invoke-RemoteBash -Label "certbot" -Script $s11Cert
Write-OK "Certificado SSL solicitado"

} else {
    Write-Step "PASO 10-11/12  nginx + Certbot omitidos (-Target backend)"
}

# ── PASO 12: Iniciar backend con PM2 + tsx ────────────────────
Write-Step "PASO 12/12  Iniciando backend con PM2"

# tsx resuelve los path-aliases TypeScript (@config/*, @utils/*, etc.)
# sin necesidad de compilar con tsc (evita problemas de aliases en node)
$s11 = (@'
#!/bin/bash
set -euo pipefail
APP_DIR="__APP_DIR__"

echo "--- Creando ecosystem.config.cjs ---"
cat > "${APP_DIR}/ecosystem.config.cjs" <<'PM2_CONF'
module.exports = {
  apps: [{
    name: 'medisXime-backend',
    script: 'node_modules/.bin/tsx',
    args: 'src/index.ts',
    cwd: '__APP_DIR__/apps/backend',
    interpreter: 'none',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production' },
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
PM2_CONF

echo "--- Reiniciando servicio ---"
pm2 stop medisXime-backend   2>/dev/null || true
pm2 delete medisXime-backend 2>/dev/null || true

cd "${APP_DIR}"
pm2 start ecosystem.config.cjs
pm2 save

echo "--- Configurando arranque automatico ---"
sudo env PATH=$PATH:/usr/bin $(which pm2) startup systemd -u $USER \
    --hp /home/$USER 2>/dev/null || true
pm2 save

echo ""
echo "=== Backend corriendo ==="
pm2 status
'@) `
    -replace '__APP_DIR__', $APP_DIR

# El cwd dentro del PM2_CONF heredoc tambien necesita el valor real
$s11 = $s11 -replace "'__APP_DIR__/apps/backend'", "'${APP_DIR}/apps/backend'"

Invoke-RemoteBash -Label "start-backend" -Script $s11
Write-OK "Backend iniciado con PM2 + tsx"

# ── VERIFICACION ──────────────────────────────────────────────
Write-Step "VERIFICACION FINAL"
Start-Sleep -Seconds 6

Invoke-RemoteBash -Label "verify" -Script (@'
#!/bin/bash
echo "=== Servicios ==="
echo -n "nginx:      "; sudo systemctl is-active nginx
echo -n "postgresql: "; sudo systemctl is-active postgresql
echo ""
echo "=== PM2 ==="
pm2 status
echo ""
echo "=== Test API health ==="
sleep 2
HTTP_API=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:__APP_PORT__/health 2>/dev/null || echo "000")
echo "Backend /health: HTTP $HTTP_API"
echo ""
echo "=== Test nginx ==="
HTTP_WEB=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:__WEB_PORT__ 2>/dev/null || echo "000")
echo "nginx  puerto __WEB_PORT__: HTTP $HTTP_WEB"
echo ""
echo "=== Ultimos logs backend ==="
pm2 logs medisXime-backend --lines 10 --nostream 2>/dev/null || true
'@ -replace '__APP_PORT__', $APP_PORT -replace '__WEB_PORT__', $WEB_PORT)

# ── RESUMEN ───────────────────────────────────────────────────
Write-Host ""
Write-Host ("=" * 62) -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host ("=" * 62) -ForegroundColor Green
Write-Host ""
Write-Host "  App:         https://$SITE_HOST" -ForegroundColor White
Write-Host "  API:         https://$SITE_HOST/api" -ForegroundColor White
Write-Host "  Health:      https://$SITE_HOST/health" -ForegroundColor White
Write-Host ""
Write-Host "  Base de datos" -ForegroundColor Yellow
Write-Host "    Nombre:    $DB_NAME" -ForegroundColor Gray
Write-Host "    Usuario:   $DB_USER" -ForegroundColor Gray
Write-Host "    Password:  $DbPassword" -ForegroundColor Gray
Write-Host ""
Write-Host "  Comandos utiles en la VM:" -ForegroundColor Yellow
Write-Host "    pm2 status" -ForegroundColor Gray
Write-Host "    pm2 logs medisXime-backend" -ForegroundColor Gray
Write-Host "    pm2 restart medisXime-backend" -ForegroundColor Gray
Write-Host "    sudo systemctl status nginx" -ForegroundColor Gray
Write-Host ("=" * 62) -ForegroundColor Green
