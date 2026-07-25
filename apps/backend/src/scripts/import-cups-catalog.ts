// ============================================================
// apps/backend/src/scripts/import-cups-catalog.ts
// Importa/actualiza el catálogo oficial de códigos CUPS en la
// tabla `cups_catalog` a partir de un Excel de referencia (hoja
// "CUPS <año>" con columnas: Código, Nombre del procedimiento, ...).
//
// Uso:
//   pnpm --filter @medisxime/backend import:cups "C:\ruta\al\archivo.xlsx"
//
// No borra ni desactiva códigos ausentes del archivo: solo inserta
// códigos nuevos y actualiza el nombre de los existentes. Un código
// que un administrador ya desactivó (`is_active = false`) permanece
// desactivado; este script no toca esa columna.
// ============================================================

import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { pool } from '@config/database.js';

dotenv.config();

const BATCH_SIZE = 500;

function toSentenceCase(raw: string): string {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function readCatalogRows(filePath: string): Array<{ cupsCode: string; procedureName: string }> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find((name) => /^CUPS \d{4}$/i.test(name));
  if (!sheetName) {
    throw new Error(
      `No se encontró una hoja "CUPS <año>" en el archivo. Hojas disponibles: ${workbook.SheetNames.join(', ')}`
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // La primera columna de datos es una etiqueta técnica constante
  // ("CUPSRips") sin encabezado propio; el código real cae en la
  // columna 1 y el nombre en la columna 2.
  const dataRows = rows.slice(1);
  const seen = new Map<string, string>();

  for (const row of dataRows) {
    const code = String(row[1] ?? '').trim();
    const name = String(row[2] ?? '').trim();
    if (!code || !name) continue;
    seen.set(code, toSentenceCase(name));
  }

  return Array.from(seen, ([cupsCode, procedureName]) => ({ cupsCode, procedureName }));
}

async function upsertCatalog(entries: Array<{ cupsCode: string; procedureName: string }>) {
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const values: string[] = [];
    const params: string[] = [];

    batch.forEach((entry, idx) => {
      const p1 = idx * 2 + 1;
      const p2 = idx * 2 + 2;
      values.push(`($${p1}, $${p2})`);
      params.push(entry.cupsCode, entry.procedureName);
    });

    const { rows } = await pool.query(
      `INSERT INTO cups_catalog (cups_code, procedure_name)
       VALUES ${values.join(', ')}
       ON CONFLICT (cups_code) DO UPDATE
         SET procedure_name = EXCLUDED.procedure_name
         WHERE cups_catalog.procedure_name IS DISTINCT FROM EXCLUDED.procedure_name
       RETURNING (xmax = 0) AS is_insert`,
      params
    );

    for (const row of rows) {
      if (row.is_insert) inserted += 1;
      else updated += 1;
    }

    console.log(`  … procesados ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`);
  }

  return { inserted, updated };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: tsx src/scripts/import-cups-catalog.ts <ruta-al-excel.xlsx>');
    process.exit(1);
  }

  console.log(`📖 Leyendo catálogo CUPS desde: ${filePath}`);
  const entries = readCatalogRows(filePath);
  console.log(`📋 ${entries.length} códigos únicos encontrados en el archivo.`);

  console.log('💾 Sincronizando con cups_catalog...');
  const { inserted, updated } = await upsertCatalog(entries);

  console.log(`\n✅ Listo. Insertados: ${inserted} | Actualizados: ${updated} | Sin cambios: ${entries.length - inserted - updated}`);
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Falló la importación del catálogo CUPS:', err);
  process.exit(1);
});
