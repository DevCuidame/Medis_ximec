// Listas de habilitación del catálogo de servicios.
// EDITABLE: la clínica puede ajustar códigos y nombres aquí sin tocar el resto del código.

export interface CatalogoNivel { code: string; name: string; children?: CatalogoNivel[] }

export const GRUPOS: { code: string; name: string }[] = [
  { code: '01', name: 'Consulta externa' },
  { code: '02', name: 'Apoyo diagnóstico y complementación terapéutica' },
  { code: '03', name: 'Internación' },
  { code: '04', name: 'Quirurjico' },
  { code: '05', name: 'Atención inmediata' },
  { code: '06', name: 'Otros servicios' },
];

// Grupos cuya Categoría/Subcategoría se cargan dinámicamente desde el backend
// (demasiadas opciones para vivir en CATALOGO, ej. Grupo 04 Quirúrgico tiene
// ~9.000 procedimientos). Ver apps/backend/src/scripts/generate-surgical-classification.ts.
export const GRUPOS_DINAMICOS = ['02', '03', '04', '05'];

export const MODALIDADES: { code: string; name: string }[] = [
  { code: '01', name: 'Intramural' },
  { code: '02', name: 'Extramural domiciliaria' },
  { code: '03', name: 'Extramural unidad móvil' },
  { code: '04', name: 'Telemedicina interactiva' },
  { code: '05', name: 'Telemedicina no interactiva' },
  { code: '06', name: 'Telesalud' },
  { code: '08', name: 'Extramural centro de encuentro' },
  { code: '09', name: 'Extramural otros' },
];

// Árbol: grupo → subgrupos → categorías → subcategorías
export const CATALOGO: Record<string, CatalogoNivel[]> = {
  '01': [
    { code: '0101', name: 'Medicina general', children: [
      { code: '010101', name: 'Consulta primera vez', children: [
        { code: '01010101', name: 'Presencial' }, { code: '01010199', name: 'Otras' } ] },
      { code: '010102', name: 'Consulta de control', children: [
        { code: '01010201', name: 'Presencial' }, { code: '01010299', name: 'Otras' } ] },
      { code: '010199', name: 'Otras', children: [ { code: '01019999', name: 'Otras' } ] },
    ]},
    { code: '0102', name: 'Medicina especializada', children: [
      { code: '010201', name: 'Medicina bioreguladora', children: [
        { code: '01020101', name: 'Primera vez' }, { code: '01020102', name: 'Control' }, { code: '01020199', name: 'Otras' } ] },
      { code: '010202', name: 'Medicina laboral', children: [
        { code: '01020201', name: 'Valoración médica' }, { code: '01020202', name: 'Certificación' }, { code: '01020299', name: 'Otras' } ] },
      { code: '010203', name: 'Ginecología', children: [
        { code: '01020301', name: 'Primera vez' }, { code: '01020302', name: 'Control' }, { code: '01020399', name: 'Otras' } ] },
      { code: '010204', name: 'Medicina familiar', children: [
        { code: '01020401', name: 'Primera vez' }, { code: '01020402', name: 'Control' }, { code: '01020499', name: 'Otras' } ] },
      { code: '010299', name: 'Otras especialidades', children: [ { code: '01029999', name: 'Otras' } ] },
    ]},
    { code: '0103', name: 'Salud ocupacional', children: [
      { code: '010301', name: 'Examen de ingreso', children: [ { code: '01030101', name: 'Con énfasis osteomuscular' }, { code: '01030199', name: 'Otros' } ] },
      { code: '010302', name: 'Examen periódico', children: [ { code: '01030299', name: 'Otros' } ] },
      { code: '010303', name: 'Examen de egreso', children: [ { code: '01030399', name: 'Otros' } ] },
      { code: '010399', name: 'Otros', children: [ { code: '01039999', name: 'Otros' } ] },
    ]},
    { code: '0104', name: 'Psicología y terapias', children: [
      { code: '010401', name: 'Psicología', children: [ { code: '01040199', name: 'Otras' } ] },
      { code: '010499', name: 'Otras terapias', children: [ { code: '01049999', name: 'Otras' } ] },
    ]},
    { code: '0105', name: 'Nutrición y dietética', children: [
      { code: '010501', name: 'Consulta de nutrición', children: [
        { code: '01050101', name: 'Primera vez' }, { code: '01050102', name: 'Control' }, { code: '01050199', name: 'Otras' } ] },
    ]},
    { code: '0199', name: 'Otros', children: [ { code: '019999', name: 'Otros', children: [ { code: '01999999', name: 'Otros' } ] } ] },
  ],
  // Subgrupos sin "children": su Categoría/Subcategoría se cargan dinámicamente
  // desde el backend (ver GRUPOS_DINAMICOS y apps/backend/src/scripts/generate-*-classification.ts).
  // "Otros"/"0x99" queda estático como bolsa residual — no se generó nada ahí.
  '02': [
    { code: '0201', name: 'Laboratorio clínico' },
    { code: '0202', name: 'Imágenes diagnósticas' },
    { code: '0203', name: 'Terapias de complementación' },
    { code: '0299', name: 'Otros apoyos' },
  ],
  '03': [ { code: '0301', name: 'Hospitalización general' }, { code: '0399', name: 'Otros', children: [ { code: '039999', name: 'Otros', children: [ { code: '03999999', name: 'Otros' } ] } ] } ],
  '04': [ { code: '0401', name: 'Cirugía ambulatoria' }, { code: '0499', name: 'Otros', children: [ { code: '049999', name: 'Otros', children: [ { code: '04999999', name: 'Otros' } ] } ] } ],
  '05': [ { code: '0501', name: 'Urgencias' }, { code: '0599', name: 'Otros', children: [ { code: '059999', name: 'Otros', children: [ { code: '05999999', name: 'Otros' } ] } ] } ],
};
