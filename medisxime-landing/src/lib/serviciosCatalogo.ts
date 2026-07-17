// Listas de habilitación del catálogo de servicios.
// EDITABLE: la clínica puede ajustar códigos y nombres aquí sin tocar el resto del código.

export interface CatalogoNivel { code: string; name: string; children?: CatalogoNivel[] }

export const GRUPOS: { code: string; name: string }[] = [
  { code: '01', name: 'Consulta externa' },
  { code: '02', name: 'Apoyo diagnóstico y complementación terapéutica' },
  { code: '03', name: 'Internación' },
  { code: '04', name: 'Quirurjico' },
  { code: '05', name: 'Atención inmediata' },
];

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
    { code: '0199', name: 'Otros', children: [ { code: '019999', name: 'Otros', children: [ { code: '01999999', name: 'Otros' } ] } ] },
  ],
  '02': [
    { code: '0201', name: 'Laboratorio clínico', children: [ { code: '020101', name: 'Toma de muestras', children: [ { code: '02010199', name: 'Otras' } ] }, { code: '020199', name: 'Otros', children: [ { code: '02019999', name: 'Otros' } ] } ] },
    { code: '0202', name: 'Imágenes diagnósticas', children: [ { code: '020299', name: 'Otras', children: [ { code: '02029999', name: 'Otras' } ] } ] },
    { code: '0203', name: 'Terapias de complementación', children: [ { code: '020399', name: 'Otras', children: [ { code: '02039999', name: 'Otras' } ] } ] },
    { code: '0299', name: 'Otros apoyos', children: [ { code: '029999', name: 'Otros', children: [ { code: '02999999', name: 'Otros' } ] } ] },
  ],
  '03': [ { code: '0301', name: 'Hospitalización general', children: [ { code: '030199', name: 'Otras', children: [ { code: '03019999', name: 'Otras' } ] } ] }, { code: '0399', name: 'Otros', children: [ { code: '039999', name: 'Otros', children: [ { code: '03999999', name: 'Otros' } ] } ] } ],
  '04': [ { code: '0401', name: 'Cirugía ambulatoria', children: [ { code: '040199', name: 'Otras', children: [ { code: '04019999', name: 'Otras' } ] } ] }, { code: '0499', name: 'Otros', children: [ { code: '049999', name: 'Otros', children: [ { code: '04999999', name: 'Otros' } ] } ] } ],
  '05': [ { code: '0501', name: 'Urgencias', children: [ { code: '050199', name: 'Otras', children: [ { code: '05019999', name: 'Otras' } ] } ] }, { code: '0599', name: 'Otros', children: [ { code: '059999', name: 'Otros', children: [ { code: '05999999', name: 'Otros' } ] } ] } ],
};
