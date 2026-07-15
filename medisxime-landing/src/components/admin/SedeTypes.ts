import type { SedeFormValues } from '../../lib/schemas/sedeSchema';

export type Sede = Omit<SedeFormValues, 'providerCode'> & { id: string; providerCode?: string | null };

export type ModalState = 
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; sede: Sede }
  | { type: 'view'; sede: Sede }
  | { type: 'delete'; sede: Sede };
