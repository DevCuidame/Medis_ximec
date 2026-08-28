import { z } from 'zod';

export const categoriaEnum = z.enum([
  'Medicina Bioreguladora',
  'Exámenes Médico Ocupacionales',
  'Medicina Laboral',
  'Consultoría en SG-SST',
  'Salud en el Trabajo',
  'Ginecología',
  'Medicina Familiar',
  'Psicología',
  'Nutrición',
  'Otros'
]);

// Opciones visibles en el select "Categoría principal" del Catálogo de Servicios
// (más una opción "Otra" para texto libre). No determina el Código CUPS: el CUPS
// se calcula solo con Grupo/Subgrupo/Categoría/Subcategoría.
export const CATEGORIAS_PRINCIPALES = [
  'Medicina Bioreguladora',
  'Exámenes Médico Ocupacionales',
  'Medicina Laboral',
  'Consultoría en SG-SST',
  'Salud en el Trabajo',
] as const;

// Grupo '06' — Otros servicios: no tiene subgrupo/categoría/subcategoría ni
// código CUPS asociado, por lo que esos campos no se exigen en ese caso.
export const GRUPO_OTROS_SERVICIOS = '06';

export const servicioSchema = z.object({
  locationId: z.string().min(1, 'Selecciona una sede'),
  roomId: z.string().optional(),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  categoria: z.string().min(1, 'Selecciona o escribe la categoría principal'), // Categoría Principal (especialidad → specialty); admite "Otra" en texto libre
  professionalId: z.string().optional(),
  serviceGroup: z.string().min(1, 'Selecciona el grupo de servicio'),
  serviceSubgroup: z.string().optional(),
  serviceCategory: z.string().optional(),
  serviceSubcategory: z.string().optional(),
  cups: z.string().optional(),
  repsServiceCode: z.string().optional(),
  modalities: z.array(z.string()).min(1, 'Selecciona al menos una modalidad'),
  isActive: z.boolean(),
  durationMinutes: z.string().refine(v => Number.isInteger(Number(v)) && Number(v) > 0, 'Duración en minutos, mayor a 0'),
  price: z.string().refine(v => v !== '' && Number(v) >= 0, 'Precio requerido (0 o más)'),
  controlPrice: z.string().optional(),
  imageUrl: z.string().optional(),
  instructions: z.string().optional(),
  restrictions: z.string().optional(),
  risks: z.string().optional(),
  contraindications: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.serviceGroup === GRUPO_OTROS_SERVICIOS) return;
  if (!/^[A-Za-z0-9]{6}$/.test(data.cups ?? '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cups'], message: 'El CUPS debe tener 6 caracteres alfanuméricos' });
  }
  if (!data.repsServiceCode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['repsServiceCode'], message: 'Selecciona el servicio habilitado (Tabla REPS)' });
  }
});

export type ServicioFormValues = z.infer<typeof servicioSchema>;

// ── Legado: usado por ServiciosDashboard.tsx (pendiente de migrar en otra tarea) ──
// JS getDay(): 0=dom, 1=lun, 2=mar, 3=mie, 4=jue, 5=vie, 6=sab
const DIA_JS_DAY: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6,
};
export const DIA_NOMBRES: Record<string, string> = {
  lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves',
  vie: 'Viernes', sab: 'Sábado', dom: 'Domingo',
};

/** Generate all dates (ISO strings) matching the selected days within the range */
export function generateOccurrences(
  diasSemana: string[],
  fechaDesde: string,
  fechaHasta: string,
  horaInicio: string,
): Date[] {
  const targetDays = new Set(diasSemana.map(d => DIA_JS_DAY[d]));
  const from = new Date(`${fechaDesde}T00:00:00`);
  const to   = new Date(`${fechaHasta}T23:59:59`);
  const [h, m] = horaInicio.split(':').map(Number);
  const results: Date[] = [];

  const cur = new Date(from);
  while (cur <= to && results.length < 365) {
    if (targetDays.has(cur.getDay())) {
      const occ = new Date(cur);
      occ.setHours(h, m, 0, 0);
      results.push(occ);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return results;
}
