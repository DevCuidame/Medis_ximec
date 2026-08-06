import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Box, Hash, Tag, FileText, UserCheck, Layers, ListTree,
  ClipboardList, ToggleLeft, ToggleRight, DollarSign, Clock, Image,
  ShieldAlert, AlertTriangle, CheckCircle, Stethoscope, Plus,
} from 'lucide-react';
import type { ServicioFormValues } from './servicioSchema';
import { servicioSchema, CATEGORIAS_PRINCIPALES, GRUPO_OTROS_SERVICIOS } from './servicioSchema';
import { GRUPOS, MODALIDADES, CATALOGO, GRUPOS_DINAMICOS } from '../../lib/serviciosCatalogo';
import { CupsMappingModal } from './CupsMappingModal';

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
  const [cupsMessage, setCupsMessage] = useState<string | null>(null);
  const [cupsCandidates, setCupsCandidates] = useState<{ cupsCode: string; procedureName: string }[]>([]);
  const [cupsNotFound, setCupsNotFound] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  // "Otra" en Categoría principal: activo cuando el valor guardado/escrito no
  // está en la lista curada (p. ej. datos antiguos con otra especialidad).
  const [otraCategoria, setOtraCategoria] = useState(() => {
    const v = initialData?.categoria;
    return !!v && !(CATEGORIAS_PRINCIPALES as readonly string[]).includes(v);
  });
  // Categoría/Subcategoría de grupos dinámicos (ver GRUPOS_DINAMICOS): se
  // cargan desde el backend en vez de CATALOGO.
  const [dynCategories, setDynCategories] = useState<{ code: string; name: string }[]>([]);
  const [dynSubcategories, setDynSubcategories] = useState<{ code: string; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const lastAutoNombre = useRef('');
  const cupsLookupSeq = useRef(0);
  // En edición hay que saltar 2 renders: el mount y el que se dispara cuando
  // react-hook-form hidrata los valores de initialData (categoria, serviceGroup, etc.).
  const skipCupsLookup = useRef(initialData ? 2 : 1);

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
    controlPrice: initialData?.controlPrice ?? '',
    imageUrl: initialData?.imageUrl ?? '',
    instructions: initialData?.instructions ?? '',
    restrictions: initialData?.restrictions ?? '',
    risks: initialData?.risks ?? '',
    contraindications: initialData?.contraindications ?? '',
  };

  const { register, handleSubmit, control, formState: { errors }, setValue, getValues } = useForm<ServicioFormValues>({
    resolver: zodResolver(servicioSchema) as any,
    defaultValues,
  });

  const locationId          = useWatch({ control, name: 'locationId' });
  const roomId              = useWatch({ control, name: 'roomId' });
  const categoria           = useWatch({ control, name: 'categoria' });
  const serviceGroup        = useWatch({ control, name: 'serviceGroup' });
  const serviceSubgroup     = useWatch({ control, name: 'serviceSubgroup' });
  const serviceCategory     = useWatch({ control, name: 'serviceCategory' });
  const serviceSubcategory  = useWatch({ control, name: 'serviceSubcategory' });
  const cups                = useWatch({ control, name: 'cups' });
  const modalities          = useWatch({ control, name: 'modalities' }) ?? [];
  const isActive            = useWatch({ control, name: 'isActive' });

  // ── Cargar sedes y profesionales ──────────────────────────────────────────
  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(j => {
      if (j.success) setSedes(j.data.locations);
    }).catch(() => {});

    fetch('/api/professionals').then(r => r.json()).then(j => {
      if (j.success && j.data.professionals) {
        setProfesionales(j.data.professionals.map((p: any) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cargar espacios cuando cambia la sede ────────────────────────────────
  // Los selects son controlados (value explícito), así que no hace falta
  // llamar setValue aquí: el valor ya está en el form desde defaultValues.
  useEffect(() => {
    if (!locationId) { setEspacios([]); return; }
    fetch(`/api/rooms?locationId=${locationId}`).then(r => r.json()).then(j => {
      if (j.success) setEspacios(j.data.rooms);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // ── Código CUPS: se deriva de la especialidad + clasificación, no se digita ──
  // Extraído como función reutilizable para poder re-ejecutar la consulta
  // después de crear un mapeo desde el modal, sin duplicar la lógica.
  // `cupsLookupSeq` descarta respuestas obsoletas si la clasificación cambia
  // (o se relanza la consulta) antes de que la anterior responda.
  // El CUPS se calcula únicamente con Grupo/Subgrupo/Categoría/Subcategoría;
  // "Categoría principal" (especialidad) no participa en el cálculo.
  const runCupsLookup = useCallback(() => {
    const seq = ++cupsLookupSeq.current;
    setValue('cups', '', { shouldValidate: true });
    setCupsCandidates([]);
    setCupsMessage(null);
    setCupsNotFound(false);

    if (!serviceGroup || !serviceSubgroup || !serviceCategory || !serviceSubcategory) return;

    const params = new URLSearchParams({ serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory });
    const token = localStorage.getItem('accessToken');

    fetch(`/api/services/cups-lookup?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => ({ status: r.status, body: await r.json() }))
      .then(({ status, body }) => {
        if (cupsLookupSeq.current !== seq) return;
        if (!body.success) {
          if (status === 404) setCupsNotFound(true);
          setCupsMessage(body.error || 'No se registra código CUPS para esta combinación. Revisa las opciones seleccionadas.');
          return;
        }
        if (body.data.match === 'unique') {
          setValue('cups', body.data.cupsCode, { shouldValidate: true });
          const currentNombre = getValues('nombre');
          if (!currentNombre || currentNombre === lastAutoNombre.current) {
            lastAutoNombre.current = body.data.procedureName;
            setValue('nombre', body.data.procedureName, { shouldValidate: true });
          }
        } else {
          setCupsCandidates(body.data.candidates);
          setCupsMessage('Esta clasificación corresponde a varios procedimientos CUPS. Selecciona el procedimiento específico.');
        }
      })
      .catch(() => { if (cupsLookupSeq.current === seq) setCupsMessage('No se pudo consultar el catálogo CUPS.'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory]);

  // En creación salta 1 render (mount). En edición salta 2: el mount y el que
  // react-hook-form dispara al hidratar los valores de initialData. Esto evita
  // borrar el CUPS guardado cuando se abre el formulario de edición.
  useEffect(() => {
    if (skipCupsLookup.current > 0) { skipCupsLookup.current -= 1; return; }
    runCupsLookup();
  }, [runCupsLookup]);

  const handleMappingCreated = () => {
    setShowMappingModal(false);
    runCupsLookup();
  };

  // ── Categoría/Subcategoría de grupos dinámicos (ver GRUPOS_DINAMICOS) ────
  useEffect(() => {
    if (!GRUPOS_DINAMICOS.includes(serviceGroup) || !serviceGroup || !serviceSubgroup) {
      setDynCategories([]);
      return;
    }
    setLoadingCategories(true);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams({ serviceGroup, serviceSubgroup });
    fetch(`/api/services/classification-categories?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((j) => { if (j.success) setDynCategories(j.data.categories); })
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, [serviceGroup, serviceSubgroup]);

  useEffect(() => {
    if (!GRUPOS_DINAMICOS.includes(serviceGroup) || !serviceGroup || !serviceSubgroup || !serviceCategory) {
      setDynSubcategories([]);
      return;
    }
    setLoadingSubcategories(true);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams({ serviceGroup, serviceSubgroup, serviceCategory });
    fetch(`/api/services/classification-subcategories?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((j) => { if (j.success) setDynSubcategories(j.data.subcategories); })
      .catch(() => {})
      .finally(() => setLoadingSubcategories(false));
  }, [serviceGroup, serviceSubgroup, serviceCategory]);

  const handleSelectCupsCandidate = (cupsCode: string) => {
    setValue('cups', cupsCode, { shouldValidate: true });
    const candidate = cupsCandidates.find(c => c.cupsCode === cupsCode);
    if (candidate) {
      const currentNombre = getValues('nombre');
      if (!currentNombre || currentNombre === lastAutoNombre.current) {
        lastAutoNombre.current = candidate.procedureName;
        setValue('nombre', candidate.procedureName, { shouldValidate: true });
      }
    }
  };

  // ── Selects encadenados: grupo → subgrupo → categoría → subcategoría ────
  // Grupos con demasiadas opciones para vivir en CATALOGO (ver serviciosCatalogo.ts)
  // cargan Categoría/Subcategoría bajo demanda desde el backend en su lugar.
  const isDynamicGroup = GRUPOS_DINAMICOS.includes(serviceGroup);
  const subgrupos = CATALOGO[serviceGroup] ?? [];
  const categorias = isDynamicGroup ? dynCategories : (subgrupos.find(s => s.code === serviceSubgroup)?.children ?? []);
  const subcategorias = isDynamicGroup ? dynSubcategories : (categorias.find(c => c.code === serviceCategory)?.children ?? []);
  // "Otros servicios" no tiene subgrupo/categoría/subcategoría ni CUPS: esos campos se ocultan.
  const isOtrosServicios = serviceGroup === GRUPO_OTROS_SERVICIOS;
  // Los 4 campos que conforman el cálculo del CUPS (no incluye Categoría principal).
  const classificationComplete = !!serviceGroup && !!serviceSubgroup && !!serviceCategory && !!serviceSubcategory;

  const toggleModalidad = (code: string) => {
    const current = modalities as string[];
    const next = current.includes(code) ? current.filter(m => m !== code) : [...current, code];
    setValue('modalities', next, { shouldValidate: true });
  };

  // En edición, un campo opcional vaciado por el usuario debe enviarse como `null` explícito
  // para que el PATCH lo limpie en el backend; `undefined` se omite del payload y el valor
  // viejo persiste (grave en textos clínicos como instrucciones/riesgos/contraindicaciones).
  // En creación, en cambio, no hay valor previo que limpiar: se omite con `undefined`.
  const isEditing = !!initialData;
  const optionalOrNull = (v: string): string | null | undefined => v ? v : (isEditing ? null : undefined);

  const handleFormSubmit = async (data: ServicioFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        locationId: data.locationId,
        roomId: optionalOrNull(data.roomId),
        offerType: 'appointment' as const,
        title: data.nombre,
        description: optionalOrNull(data.descripcion),
        professionalId: optionalOrNull(data.professionalId),
        specialty: data.categoria,
        serviceGroup: data.serviceGroup || undefined,
        serviceSubgroup: optionalOrNull(data.serviceSubgroup),
        serviceCategory: optionalOrNull(data.serviceCategory),
        serviceSubcategory: optionalOrNull(data.serviceSubcategory),
        cups: data.cups ? data.cups.toUpperCase() : undefined,
        modalities: data.modalities,
        imageUrl: optionalOrNull(data.imageUrl),
        instructions: optionalOrNull(data.instructions),
        restrictions: optionalOrNull(data.restrictions),
        risks: optionalOrNull(data.risks),
        contraindications: optionalOrNull(data.contraindications),
        durationMinutes: Number(data.durationMinutes),
        price: Number(data.price),
        controlPrice: data.controlPrice ? Number(data.controlPrice) : undefined,
        // `status` (estado local de agenda de la oferta) e `isActive` (visibilidad del
        // catálogo en CuidameDoc) son conceptos distintos y ambos deben enviarse: sin
        // `isActive`, service_catalog.is_active nunca sale de su DEFAULT TRUE y
        // desactivar un servicio no lo despublica de CuidameDoc (ver hallazgo I1).
        status: data.isActive ? 'published' : 'draft',
        isActive: data.isActive,
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
                {/* Select controlado: value explícito para que refleje el form
                    incluso cuando las opciones llegan de forma asíncrona */}
                <Controller
                  name="locationId"
                  control={control}
                  render={({ field }) => (
                    <select
                      value={field.value || ''}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={(e) => {
                        setValue('roomId', '');
                        field.onChange(e.target.value);
                      }}
                      style={activeInputStyle(!!errors.locationId)}
                    >
                      <option value="">Selecciona una sede...</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                />
              </InputField>
              <InputField label="Espacio" icon={Box} error={errors.roomId}>
                {/* Select controlado: muestra el espacio guardado en cuanto
                    llegan las opciones del servidor */}
                <Controller
                  name="roomId"
                  control={control}
                  render={({ field }) => (
                    <select
                      value={field.value || ''}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={(e) => field.onChange(e.target.value)}
                      style={{ ...activeInputStyle(!!errors.roomId), background: !locationId ? C.bgSecondary : C.white }}
                      disabled={!locationId}
                    >
                      <option value="">{locationId ? 'Selecciona el espacio...' : 'Primero elige una sede'}</option>
                      {espacios.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  )}
                />
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
                <select
                  value={otraCategoria ? '__otra__' : (categoria || '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '__otra__') {
                      setOtraCategoria(true);
                      setValue('categoria', '', { shouldValidate: true });
                    } else {
                      setOtraCategoria(false);
                      setValue('categoria', v, { shouldValidate: true });
                    }
                  }}
                  style={activeInputStyle(!!errors.categoria)}
                >
                  <option value="">Selecciona...</option>
                  {CATEGORIAS_PRINCIPALES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__otra__">Otra (especificar)...</option>
                </select>
                {otraCategoria && (
                  <input
                    type="text"
                    {...register('categoria')}
                    placeholder="Escribe la categoría..."
                    style={{ ...activeInputStyle(!!errors.categoria), marginTop: 10 }}
                  />
                )}
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

            {!isOtrosServicios && (
              <>
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
                      disabled={!serviceSubgroup || (isDynamicGroup && loadingCategories)}
                    >
                      <option value="">
                        {isDynamicGroup && loadingCategories ? 'Cargando…' : serviceSubgroup ? 'Selecciona...' : 'Elige un subgrupo'}
                      </option>
                      {categorias.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                    </select>
                  </InputField>
                  <InputField label="Subcategoría" icon={ListTree} error={errors.serviceSubcategory}>
                    <select
                      {...register('serviceSubcategory')}
                      style={{ ...activeInputStyle(!!errors.serviceSubcategory), background: !serviceCategory ? C.bgSecondary : C.white }}
                      disabled={!serviceCategory || (isDynamicGroup && loadingSubcategories)}
                    >
                      <option value="">
                        {isDynamicGroup && loadingSubcategories ? 'Cargando…' : serviceCategory ? 'Selecciona...' : 'Elige una categoría'}
                      </option>
                      {subcategorias.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                    </select>
                  </InputField>
                </div>

                <InputField
                  label="Código CUPS"
                  icon={ClipboardList}
                  required
                  error={!classificationComplete ? undefined : (cupsMessage ? { message: cupsMessage } : errors.cups)}
                >
                  {cupsCandidates.length > 1 ? (
                    <select
                      value={cups || ''}
                      onChange={(e) => handleSelectCupsCandidate(e.target.value)}
                      style={{ ...activeInputStyle(!!cupsMessage && !cups), maxWidth: 420 }}
                    >
                      <option value="">Selecciona el procedimiento...</option>
                      {cupsCandidates.map(c => <option key={c.cupsCode} value={c.cupsCode}>{c.cupsCode} — {c.procedureName}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      {...registerCups}
                      readOnly
                      style={{ ...readOnlyStyle, maxWidth: 200 }}
                      placeholder={classificationComplete ? 'Se calcula al elegir la clasificación' : 'Se calculará al completar la clasificación'}
                    />
                  )}
                  {!classificationComplete && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: C.textMuted }}>
                      El Código CUPS se calculará automáticamente al completar la clasificación.
                    </p>
                  )}
                  {cupsNotFound && classificationComplete && (
                    <button
                      type="button"
                      onClick={() => setShowMappingModal(true)}
                      style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${C.gold}`, background: 'rgba(92,58,40,0.06)', color: C.gold, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: FONT_SANS }}
                    >
                      <Plus size={14} /> Crear mapeo
                    </button>
                  )}
                </InputField>

                {showMappingModal && (
                  <CupsMappingModal
                    specialty={categoria}
                    serviceGroup={serviceGroup}
                    serviceSubgroup={serviceSubgroup}
                    serviceCategory={serviceCategory}
                    serviceSubcategory={serviceSubcategory}
                    onClose={() => setShowMappingModal(false)}
                    onCreated={handleMappingCreated}
                  />
                )}
              </>
            )}

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
              <InputField label="Precio de control (2do en adelante)" icon={DollarSign} error={errors.controlPrice}>
                <input type="number" min={0} {...register('controlPrice')} style={activeInputStyle(!!errors.controlPrice)} placeholder="Déjalo vacío si no aplica" />
              </InputField>
              <p style={{ gridColumn: '1 / -1', margin: '-8px 0 8px', fontSize: 12, color: C.textBrown }}>
                Si lo defines, el 1er control de este servicio siempre es gratis y desde el 2do se cobra este precio. Déjalo vacío para que el servicio no tenga niveles (comportamiento actual).
              </p>
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
