// ============================================================
// apps/backend/src/scripts/generate-internacion-classification.ts
// Genera la clasificación Categoría/Subcategoría del Grupo 03
// (Internación) → Subgrupo 0301 (Hospitalización general), a partir
// de los códigos CUPS marcados "Quirúrgico = N" en el Excel de
// referencia, agrupados por capítulo (primeros 2 caracteres del
// código, alfanuméricos: 10, 11, 12, S1, S4).
//
// Uso:
//   pnpm --filter @medisxime/backend exec tsx src/scripts/generate-internacion-classification.ts "C:\ruta\al\archivo.xlsx"
//
// Los capítulos y sus nombres fueron decididos a mano (ver plan del
// agente orquestador) — el resto de capítulos con Quirúrgico=N
// (A1-A5, I1-I3, S0, S2, S3, S5, 82-90, etc.) son ruido para este
// grupo específico (salud pública, laboratorio/imágenes,
// urgencias/traslados, facturación, cirugía mal marcada, u otros
// grupos generados en paralelo) y quedan excluidos a propósito.
//
// No borra ni desactiva mapeos existentes; solo agrega los nuevos
// con ON CONFLICT DO NOTHING.
// ============================================================

import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { pool } from '@config/database.js';

dotenv.config();

const BATCH_SIZE = 500;
const SPECIALTY = 'Otros'; // procedimientos de internación no dependen de especialidad (ver CupsRepository.findByClassification)
const SERVICE_GROUP = '03';
const SERVICE_SUBGROUP = '0301';

// Nombre de cada capítulo de internación, decidido a mano por el agente orquestador.
const CHAPTER_NAMES: Record<string, string> = {
  '10': 'Internación (cuidado intermedio neonatal/pediátrico)',
  '11': 'Internación (cuidado intensivo adultos)',
  '12': 'Internación (cuidado básico neonatal y paciente crónico)',
  S1: 'Internación (habitación por complejidad)',
  S4: 'Servicios de apoyo en internación (nutrición y lactario)',
};

interface InternacionRow {
  cupsCode: string;
  chapter: string;
}

function readInternacionRows(filePath: string): InternacionRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find((name) => /^CUPS \d{4}$/i.test(name));
  if (!sheetName) {
    throw new Error(`No se encontró una hoja "CUPS <año>". Hojas: ${workbook.SheetNames.join(', ')}`);
  }
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const dataRows = rows.slice(1);

  const result: InternacionRow[] = [];
  for (const row of dataRows) {
    const code = String(row[1] ?? '').trim();
    const quirurgico = String(row[5] ?? '').trim().toUpperCase();
    if (!code || quirurgico !== 'N') continue;

    const chapter = code.slice(0, 2);
    if (!(chapter in CHAPTER_NAMES)) continue; // fuera del alcance del Grupo 03 (ver cabecera del archivo)

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

async function upsertMappings(rows: InternacionRow[]) {
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
    console.error('Uso: tsx src/scripts/generate-internacion-classification.ts <ruta-al-excel.xlsx>');
    process.exit(1);
  }

  console.log(`📖 Leyendo procedimientos de internación desde: ${filePath}`);
  const rows = readInternacionRows(filePath);
  console.log(`📋 ${rows.length} códigos de internación en ${Object.keys(CHAPTER_NAMES).length} capítulos.`);

  console.log('💾 Sincronizando nombres de categoría...');
  const categoriesCount = await upsertCategories();
  console.log(`✅ ${categoriesCount} categorías (capítulos) sincronizadas.`);

  console.log('💾 Sincronizando mapeos Categoría/Subcategoría → CUPS...');
  const inserted = await upsertMappings(rows);
  console.log(`\n✅ Listo. Mapeos nuevos insertados: ${inserted} (de ${rows.length} candidatos; el resto ya existía).`);

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Falló la generación de la clasificación de internación:', err);
  process.exit(1);
});
