import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus, X, Trash2, Edit3, Menu, BadgePercent, Tag, CalendarDays, Users,
} from 'lucide-react';
import './MainDashboard.css';
import { AdminSidebar } from './AdminSidebar';
import { categoriaEnum } from './servicioSchema';
import { descuentoSchema } from '../../lib/schemas/descuentoSchema';
import type { DescuentoFormValues } from '../../lib/schemas/descuentoSchema';

const C = {
  gold: '#5C3A28',
  goldLight: '#9C4A2E',
  bg: '#FFFBF5',
  bgPanel: '#F5EDE1',
  bgSecondary: '#F5EDE1',
  white: '#FFFFFF',
  text: '#3D2B1F',
  textBrown: '#7A6452',
  textMedium: '#7A6452',
  textMuted: '#B0A08C',
  border: '#E6D9C7',
  borderLight: '#E6D9C7',
};

const FONT_BODONI = '"Cormorant Garamond", Georgia, serif';
const FONT_INTER = '"Inter", Inter, system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// ── Contrato del API (Task 1) ─────────────────────────────────────────────────
export interface DiscountPublic {
  id: string;
  name: string;
  kind: 'percentage' | 'two_for_one';
  value: number | null;
  code: string | null;
  specialty: string | null;
  startsAt: string | null;
  endsAt: string | null;
  maxUsesTotal: number | null;
  maxUsesPerPatient: number | null;
  usesCount: number;
  isActive: boolean;
  createdAt: string;
}

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; discount: DiscountPublic }
  | { type: 'delete'; discount: DiscountPublic };

const ESPECIALIDADES = categoriaEnum.options;

const authHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
});

const fmtDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const vigenciaLabel = (d: DiscountPublic): string => {
  if (!d.startsAt && !d.endsAt) return 'Sin vencimiento';
  return `${fmtDate(d.startsAt) ?? 'Sin inicio'} → ${fmtDate(d.endsAt) ?? 'Sin fin'}`;
};

// ── Formulario Crear / Editar ─────────────────────────────────────────────────
interface FormularioDescuentoProps {
  initialData?: DiscountPublic;
  onCancel: () => void;
  onSuccess: (data: DescuentoFormValues) => Promise<void> | void;
}

const FormularioDescuento: React.FC<FormularioDescuentoProps> = ({ initialData, onCancel, onSuccess }) => {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<DescuentoFormValues>({
    resolver: zodResolver(descuentoSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      kind: initialData.kind,
      value: initialData.value != null ? String(initialData.value) : '',
      code: initialData.code ?? '',
      specialty: initialData.specialty ?? '',
      startsAt: initialData.startsAt ? initialData.startsAt.slice(0, 10) : '',
      endsAt: initialData.endsAt ? initialData.endsAt.slice(0, 10) : '',
      maxUsesTotal: initialData.maxUsesTotal != null ? String(initialData.maxUsesTotal) : '',
      maxUsesPerPatient: initialData.maxUsesPerPatient != null ? String(initialData.maxUsesPerPatient) : '',
    } : {
      name: '',
      kind: 'percentage',
      value: '',
      code: '',
      specialty: '',
      startsAt: '',
      endsAt: '',
      maxUsesTotal: '',
      maxUsesPerPatient: '',
    },
  });

  const kind = watch('kind');

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: C.bgPanel,
    border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px',
    fontSize: 14, color: C.text, outline: 'none', fontFamily: FONT_INTER,
  };
  const errStyle: React.CSSProperties = { color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' };

  return (
    <div style={{ fontFamily: FONT_INTER }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.borderLight}` }}>
        <div>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{initialData ? 'Editar Descuento' : 'Nuevo Descuento'}</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: '4px 0 0 0' }}>Configura el tipo de promoción, su vigencia y sus límites de uso</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: 'none', border: 'none', color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <X size={16} /> Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit(async (data) => { await onSuccess(data); })} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nombre</label>
            <input {...register('name')} style={inputStyle} placeholder="Ej. Promoción de temporada" />
            {errors.name && <p style={errStyle}>{errors.name.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Tipo</label>
            <select {...register('kind')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="percentage">Porcentaje</option>
              <option value="two_for_one">2x1</option>
            </select>
            {errors.kind && <p style={errStyle}>{errors.kind.message}</p>}
          </div>

          {kind === 'percentage' && (
            <div>
              <label style={labelStyle}>Valor (%)</label>
              <input type="number" min={1} max={100} {...register('value')} style={inputStyle} placeholder="Ej. 20" />
              {errors.value && <p style={errStyle}>{errors.value.message}</p>}
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Código (opcional)</label>
            <input {...register('code')} style={{ ...inputStyle, fontFamily: FONT_MONO, textTransform: 'uppercase' }} placeholder="Ej. SALUD20" />
            <p style={{ fontSize: 12, color: C.textMuted, margin: '6px 0 0 0' }}>Déjalo vacío para que se aplique automáticamente</p>
            {errors.code && <p style={errStyle}>{errors.code.message}</p>}
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Especialidad</label>
            <select {...register('specialty')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Todos los servicios</option>
              {ESPECIALIDADES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
            </select>
            {errors.specialty && <p style={errStyle}>{errors.specialty.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Fecha inicio</label>
            <input type="date" {...register('startsAt')} style={inputStyle} />
            {errors.startsAt && <p style={errStyle}>{errors.startsAt.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Fecha fin</label>
            <input type="date" {...register('endsAt')} style={inputStyle} />
            {errors.endsAt && <p style={errStyle}>{errors.endsAt.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Límite usos totales</label>
            <input type="number" min={1} {...register('maxUsesTotal')} style={inputStyle} placeholder="Sin límite" />
            {errors.maxUsesTotal && <p style={errStyle}>{errors.maxUsesTotal.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Límite por paciente</label>
            <input type="number" min={1} {...register('maxUsesPerPatient')} style={inputStyle} placeholder="Sin límite" />
            {errors.maxUsesPerPatient && <p style={errStyle}>{errors.maxUsesPerPatient.message}</p>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', padding: '12px 32px', borderRadius: 12, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(92,58,40,0.28)', opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Guardando…' : (initialData ? 'Guardar Cambios' : 'Crear Descuento')}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const DescuentosDashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [discounts, setDiscounts] = useState<DiscountPublic[]>([]);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => { setSaveError(null); setDeleteError(null); }, [modalState]);

  const loadDiscounts = async () => {
    try {
      const res = await fetch('/api/discounts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (json.success) setDiscounts(json.data.discounts);
    } catch (error) {
      console.error('Error loading discounts:', error);
    }
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  const handleToggleStatus = async (id: string, newStatus: boolean) => {
    try {
      // Optimistic update
      setDiscounts(prev => prev.map(d => d.id === id ? { ...d, isActive: newStatus } : d));
      const res = await fetch(`/api/discounts/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (!res.ok) loadDiscounts(); // revert if failed
    } catch (error) {
      loadDiscounts();
    }
  };

  const handleDelete = async () => {
    if (modalState.type !== 'delete') return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/discounts/${modalState.discount.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setDeleteError(json?.error ?? 'No se pudo eliminar el descuento. Intenta de nuevo.');
        return;
      }
      loadDiscounts();
      setModalState({ type: 'none' });
    } catch (error) {
      console.error('Error deleting discount', error);
      setDeleteError('Error de conexión al eliminar el descuento.');
    }
  };

  const handleFormSuccess = async (data: DescuentoFormValues) => {
    setSaveError(null);
    // Mapear al contrato camelCase del API
    const payload = {
      name: data.name.trim(),
      kind: data.kind,
      value: data.kind === 'percentage' && data.value ? Number(data.value) : undefined,
      code: data.code && data.code.trim() ? data.code.trim() : undefined,
      specialty: data.specialty ? data.specialty : undefined,
      startsAt: data.startsAt ? data.startsAt : undefined,
      endsAt: data.endsAt ? data.endsAt : undefined,
      maxUsesTotal: data.maxUsesTotal ? Number(data.maxUsesTotal) : undefined,
      maxUsesPerPatient: data.maxUsesPerPatient ? Number(data.maxUsesPerPatient) : undefined,
    };
    try {
      let res: Response | undefined;
      if (modalState.type === 'create') {
        res = await fetch('/api/discounts', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      } else if (modalState.type === 'edit') {
        res = await fetch(`/api/discounts/${modalState.discount.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      }
      if (res && !res.ok) {
        const json = await res.json().catch(() => null);
        setSaveError(json?.error ?? 'No se pudo guardar el descuento. Intenta de nuevo.');
        return;
      }
      loadDiscounts();
      setModalState({ type: 'none' });
    } catch (error) {
      console.error('Error saving discount', error);
      setSaveError('Error de conexión al guardar el descuento.');
    }
  };

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <AdminSidebar active="descuentos" isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className="main-content" style={{ background: C.bg }}>

        {/* TOPBAR */}
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Gestión de Descuentos</h1>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL SCROLL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>

          {/* ── Header de contenido ── */}
          <div style={{ maxWidth: 1140, margin: '0 auto 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.goldLight }}>Promociones</span>
              <h2 style={{ fontFamily: FONT_BODONI, fontSize: '2.2rem', fontWeight: 700, color: C.text, margin: '4px 0 6px' }}>Descuentos</h2>
              <p style={{ fontSize: '0.95rem', color: C.textBrown, margin: 0, maxWidth: 520 }}>
                Porcentajes, 2x1 y códigos de descuento para tus pacientes.
              </p>
            </div>
            <button
              onClick={() => setModalState({ type: 'create' })}
              style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', padding: '12px 24px', borderRadius: 12, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(92,58,40,0.28)' }}
            >
              <Plus size={16} strokeWidth={2.5} /> Nuevo Descuento
            </button>
          </div>

          {/* ── Empty state ── */}
          {discounts.length === 0 ? (
            <div style={{ maxWidth: 1140, margin: '0 auto', padding: '80px 0', textAlign: 'center' }}>
              <BadgePercent size={72} color={C.textMuted} strokeWidth={1.2} style={{ marginBottom: 20 }} />
              <p style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.textBrown, margin: '0 0 8px' }}>Aún no has creado ningún descuento.</p>
              <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>Usa "Nuevo Descuento" para crear el primero.</p>
            </div>
          ) : (
            /* ── Grid de tarjetas ── */
            <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {discounts.map(discount => (
                <motion.div
                  key={discount.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onMouseEnter={() => setHoveredCard(discount.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.borderLight}`,
                    boxShadow: hoveredCard === discount.id ? '0 8px 24px rgba(0,0,0,0.04)' : '0 2px 12px rgba(0,0,0,0.02)',
                    transition: 'box-shadow 0.3s ease',
                    opacity: discount.isActive ? 1 : 0.6,
                    display: 'flex', flexDirection: 'column',
                  }}
                >
                  {/* Cabecera de la Tarjeta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.goldLight, background: 'rgba(156,74,46,0.1)', padding: '3px 10px', borderRadius: 12 }}>
                          {discount.kind === 'percentage' ? `Porcentaje ${discount.value}%` : '2x1'}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 10px 0', lineHeight: 1.2, wordBreak: 'break-word' }}>{discount.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 6 }}>
                        <Tag size={14} style={{ flexShrink: 0 }} />
                        {discount.code
                          ? <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.textBrown, letterSpacing: '0.04em' }}>{discount.code}</span>
                          : <span style={{ fontStyle: 'italic' }}>Automático</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 6 }}>
                        <BadgePercent size={14} style={{ flexShrink: 0 }} />
                        <span>{discount.specialty ?? 'Todos los servicios'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 6 }}>
                        <CalendarDays size={14} style={{ flexShrink: 0 }} />
                        <span>{vigenciaLabel(discount)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13 }}>
                        <Users size={14} style={{ flexShrink: 0 }} />
                        <span>Usos: <strong style={{ color: C.textBrown }}>{discount.usesCount} / {discount.maxUsesTotal ?? '∞'}</strong></span>
                      </div>
                    </div>

                    {/* Botones de Acción Directa */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setModalState({ type: 'edit', discount })}
                        title="Editar Descuento"
                        style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textBrown }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => setModalState({ type: 'delete', discount })}
                        title="Eliminar Descuento"
                        style={{ background: '#fef2f2', border: '1px solid #fca5a5', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div style={{ flex: 1 }} />

                  <div style={{ height: 1, background: C.bgPanel, margin: '20px 0 16px 0' }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: discount.isActive ? '#22c55e' : '#cbd5e1' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: discount.isActive ? '#15803d' : C.textMuted }}>
                        {discount.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    {/* Switch Activar / Desactivar */}
                    <button
                      onClick={() => handleToggleStatus(discount.id, !discount.isActive)}
                      title={discount.isActive ? 'Desactivar' : 'Activar'}
                      style={{ width: 44, height: 24, borderRadius: 12, background: discount.isActive ? C.gold : C.border, border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{ width: 18, height: 18, borderRadius: '50%', background: C.white, position: 'absolute', top: 3, left: discount.isActive ? 23 : 3, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ── MODALES Y SLIDE-OVERS ── */}
        <AnimatePresence>
          {/* SLIDE-OVER PARA CREAR / EDITAR */}
          {(modalState.type === 'create' || modalState.type === 'edit') && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.2)', backdropFilter: 'blur(2px)', zIndex: 40 }}
                onClick={() => setModalState({ type: 'none' })}
              />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 640, background: C.white, boxShadow: '-8px 0 32px rgba(0,0,0,0.1)', zIndex: 50, overflowY: 'auto' }}
              >
                <div style={{ padding: 32 }}>
                  {saveError && (
                    <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#D32F2F', fontWeight: 500 }}>
                      {saveError}
                    </div>
                  )}
                  <FormularioDescuento
                    initialData={modalState.type === 'edit' ? modalState.discount : undefined}
                    onCancel={() => setModalState({ type: 'none' })}
                    onSuccess={handleFormSuccess}
                  />
                </div>
              </motion.div>
            </>
          )}

          {/* MODAL DE ELIMINAR */}
          {modalState.type === 'delete' && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.2)', backdropFilter: 'blur(2px)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setModalState({ type: 'none' })}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  style={{ background: C.white, borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}
                >
                  <div style={{ width: 64, height: 64, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
                    <Trash2 size={24} />
                  </div>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px 0' }}>Eliminar Descuento</h3>
                  <p style={{ fontSize: 14, color: C.textMedium, margin: '0 0 32px 0' }}>¿Estás seguro de eliminar <strong>{modalState.discount.name}</strong>? Esta acción no se puede deshacer.</p>
                  {deleteError && (
                    <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#D32F2F', fontWeight: 500, textAlign: 'left' }}>
                      {deleteError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setModalState({ type: 'none' })} style={{ flex: 1, padding: '10px 0', background: C.bgPanel, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: C.textMedium, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleDelete} style={{ flex: 1, padding: '10px 0', background: '#ef4444', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: C.white, cursor: 'pointer' }}>Sí, Eliminar</button>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
