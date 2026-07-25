// ============================================================
// apps/backend/src/scripts/generate-surgical-classification.ts
// Genera la clasificación Categoría/Subcategoría del Grupo 04
// (Quirúrgico) → Subgrupo 0401 (Cirugía ambulatoria), a partir de
// los códigos CUPS marcados "Quirúrgico = S" en el Excel de
// referencia, agrupados por capítulo (primeros 2 dígitos del
// código, 01-86 — rango quirúrgico clásico tipo CIE-9-MC).
//
// Uso:
//   pnpm --filter @medisxime/backend exec tsx src/scripts/generate-surgical-classification.ts "C:\ruta\al\archivo.xlsx"
//
// Los nombres de capítulo (01 Sistema nervioso central, 08 Párpado,
// 76 Huesos faciales, etc.) fueron verificados a mano contra
// muestras reales de cada capítulo — no son generados a ciegas.
//
// Se excluyen del rango: capítulo 89 (consultas, ya es Grupo 01) y
// cualquier prefijo no numérico o >86 (radiología, laboratorio,
// educación en salud, facturación de quirófanos, etc. quedaron
// marcados "Quirúrgico=S" por error de captura en la fuente — no
// son procedimientos quirúrgicos reales).
//
// No borra ni desactiva mapeos existentes; solo agrega los nuevos
// con ON CONFLICT DO NOTHING.
// ============================================================

import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { pool } from '@config/database.js';

dotenv.config();

const BATCH_SIZE = 500;
const SPECIALTY = 'Otros'; // procedimientos quirúrgicos no dependen de especialidad (ver CupsRepository.findByClassification)
const SERVICE_GROUP = '04';
const SERVICE_SUBGROUP = '0401';

// Nombre de cada capítulo quirúrgico (01-86), verificado contra muestras reales del catálogo.
const CHAPTER_NAMES: Record<string, string> = {
  '01': 'Sistema nervioso central (punciones y derivaciones)',
  '02': 'Cráneo y meninges',
  '03': 'Columna y canal raquídeo',
  '04': 'Nervios periféricos',
  '05': 'Sistema nervioso simpático',
  '06': 'Tiroides',
  '07': 'Suprarrenales e hipófisis',
  '08': 'Párpado',
  '09': 'Aparato lagrimal',
  '10': 'Conjuntiva',
  '11': 'Córnea',
  '12': 'Iris y cuerpo ciliar',
  '13': 'Cristalino',
  '14': 'Retina y vítreo',
  '15': 'Músculos extraoculares',
  '16': 'Órbita ocular',
  '17': 'Oído interno',
  '18': 'Pabellón auricular',
  '19': 'Oído medio (cadena osicular)',
  '20': 'Oído (mastoides y tímpano)',
  '21': 'Nariz',
  '22': 'Senos paranasales',
  '23': 'Dientes',
  '24': 'Encías y estructuras dentales',
  '25': 'Lengua',
  '26': 'Glándulas salivales',
  '27': 'Paladar y labio',
  '28': 'Amígdalas y adenoides',
  '29': 'Faringe',
  '30': 'Laringe',
  '31': 'Tráquea',
  '32': 'Pulmón y bronquios (resección)',
  '33': 'Pulmón (broncoscopia)',
  '34': 'Mediastino y pleura',
  '35': 'Válvulas del corazón',
  '36': 'Arterias coronarias',
  '37': 'Corazón',
  '38': 'Vasos sanguíneos (trombectomía)',
  '39': 'Vasos sanguíneos (angioplastia e injertos)',
  '40': 'Ganglios linfáticos',
  '41': 'Bazo y médula ósea',
  '42': 'Esófago',
  '43': 'Estómago (gastrectomía)',
  '44': 'Estómago (bypass y vagotomía)',
  '45': 'Intestino delgado',
  '46': 'Intestino (otros procedimientos)',
  '47': 'Apéndice',
  '48': 'Recto',
  '49': 'Ano y hemorroides',
  '50': 'Hígado',
  '51': 'Vías biliares',
  '52': 'Páncreas',
  '53': 'Hernias',
  '54': 'Pared y cavidad abdominal',
  '55': 'Riñón',
  '56': 'Uréter',
  '57': 'Vejiga',
  '58': 'Uretra',
  '59': 'Riñón y uréter (otros procedimientos)',
  '60': 'Próstata',
  '61': 'Escroto',
  '62': 'Testículo',
  '63': 'Cordón espermático y epidídimo',
  '64': 'Pene',
  '65': 'Ovario',
  '66': 'Trompas de Falopio',
  '67': 'Cuello uterino',
  '68': 'Útero (histerectomía)',
  '69': 'Útero (legrado y otros procedimientos)',
  '70': 'Vagina',
  '71': 'Vulva',
  '72': 'Parto instrumentado',
  '73': 'Parto',
  '74': 'Cesárea',
  '75': 'Procedimientos obstétricos fetales',
  '76': 'Huesos faciales',
  '77': 'Columna vertebral (vertebrectomía y osteotomía)',
  '78': 'Huesos (otros procedimientos)',
  '79': 'Fracturas',
  '80': 'Articulaciones',
  '81': 'Columna vertebral (artrodesis)',
  '82': 'Mano (tendones)',
  '83': 'Tendones, fascia y músculo',
  '84': 'Amputación de extremidades',
  '85': 'Mama',
  '86': 'Piel',
};

interface SurgicalRow {
  cupsCode: string;
  chapter: string;
}

function readSurgicalRows(filePath: string): SurgicalRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find((name) => /^CUPS \d{4}$/i.test(name));
  if (!sheetName) {
    throw new Error(`No se encontró una hoja "CUPS <año>". Hojas: ${workbook.SheetNames.join(', ')}`);
  }
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const dataRows = rows.slice(1);

  const result: SurgicalRow[] = [];
  for (const row of dataRows) {
    const code = String(row[1] ?? '').trim();
    const quirurgico = String(row[5] ?? '').trim().toUpperCase();
    if (!code || quirurgico !== 'S') continue;

    const chapter = code.slice(0, 2);
    if (!/^\d{2}$/.test(chapter)) continue; // descarta prefijos alfanuméricos (ruido, ver cabecera del archivo)
    if (!(chapter in CHAPTER_NAMES)) continue; // fuera de rango 01-86 (ruido: radiología/lab/consultas mal marcadas)

    result.push({ cupsCode: code, chapter });
  }
  return result;
}

async function upsertCategories() {
  let count = 0;
  for (const [chapter, name] of Object.entries(CHAPTER_NAMES)) {
    await pool.query(
      `INSERT INTO service_classification_categories (service_group, service_subgroup, service_category, category_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (service_group, service_subgroup, service_category)
         DO UPDATE SET category_name = EXCLUDED.category_name`,
      [SERVICE_GROUP, SERVICE_SUBGROUP, chapter, name]
    );
    count++;
  }
  return count;
}

async function upsertMappings(rows: SurgicalRow[]) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values: string[] = [];
    const params: string[] = [];

    batch.forEach((row, idx) => {
      const base = idx * 6;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
      params.push(SPECIALTY, SERVICE_GROUP, SERVICE_SUBGROUP, row.chapter, row.cupsCode, row.cupsCode);
    });

    const { rowCount } = await pool.query(
      `INSERT INTO service_classification_cups_map
         (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
       VALUES ${values.join(', ')}
       ON CONFLICT DO NOTHING`,
      params
    );
    inserted += rowCount ?? 0;
    console.log(`  … procesados ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  return inserted;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: tsx src/scripts/generate-surgical-classification.ts <ruta-al-excel.xlsx>');
    process.exit(1);
  }

  console.log(`📖 Leyendo procedimientos quirúrgicos desde: ${filePath}`);
  const rows = readSurgicalRows(filePath);
  console.log(`📋 ${rows.length} códigos quirúrgicos en ${Object.keys(CHAPTER_NAMES).length} capítulos.`);

  console.log('💾 Sincronizando nombres de categoría...');
  const categoriesCount = await upsertCategories();
  console.log(`✅ ${categoriesCount} categorías (capítulos) sincronizadas.`);

  console.log('💾 Sincronizando mapeos Categoría/Subcategoría → CUPS...');
  const inserted = await upsertMappings(rows);
  console.log(`\n✅ Listo. Mapeos nuevos insertados: ${inserted} (de ${rows.length} candidatos; el resto ya existía).`);

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Falló la generación de la clasificación quirúrgica:', err);
  process.exit(1);
});
