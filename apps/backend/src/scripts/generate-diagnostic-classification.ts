// ============================================================
// apps/backend/src/scripts/generate-diagnostic-classification.ts
// Genera la clasificación Categoría/Subcategoría del Grupo 02
// (Apoyo diagnóstico y complementación terapéutica), a partir de
// los códigos CUPS marcados "Quirúrgico = N" en el Excel de
// referencia, agrupados por capítulo (primeros 2 caracteres del
// código) y repartidos en 4 subgrupos según el capítulo:
//
//   0201 Laboratorio clínico              → capítulos 90, 91, 86
//   0202 Imágenes diagnósticas             → capítulos 87, 88, 92
//   0203 Terapias de complementación       → capítulos 93, 94, 95
//   0299 Otros apoyos                      → capítulo  99
//
// Uso:
//   pnpm --filter @medisxime/backend exec tsx src/scripts/generate-diagnostic-classification.ts "C:\ruta\al\archivo.xlsx"
//
// Los capítulos y su reparto en subgrupos fueron decididos a mano
// contra muestras reales del catálogo (ver spec de la tarea) — no
// son generados a ciegas. Cualquier otro capítulo con Quirúrgico=N
// que no esté en la lista anterior (salud pública, internación,
// facturación, cirugía mal marcada, u otros grupos generados por
// otros scripts) queda deliberadamente fuera de este Grupo 02.
//
// No borra ni desactiva mapeos existentes; solo agrega los nuevos
// con ON CONFLICT DO NOTHING.
// ============================================================

import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { pool } from '@config/database.js';

dotenv.config();

const BATCH_SIZE = 500;
const SPECIALTY = 'Otros'; // procedimientos de apoyo diagnóstico no dependen de especialidad (ver CupsRepository.findByClassification)
const SERVICE_GROUP = '02';

// Capítulo → { subgrupo, nombre de categoría }, verificado contra muestras reales del catálogo.
const CHAPTER_MAP: Record<string, { subgroup: string; name: string }> = {
  '90': { subgroup: '0201', name: 'Laboratorio clínico (microbiología)' },
  '91': { subgroup: '0201', name: 'Laboratorio clínico (inmunohematología)' },
  '86': { subgroup: '0201', name: 'Laboratorio clínico (pruebas cutáneas)' },
  '87': { subgroup: '0202', name: 'Radiología' },
  '88': { subgroup: '0202', name: 'Ecografía y ultrasonografía' },
  '92': { subgroup: '0202', name: 'Medicina nuclear (gamagrafía)' },
  '93': { subgroup: '0203', name: 'Evaluación neuropsicológica y sensorial' },
  '94': { subgroup: '0203', name: 'Pruebas psicológicas' },
  '95': { subgroup: '0203', name: 'Evaluación de visión (ortóptica)' },
  '99': { subgroup: '0299', name: 'Educación grupal en salud' },
};

interface DiagnosticRow {
  cupsCode: string;
  chapter: string;
  subgroup: string;
}

function readDiagnosticRows(filePath: string): DiagnosticRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find((name) => /^CUPS \d{4}$/i.test(name));
  if (!sheetName) {
    throw new Error(`No se encontró una hoja "CUPS <año>". Hojas: ${workbook.SheetNames.join(', ')}`);
  }
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const dataRows = rows.slice(1);

  const result: DiagnosticRow[] = [];
  for (const row of dataRows) {
    const code = String(row[1] ?? '').trim();
    const quirurgico = String(row[5] ?? '').trim().toUpperCase();
    if (!code || quirurgico !== 'N') continue;

    const chapter = code.slice(0, 2);
    const chapterInfo = CHAPTER_MAP[chapter];
    if (!chapterInfo) continue; // fuera de la lista de capítulos del Grupo 02 (ruido, ver cabecera del archivo)

    result.push({ cupsCode: code, chapter, subgroup: chapterInfo.subgroup });
  }
  return result;
}

async function upsertCategories() {
  let count = 0;
  for (const [chapter, { subgroup, name }] of Object.entries(CHAPTER_MAP)) {
    await pool.query(
      `INSERT INTO service_classification_categories (service_group, service_subgroup, service_category, category_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (service_group, service_subgroup, service_category)
         DO UPDATE SET category_name = EXCLUDED.category_name`,
      [SERVICE_GROUP, subgroup, chapter, name]
    );
    count++;
  }
  return count;
}

async function upsertMappings(rows: DiagnosticRow[]) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values: string[] = [];
    const params: string[] = [];

    batch.forEach((row, idx) => {
      const base = idx * 6;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
      params.push(SPECIALTY, SERVICE_GROUP, row.subgroup, row.chapter, row.cupsCode, row.cupsCode);
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
    console.error('Uso: tsx src/scripts/generate-diagnostic-classification.ts <ruta-al-excel.xlsx>');
    process.exit(1);
  }

  console.log(`📖 Leyendo procedimientos de apoyo diagnóstico desde: ${filePath}`);
  const rows = readDiagnosticRows(filePath);
  console.log(`📋 ${rows.length} códigos de apoyo diagnóstico en ${Object.keys(CHAPTER_MAP).length} capítulos.`);

  console.log('💾 Sincronizando nombres de categoría...');
  const categoriesCount = await upsertCategories();
  console.log(`✅ ${categoriesCount} categorías (capítulos) sincronizadas.`);

  console.log('💾 Sincronizando mapeos Categoría/Subcategoría → CUPS...');
  const inserted = await upsertMappings(rows);
  console.log(`\n✅ Listo. Mapeos nuevos insertados: ${inserted} (de ${rows.length} candidatos; el resto ya existía).`);

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Falló la generación de la clasificación de apoyo diagnóstico:', err);
  process.exit(1);
});
