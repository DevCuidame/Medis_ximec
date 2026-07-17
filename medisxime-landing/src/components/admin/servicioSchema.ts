import { z } from 'zod';

export const categoriaEnum = z.enum([
  'Medicina Bioreguladora',
  'Exámenes Médico Ocupacionales',
  'Medicina Laboral',
  'Consultoría en SG-SST',
  'Salud en el Trabajo',
  'Otros'
]);

export const servicioSchema = z.object({
  locationId: z.string().min(1, 'Selecciona una sede'),
  roomId: z.string().optional(),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  categoria: categoriaEnum,                 // Categoría Principal (especialidad → specialty)
  professionalId: z.string().optional(),
  serviceGroup: z.string().min(1, 'Selecciona el grupo de servicio'),
  serviceSubgroup: z.string().optional(),
  serviceCategory: z.string().optional(),
  serviceSubcategory: z.string().optional(),
  cups: z.string().regex(/^[A-Za-z0-9]{6}$/, 'El CUPS debe tener 6 caracteres alfanuméricos'),
  modalities: z.array(z.string()).min(1, 'Selecciona al menos una modalidad'),
  isActive: z.boolean(),
  durationMinutes: z.string().refine(v => Number.isInteger(Number(v)) && Number(v) > 0, 'Duración en minutos, mayor a 0'),
  price: z.string().refine(v => v !== '' && Number(v) >= 0, 'Precio requerido (0 o más)'),
  imageUrl: z.string().optional(),
  instructions: z.string().optional(),
  restrictions: z.string().optional(),
  risks: z.string().optional(),
  contraindications: z.string().optional(),
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
