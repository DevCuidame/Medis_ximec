import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Box, Hash, Tag, FileText, UserCheck, Layers, ListTree,
  ClipboardList, ToggleLeft, ToggleRight, DollarSign, Clock, Image,
  ShieldAlert, AlertTriangle, CheckCircle, Stethoscope,
} from 'lucide-react';
import type { ServicioFormValues } from './servicioSchema';
import { servicioSchema, categoriaEnum } from './servicioSchema';
import { GRUPOS, MODALIDADES, CATALOGO } from '../../lib/serviciosCatalogo';

const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  bg: '#FFFBF5', bgPanel: '#F5EDE1', bgSecondary: '#F5EDE1',
  white: '#FFFFFF', text: '#3D2B1F', textBrown: '#7A6452',
  textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
  red: '#EF4444', redLight: '#FEE2E2', green: '#10B981',
};

const FONT_SERIF = '"Cormorant Garamond", Georgia, serif';
const FONT_SANS  = '"Inter", Inter, system-ui, sans-serif';

const InputField = ({ label, icon: Icon, error, required, children }: any) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 8 }}>
      <Icon size={14} color={C.gold} /> {label}{required && <span style={{ color: C.red }}>*</span>}
    </div>
    {children}
    {error && (
      <span style={{ color: C.red, fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
        <AlertTriangle size={12} /> {error.message}
      </span>
    )}
  </div>
);

interface Props {
  initialData?: Partial<ServicioFormValues> & { consecutive?: number };
  /** Conservado por compatibilidad con ServiciosDashboard (Task 3 lo migra). No se usa en este formulario. */
  editingOfferId?: string;
  onSuccess: (data: any) => void;
  onCancel: () => void;
}

export const FormularioServicio: React.FC<Props> = ({ initialData, onSuccess, onCancel }) => {
  const [sedes, setSedes] = useState<{ id: string; name: string }[]>([]);
  const [espacios, setEspacios] = useState<{ id: string; name: string; capacity: number; locationId: string }[]>([]);
  const [profesionales, setProfesionales] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: ServicioFormValues = {
    locationId: initialData?.locationId ?? '',
    roomId: initialData?.roomId ?? '',
    nombre: initialData?.nombre ?? '',
    descripcion: initialData?.descripcion ?? '',
    categoria: initialData?.categoria ?? 'Medicina Bioreguladora',
    professionalId: initialData?.professionalId ?? '',
    serviceGroup: initialData?.serviceGroup ?? '',
    serviceSubgroup: initialData?.serviceSubgroup ?? '',
    serviceCategory: initialData?.serviceCategory ?? '',
    serviceSubcategory: initialData?.serviceSubcategory ?? '',
    cups: initialData?.cups ?? '',
    modalities: initialData?.modalities ?? [],
    isActive: initialData?.isActive ?? true,
    durationMinutes: initialData?.durationMinutes ?? '',
    price: initialData?.price ?? '',
    imageUrl: initialData?.imageUrl ?? '',
    instructions: initialData?.instructions ?? '',
    restrictions: initialData?.restrictions ?? '',
    risks: initialData?.risks ?? '',
    contraindications: initialData?.contraindications ?? '',
  };

  const { register, handleSubmit, control, formState: { errors }, setValue } = useForm<ServicioFormValues>({
    resolver: zodResolver(servicioSchema) as any,
    defaultValues,
  });

  const locationId          = useWatch({ control, name: 'locationId' });
  const serviceGroup        = useWatch({ control, name: 'serviceGroup' });
  const serviceSubgroup     = useWatch({ control, name: 'serviceSubgroup' });
  const serviceCategory     = useWatch({ control, name: 'serviceCategory' });
  const modalities          = useWatch({ control, name: 'modalities' }) ?? [];
  const isActive            = useWatch({ control, name: 'isActive' });

  // ── Cargar sedes y profesionales ──────────────────────────────────────────
  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(j => {
      if (j.success) {
        setSedes(j.data.locations);
        if (initialData?.locationId) setValue('locationId', initialData.locationId);
      }
    }).catch(() => {});

    fetch('/api/professionals').then(r => r.json()).then(j => {
      if (j.success && j.data.professionals) {
        setProfesionales(j.data.professionals.map((p: any) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })));
        if (initialData?.professionalId) setValue('professionalId', initialData.professionalId);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cargar espacios cuando cambia la sede ────────────────────────────────
  useEffect(() => {
    if (!locationId) { setEspacios([]); return; }
    fetch(`/api/rooms?locationId=${locationId}`).then(r => r.json()).then(j => {
      if (j.success) {
        setEspacios(j.data.rooms);
        if (initialData?.roomId && j.data.rooms.some((r: any) => r.id === initialData.roomId)) {
          setValue('roomId', initialData.roomId);
        }
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // ── Selects encadenados: grupo → subgrupo → categoría → subcategoría ────
  const subgrupos = CATALOGO[serviceGroup] ?? [];
  const categorias = subgrupos.find(s => s.code === serviceSubgroup)?.children ?? [];
  const subcategorias = categorias.find(c => c.code === serviceCategory)?.children ?? [];

  const toggleModalidad = (code: string) => {
    const current = modalities as string[];
    const next = current.includes(code) ? current.filter(m => m !== code) : [...current, code];
    setValue('modalities', next, { shouldValidate: true });
  };

  const handleFormSubmit = async (data: ServicioFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        locationId: data.locationId,
        roomId: data.roomId || undefined,
        offerType: 'appointment' as const,
        title: data.nombre,
        description: data.descripcion || undefined,
        professionalId: data.professionalId || undefined,
        specialty: data.categoria,
        serviceGroup: data.serviceGroup || undefined,
        serviceSubgroup: data.serviceSubgroup || undefined,
        serviceCategory: data.serviceCategory || undefined,
        serviceSubcategory: data.serviceSubcategory || undefined,
        cups: data.cups ? data.cups.toUpperCase() : undefined,
        modalities: data.modalities,
        imageUrl: data.imageUrl || undefined,
        instructions: data.instructions || undefined,
        restrictions: data.restrictions || undefined,
        risks: data.risks || undefined,
        contraindications: data.contraindications || undefined,
        durationMinutes: Number(data.durationMinutes),
        price: Number(data.price),
        status: data.isActive ? 'published' : 'draft',
      };
      await onSuccess(payload);
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: C.white,
    border: `1.5px solid ${C.borderLight}`, borderRadius: 12,
    fontSize: 14, color: C.text, outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: FONT_SANS,
    transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(92,58,40,0.02)',
  };
  const activeInputStyle = (hasError: boolean) => ({
    ...inputStyle, borderColor: hasError ? C.red : C.border,
  });
  const readOnlyStyle = { ...inputStyle, background: C.bgSecondary, color: C.textMedium, cursor: 'not-allowed' };

  const consecutivoDisplay = initialData
    ? `SRV-${String(initialData.consecutive ?? 0).padStart(4, '0')}`
    : 'Se asigna al guardar';

  const registerCups = register('cups');

  return (
    <div style={{ fontFamily: FONT_SANS, padding: '40px 20px', background: C.bg }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: C.white, borderRadius: 24, boxShadow: '0 16px 48px rgba(92,58,40,0.06)', overflow: 'hidden', border: `1px solid ${C.borderLight}` }}>

        <div style={{ padding: '32px 40px', background: `linear-gradient(90deg, rgba(92,58,40,0.04), ${C.white})`, borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 700, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
            {initialData ? 'Editar Servicio' : 'Catálogo de Servicios'}
          </h2>
          <p style={{ color: C.textMedium, fontSize: 14, marginTop: 6 }}>Configura una nueva consulta médica, examen o servicio corporativo.</p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit as any)} style={{ padding: 40 }}>

          {/* VALIDATION BANNER */}
          <AnimatePresence>
            {Object.keys(errors).length > 0 && (
              <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                style={{ background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 16, padding: '16px 24px', marginBottom: 32, display: 'flex', gap: 12, alignItems: 'flex-start' }}
              >
                <AlertTriangle size={20} color={C.red} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.red }}>Faltan campos obligatorios o tienen errores</h4>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12, color: C.textBrown, lineHeight: '1.6' }}>
                    {Object.entries(errors).map(([key, err]: any) => <li key={key}>{err.message}</li>)}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── SECCIÓN 1: UBICACIÓN Y SALÓN ── */}
          <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: `1px dashed ${C.borderLight}` }}>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, color: C.gold, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: FONT_SANS }}>1</span>
              Ubicación y Salón
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <InputField label="Sede" icon={MapPin} error={errors.locationId} required>
                <select {...register('locationId', { onChange: () => setValue('roomId', '') })} style={activeInputStyle(!!errors.locationId)}>
                  <option value="">Selecciona una sede...</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </InputField>
              <InputField label="Espacio" icon={Box} error={errors.roomId}>
                <select {...register('roomId')} style={{ ...activeInputStyle(!!errors.roomId), background: !locationId ? C.bgSecondary : C.white }} disabled={!locationId}>
                  <option value="">{locationId ? 'Selecciona el espacio...' : 'Primero elige una sede'}</option>
                  {espacios.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </InputField>
            </div>
          </div>

          {/* ── SECCIÓN 2: IDENTIFICACIÓN DEL SERVICIO ── */}
          <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: `1px dashed ${C.borderLight}` }}>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, color: C.gold, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: FONT_SANS }}>2</span>
              Identificación del Servicio
            </h3>

            <InputField label="Consecutivo del servicio" icon={Hash}>
              <input type="text" value={consecutivoDisplay} readOnly style={readOnlyStyle} />
            </InputField>

            <InputField label="Nombre del servicio" icon={Tag} error={errors.nombre} required>
              <input type="text" {...register('nombre')} style={activeInputStyle(!!errors.nombre)} placeholder="Ej. Consulta de Medicina Bioreguladora" />
            </InputField>

            <InputField label="Descripción del servicio" icon={FileText} error={errors.descripcion}>
              <textarea {...register('descripcion')} rows={3} style={{ ...activeInputStyle(!!errors.descripcion), resize: 'vertical' as const }} placeholder="Describe brevemente en qué consiste el servicio..." />
            </InputField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <InputField label="Categoría principal" icon={Stethoscope} error={errors.categoria}>
                <select {...register('categoria')} style={activeInputStyle(!!errors.categoria)}>
                  {categoriaEnum.options.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </InputField>
              <InputField label="Profesional a cargo" icon={UserCheck} error={errors.professionalId}>
                <select {...register('professionalId')} style={activeInputStyle(!!errors.professionalId)}>
                  <option value="">Sin asignar</option>
                  {profesionales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </InputField>
            </div>
          </div>

          {/* ── SECCIÓN 3: CLASIFICACIÓN (HABILITACIÓN) ── */}
          <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: `1px dashed ${C.borderLight}` }}>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, color: C.gold, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: FONT_SANS }}>3</span>
              Clasificación (habilitación)
            </h3>

            <InputField label="Grupo de servicio" icon={Layers} error={errors.serviceGroup} required>
              <select
                {...register('serviceGroup', {
                  onChange: () => {
                    setValue('serviceSubgroup', '');
                    setValue('serviceCategory', '');
                    setValue('serviceSubcategory', '');
                  },
                })}
                style={activeInputStyle(!!errors.serviceGroup)}
              >
                <option value="">Selecciona el grupo...</option>
                {GRUPOS.map(g => <option key={g.code} value={g.code}>{g.code} — {g.name}</option>)}
              </select>
            </InputField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <InputField label="Subgrupo" icon={ListTree} error={errors.serviceSubgroup}>
                <select
                  {...register('serviceSubgroup', {
                    onChange: () => { setValue('serviceCategory', ''); setValue('serviceSubcategory', ''); },
                  })}
                  style={{ ...activeInputStyle(!!errors.serviceSubgroup), background: !serviceGroup ? C.bgSecondary : C.white }}
                  disabled={!serviceGroup}
                >
                  <option value="">{serviceGroup ? 'Selecciona...' : 'Elige un grupo'}</option>
                  {subgrupos.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                </select>
              </InputField>
              <InputField label="Categoría" icon={ListTree} error={errors.serviceCategory}>
                <select
                  {...register('serviceCategory', {
                    onChange: () => { setValue('serviceSubcategory', ''); },
                  })}
                  style={{ ...activeInputStyle(!!errors.serviceCategory), background: !serviceSubgroup ? C.bgSecondary : C.white }}
                  disabled={!serviceSubgroup}
                >
                  <option value="">{serviceSubgroup ? 'Selecciona...' : 'Elige un subgrupo'}</option>
                  {categorias.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </InputField>
              <InputField label="Subcategoría" icon={ListTree} error={errors.serviceSubcategory}>
                <select
                  {...register('serviceSubcategory')}
                  style={{ ...activeInputStyle(!!errors.serviceSubcategory), background: !serviceCategory ? C.bgSecondary : C.white }}
                  disabled={!serviceCategory}
                >
                  <option value="">{serviceCategory ? 'Selecciona...' : 'Elige una categoría'}</option>
                  {subcategorias.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                </select>
              </InputField>
            </div>

            <InputField label="Código CUPS" icon={ClipboardList} error={errors.cups} required>
              <input
                type="text"
                maxLength={6}
                {...registerCups}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  registerCups.onChange(e);
                }}
                style={{ ...activeInputStyle(!!errors.cups), maxWidth: 200, textTransform: 'uppercase' }}
                placeholder="Ej. 890201"
              />
            </InputField>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 10 }}>
                <ClipboardList size={14} color={C.gold} /> Modalidad de servicio<span style={{ color: C.red }}>*</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {MODALIDADES.map(m => {
                  const selected = (modalities as string[]).includes(m.code);
                  return (
                    <label key={m.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${selected ? C.gold : C.borderLight}`, background: selected ? 'rgba(92,58,40,0.06)' : C.white, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: selected ? C.gold : C.textBrown, transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleModalidad(m.code)} style={{ display: 'none' }} />
                      {m.name}
                    </label>
                  );
                })}
              </div>
              {errors.modalities && (
                <span style={{ color: C.red, fontSize: 11, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                  <AlertTriangle size={12} /> {errors.modalities.message as string}
                </span>
              )}
            </div>
          </div>

          {/* ── SECCIÓN 4: CONDICIONES ── */}
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, color: C.gold, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: FONT_SANS }}>4</span>
              Condiciones
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <InputField label="Duración del servicio (minutos)" icon={Clock} error={errors.durationMinutes} required>
                <input type="number" min={1} {...register('durationMinutes')} style={activeInputStyle(!!errors.durationMinutes)} placeholder="Ej. 30" />
              </InputField>
              <InputField label="Precio por sesión (COP)" icon={DollarSign} error={errors.price} required>
                <input type="number" min={0} {...register('price')} style={activeInputStyle(!!errors.price)} placeholder="0 para gratuito" />
              </InputField>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 10 }}>
                Estado del servicio
              </div>
              <button
                type="button"
                onClick={() => setValue('isActive', !isActive, { shouldValidate: true })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: `1.5px solid ${isActive ? C.gold : C.borderLight}`, background: isActive ? 'rgba(16,185,129,0.08)' : C.bgSecondary, cursor: 'pointer', fontWeight: 700, fontSize: 13, color: isActive ? '#065F46' : C.textMuted }}
              >
                {isActive ? <ToggleRight size={20} color="#10B981" /> : <ToggleLeft size={20} color={C.textMuted} />}
                {isActive ? 'Activo' : 'No activo'}
              </button>
            </div>

            <InputField label="Imagen del servicio (URL)" icon={Image} error={errors.imageUrl}>
              <input type="text" {...register('imageUrl')} style={activeInputStyle(!!errors.imageUrl)} placeholder="https://..." />
            </InputField>

            <InputField label="Instrucciones" icon={FileText} error={errors.instructions}>
              <textarea {...register('instructions')} rows={2} style={{ ...activeInputStyle(!!errors.instructions), resize: 'vertical' as const }} placeholder="Indicaciones previas para el paciente..." />
            </InputField>

            <InputField label="Restricciones" icon={ShieldAlert} error={errors.restrictions}>
              <textarea {...register('restrictions')} rows={2} style={{ ...activeInputStyle(!!errors.restrictions), resize: 'vertical' as const }} placeholder="Restricciones aplicables..." />
            </InputField>

            <InputField label="Riesgos" icon={AlertTriangle} error={errors.risks}>
              <textarea {...register('risks')} rows={2} style={{ ...activeInputStyle(!!errors.risks), resize: 'vertical' as const }} placeholder="Riesgos asociados al procedimiento..." />
            </InputField>

            <InputField label="Contraindicaciones" icon={ShieldAlert} error={errors.contraindications}>
              <textarea {...register('contraindications')} rows={2} style={{ ...activeInputStyle(!!errors.contraindications), resize: 'vertical' as const }} placeholder="Contraindicaciones del servicio..." />
            </InputField>
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
            <button type="button" onClick={onCancel} disabled={isSubmitting}
              style={{ flex: 1, padding: '14px 24px', background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, color: C.textMedium, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_SANS }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              style={{
                flex: 2, padding: '14px 24px',
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                color: C.white, border: 'none', borderRadius: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: `0 8px 24px rgba(92,58,40,0.15)`,
                fontFamily: FONT_SANS, opacity: isSubmitting ? 0.8 : 1,
                transition: 'all 0.2s',
              }}
            >
              {isSubmitting ? 'Guardando…' : <><CheckCircle size={18} /> Guardar Servicio</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
