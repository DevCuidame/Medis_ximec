import { z } from 'zod';

export const descuentoSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  kind: z.enum(['percentage', 'two_for_one']),
  value: z.string().optional(),
  code: z.string().optional(),
  specialty: z.string().optional(),   // '' = Todos los servicios
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  maxUsesTotal: z.string().optional(),
  maxUsesPerPatient: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.kind === 'percentage') {
    const v = Number(data.value);
    if (!data.value || !Number.isInteger(v) || v < 1 || v > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Porcentaje entre 1 y 100' });
    }
  }
  if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'La fecha fin debe ser posterior al inicio' });
  }
  for (const k of ['maxUsesTotal', 'maxUsesPerPatient'] as const) {
    if (data[k] && (!Number.isInteger(Number(data[k])) || Number(data[k]) < 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: 'Debe ser un entero mayor a 0' });
    }
  }
});

export type DescuentoFormValues = z.infer<typeof descuentoSchema>;
