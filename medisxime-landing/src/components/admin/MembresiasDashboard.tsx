import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CreditCard, Bell, Menu, X, CheckCircle2, XCircle,
  Clock, Tag, Infinity, Edit2, Trash2, ToggleLeft, ToggleRight,
  RefreshCw,
} from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { CotizacionesCuidameDocPanel } from './shared/CotizacionesCuidameDocPanel';
import './MainDashboard.css';

const C = {
  gold: '#5C3A28',
  goldLight: '#9C4A2E',
  bgPanel: '#F5EDE1',
  white: '#FFFFFF',
  text: '#3D2B1F',
  textBrown: '#7A6452',
  textMedium: '#7A6452',
  textMuted: '#B0A08C',
  borderLight: '#E6D9C7',
};

const FONT_BODONI = '"Cormorant Garamond", Georgia, serif';

const STEPS = [
  { label: 'Básico', desc: 'Nombre y descripción' },
  { label: 'Servicios', desc: 'Servicios incluidos' },
  { label: 'Precio', desc: 'Tipo y valor' },
  { label: 'Confirmar', desc: 'Revisar y crear' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const formatPrice = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('es-CO');
};

type MembershipType = 'per_class' | 'monthly' | 'annual' | 'private' | 'pack' | 'inscription';

interface Membership {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: MembershipType;
  price: number;
  currency: string;
  durationDays: number | null;
  isActive: boolean;
  services?: { serviceId: string; quantity: number }[];
}

const TYPE_LABELS: Record<MembershipType, string> = {
  per_class:   'Por Consulta',
  monthly:     'Mensual',
  annual:      'Anual',
  private:     'Consulta Privada',
  pack:        'Pack de Consultas',
  inscription: 'Inscripción',
};

const TYPE_COLORS: Record<MembershipType, { bg: string; color: string }> = {
  per_class:   { bg: 'rgba(92,58,40,0.1)',    color: '#5C3A28' },
  monthly:     { bg: 'rgba(34,197,94,0.1)',   color: '#16A34A' },
  annual:      { bg: 'rgba(59,130,246,0.1)',  color: '#C97B5A' },
  private:     { bg: 'rgba(168,85,247,0.1)',  color: '#9C4A2E' },
  pack:        { bg: 'rgba(234,179,8,0.1)',   color: '#B45309' },
  inscription: { bg: 'rgba(236,72,153,0.1)',  color: '#5C3A28' },
};

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  type: 'per_class' as MembershipType,
  price: '',
  duration_days: '',
  is_active: true,
  services: [] as { serviceId: string; quantity: number }[],
};

function slugify(str: string) {
  return str.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 40);
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const MembresiasDashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [catalog, setCatalog] = useState<{id: string, title: string, category: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Membership | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [actionToast, setActionToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showActionToast = (msg: string, ok: boolean) => {
    setActionToast({ msg, ok });
    setTimeout(() => setActionToast(null), 4000);
  };

  // ── Fetch ────────────────────────────────────────────────────
  const fetchMemberships = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resMemberships, resCatalog] = await Promise.all([
        fetch('/api/memberships', { headers: authHeaders() }),
        fetch('/api/services/offers', { headers: authHeaders() })
      ]);
      const data = await resMemberships.json();
      const catalogData = await resCatalog.json();
      if (!data.success) throw new Error(data.error ?? 'Error al cargar planes');
      setMemberships(data.data.memberships);
      if (catalogData.success) {
        setCatalog(catalogData.data.offers.map((o: any) => ({
          id: o.id,
          title: o.title,
          category: o.specialty_name || o.title.split(' — ')[0] || 'Servicio'
        })));
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMemberships(); }, []);

  // ── Modal helpers ────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCurrentStep(0);
    setShowModal(true);
  };

  const openEdit = (m: Membership) => {
    setEditTarget(m);
    setForm({
      name: m.name,
      code: m.code,
      description: m.description ?? '',
      type: m.type,
      price: String(m.price),
      duration_days: m.durationDays != null ? String(m.durationDays) : '',
      is_active: m.isActive,
      services: m.services ?? [],
    });
    setFormErrors({});
    setCurrentStep(0);
    setShowModal(true);
  };

  const validateStep = (step: number) => {
    const e: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (step === 0) {
      if (!form.name.trim()) e.name = 'Requerido';
      if (!form.code.trim()) e.code = 'Requerido';
    }
    if (step === 2) {
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Precio inválido';
      if ((form.type === 'monthly' || form.type === 'annual') && !form.duration_days)
        e.duration_days = 'Requerido para este tipo';
      // inscription never requires duration_days
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(currentStep);
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setFormErrors({});
    setCurrentStep(s => s + 1);
  };

  const validate = () => {
    const e: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.name.trim()) e.name = 'Requerido';
    if (!form.code.trim()) e.code = 'Requerido';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Precio inválido';
    if ((form.type === 'monthly' || form.type === 'annual') && !form.duration_days)
      e.duration_days = 'Requerido para este tipo';
    // inscription never requires duration_days
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setFormErrors(e); return; }

    setSaving(true);
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      price: Number(form.price),
      currency: 'COP',
      durationDays: form.duration_days ? Number(form.duration_days) : null,
      isActive: form.is_active,
      services: form.services,
    };

    try {
      const url = editTarget ? `/api/memberships/${editTarget.id}` : '/api/memberships';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al guardar');
      await fetchMemberships();
      setShowModal(false);
    } catch (e: unknown) {
      setFormErrors({ name: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m: Membership) => {
    try {
      const res = await fetch(`/api/memberships/${m.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMemberships(prev => prev.map(x => x.id === m.id ? { ...x, isActive: !x.isActive } : x));
    } catch {
      // revert silently
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memberships/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'No se pudo eliminar el plan');
      setMemberships(prev => prev.filter(m => m.id !== id));
      showActionToast('Plan eliminado.', true);
    } catch (e) {
      showActionToast((e as Error).message, false);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const hasDuration = form.type === 'monthly' || form.type === 'annual';
  const tPreview = TYPE_COLORS[form.type] ?? TYPE_COLORS.per_class;

  
  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      // @ts-ignore
      if (typeof setIsMobileMenuOpen === 'function') setIsMobileMenuOpen((p: any) => !p);
    } else {
      document.body.classList.toggle('sidebar-collapsed');
    }
  };

  return (
    <div className="dashboard-container">
      <AdminSidebar
        active="planes"
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        actionSlot={
          <button className="gold-button" onClick={openCreate} style={{ width: '100%', padding: '12px 0', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={16} strokeWidth={3} />
            Nuevo Plan
          </button>
        }
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">

        {/* TOPBAR */}
        <header style={{ height: 72, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="menu-toggle" onClick={toggleSidebar}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 600, color: C.gold, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              MEDIS <span className="overview-label" style={{ fontSize: 12, fontFamily: '"Inter", sans-serif', color: C.textMuted, fontWeight: 500, letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>/ Planes</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={fetchMemberships} title="Recargar" style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }} onMouseEnter={e => e.currentTarget.style.background = C.white} onMouseLeave={e => e.currentTarget.style.background = C.bgPanel}>
              <RefreshCw size={16} />
            </button>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }} onMouseEnter={e => e.currentTarget.style.background = C.white} onMouseLeave={e => e.currentTarget.style.background = C.bgPanel}>
              <Bell size={18} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 12, border: `2px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 10px rgba(92,58,40,0.2)' }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', background: 'radial-gradient(circle at top right, rgba(92,58,40,0.03), transparent 400px)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontFamily: FONT_BODONI, fontSize: '2.5rem', color: C.text, marginBottom: '0.5rem', lineHeight: 1.2 }}>Gestión de Planes</h1>
                <p style={{ color: C.textMuted, fontSize: '1.05rem' }}>Administra los planes y tarifas disponibles en MEDIS Studio.</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={openCreate} className="gold-button" style={{ padding: '12px 24px', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={16} strokeWidth={3} /> Nuevo Plan
                </button>
              </div>
            </motion.div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</span>
                <button onClick={fetchMemberships} style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Reintentar</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total planes', value: memberships.length, icon: Tag, color: C.gold, bg: 'rgba(92,58,40,0.08)' },
                { label: 'Planes activos', value: memberships.filter(m => m.isActive).length, icon: CheckCircle2, color: '#16A34A', bg: 'rgba(34,197,94,0.08)' },
                { label: 'Planes inactivos', value: memberships.filter(m => !m.isActive).length, icon: XCircle, color: '#DC2626', bg: 'rgba(239,68,68,0.08)' },
                { label: 'Precio promedio', value: memberships.length ? fmt(Math.round(memberships.reduce((a, m) => a + m.price, 0) / memberships.length)) : '—', icon: CreditCard, color: '#C97B5A', bg: 'rgba(59,130,246,0.08)', isText: true },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="glass-card" style={{ padding: '1.4rem', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} color={s.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</p>
                      {s.isText
                        ? <p className="stat-value" style={{ fontSize: '1.2rem', margin: 0, lineHeight: 1 }}>{s.value as string}</p>
                        : <p className="stat-value" style={{ fontSize: '1.8rem', margin: 0, lineHeight: 1 }}>{s.value as number}</p>
                      }
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', color: C.text, margin: '0 0 4px' }}>Cotizaciones de pacientes</h2>
              <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                Cotizaciones de un solo uso creadas al cerrar una historia clínica en CuidameDoc — no forman parte del catálogo de planes reutilizables de abajo.
              </p>
            </div>
            <CotizacionesCuidameDocPanel showToast={showActionToast} />

            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {[1, 2, 3].map(n => (
                  <div key={n} className="glass-card" style={{ padding: '1.5rem', minHeight: 220 }}>
                    {[80, 120, 60, 100].map((w, i) => (
                      <div key={i} style={{ height: 14, width: `${w}%`, background: 'linear-gradient(90deg, #DDD6FE 25%, #F3F0FB 50%, #DDD6FE 75%)', backgroundSize: '400% 100%', borderRadius: 6, marginBottom: 12, animation: 'shimmer 1.4s ease infinite' }} />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!loading && (() => {
              const inscriptions = memberships.filter(m => m.type === 'inscription');
              const plans = memberships.filter(m => m.type !== 'inscription');
              const renderCard = (m: Membership, i: number) => {
                    const tColor = TYPE_COLORS[m.type] ?? TYPE_COLORS.per_class;
                    return (
                      <motion.div key={m.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.06 }} className="glass-card" style={{ padding: '1.5rem', opacity: m.isActive ? 1 : 0.65 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ padding: '3px 10px', borderRadius: 99, background: tColor.bg, color: tColor.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', width: 'fit-content' }}>
                              {TYPE_LABELS[m.type] ?? m.type}
                            </span>
                            <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.25rem', color: C.text, margin: 0, lineHeight: 1.2 }}>{m.name}</h3>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => openEdit(m)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(92,58,40,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(92,58,40,0.14)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(92,58,40,0.07)'}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => setDeleteConfirm(m.id)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {m.description && (
                          <p style={{ fontSize: 13, color: C.textMedium, marginBottom: '1rem', lineHeight: 1.5 }}>{m.description}</p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '1rem' }}>
                          <span className="stat-value" style={{ fontSize: '1.8rem', lineHeight: 1 }}>{fmt(m.price)}</span>
                          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>/ {(TYPE_LABELS[m.type] ?? m.type).toLowerCase()}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                            {m.durationDays ? <><Clock size={12} />{m.durationDays} días</> : <><Infinity size={12} />Sin vencimiento</>}
                          </span>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>·</span>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{m.code}</span>
                        </div>

                        <div style={{ height: 1, background: C.borderLight, margin: '0.75rem 0' }} />

                        <button onClick={() => toggleActive(m)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: m.isActive ? '#16A34A' : C.textMuted }}>
                            {m.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                          {m.isActive ? <ToggleRight size={22} color="#16A34A" /> : <ToggleLeft size={22} color={C.textMuted} />}
                        </button>
                      </motion.div>
                    );
              };

              return (
                <>
                  {/* ── Inscripciones ── */}
                  {inscriptions.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#5C3A28' }} />
                        <h2 style={{ fontFamily: FONT_BODONI, fontSize: '1.1rem', color: C.text, margin: 0 }}>Inscripción</h2>
                        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>— Pago único · habilita el acceso a planes</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        <AnimatePresence>
                          {inscriptions.map((m, i) => renderCard(m, i))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* ── Planes ── */}
                  {plans.length > 0 && (
                    <div>
                      {inscriptions.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.gold }} />
                          <h2 style={{ fontFamily: FONT_BODONI, fontSize: '1.1rem', color: C.text, margin: 0 }}>Planes</h2>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>— Requieren inscripción activa</span>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        <AnimatePresence>
                          {plans.map((m, i) => renderCard(m, i))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* ── Empty state ── */}
                  {memberships.length === 0 && !error && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: C.textMuted }}>
                      <CreditCard size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No hay planes creados aún.</p>
                      <button onClick={openCreate} className="gold-button" style={{ marginTop: '1rem', padding: '10px 24px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={15} /> Crear primer plan
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </main>
      </div>

      {/* ── WIZARD MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(8px)', zIndex: 100 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}
            >
              <div style={{ background: C.white, borderRadius: 24, width: '100%', maxWidth: 500, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', pointerEvents: 'all', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

                {/* Modal header */}
                <div style={{ padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 1.5rem) 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.borderLight}` }}>
                  <div>
                    <h2 style={{ fontFamily: FONT_BODONI, fontSize: '1.5rem', color: C.text, margin: 0 }}>
                      {editTarget ? 'Editar Plan' : 'Nuevo Plan'}
                    </h2>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: '2px 0 0', fontWeight: 500 }}>
                      {STEPS[currentStep].desc}
                    </p>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium, flexShrink: 0 }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '1.1rem 1.75rem 0.5rem' }}>
                  {STEPS.map((step, i) => (
                    <React.Fragment key={i}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <motion.div
                          animate={{
                            background: i < currentStep
                              ? C.gold
                              : i === currentStep
                                ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
                                : 'transparent',
                            borderColor: i <= currentStep ? C.gold : C.borderLight,
                            scale: i === currentStep ? 1.1 : 1,
                          }}
                          transition={{ duration: 0.25 }}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            border: `2px solid ${i <= currentStep ? C.gold : C.borderLight}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                            color: i <= currentStep ? C.white : C.textMuted,
                          }}
                        >
                          {i < currentStep ? '✓' : i + 1}
                        </motion.div>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: i === currentStep ? C.gold : i < currentStep ? C.goldLight : C.textMuted, transition: 'color 0.25s' }}>
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <motion.div
                          animate={{ background: i < currentStep ? C.gold : C.borderLight }}
                          transition={{ duration: 0.25 }}
                          style={{ flex: 1, height: 2, margin: '0 6px', marginBottom: 16 }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Step content */}
                <div style={{ padding: '1rem clamp(1rem, 4vw, 1.5rem)', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <AnimatePresence mode="wait">

                    {/* ── Step 0: Básico ── */}
                    {currentStep === 0 && (
                      <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Field label="Nombre del plan *" error={formErrors.name}>
                          <input
                            autoFocus
                            value={form.name}
                            onChange={e => { const name = e.target.value; setForm(f => ({ ...f, name, code: editTarget ? f.code : slugify(name) })); setFormErrors(v => ({ ...v, name: undefined })); }}
                            placeholder="Ej: Plan Mensual"
                            style={inputStyle(!!formErrors.name)}
                          />
                        </Field>
                        <Field label="Código único *" error={formErrors.code}>
                          <input
                            value={form.code}
                            onChange={e => { setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '_') })); setFormErrors(v => ({ ...v, code: undefined })); }}
                            placeholder="MENSUAL"
                            style={{ ...inputStyle(!!formErrors.code), fontFamily: 'monospace', letterSpacing: '0.06em' }}
                          />
                        </Field>
                        <Field label="Descripción">
                          <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Descripción breve del plan..."
                            rows={2}
                            style={{ ...inputStyle(false), resize: 'vertical', lineHeight: 1.5 }}
                          />
                        </Field>
                      </motion.div>
                    )}

                    {/* ── Step 1: Servicios ── */}
                    {currentStep === 1 && (
                      <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                          Añade los servicios que incluye este plan y la cantidad de cada uno.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {form.services.map((svc, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select
                                value={svc.serviceId}
                                onChange={e => {
                                  const newServices = [...form.services];
                                  newServices[i].serviceId = e.target.value;
                                  setForm({ ...form, services: newServices });
                                }}
                                style={{ flex: 1, ...inputStyle(false), padding: '8px 12px' }}
                              >
                                <option value="" disabled>Selecciona un servicio</option>
                                {catalog.map(c => (
                                  <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="1"
                                value={svc.quantity}
                                onChange={e => {
                                  const newServices = [...form.services];
                                  newServices[i].quantity = Number(e.target.value);
                                  setForm({ ...form, services: newServices });
                                }}
                                style={{ width: 80, ...inputStyle(false), padding: '8px 12px' }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newServices = [...form.services];
                                  newServices.splice(i, 1);
                                  setForm({ ...form, services: newServices });
                                }}
                                style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', cursor: 'pointer' }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setForm({ ...form, services: [...form.services, { serviceId: '', quantity: 1 }] })}
                          style={{ padding: '8px 12px', borderRadius: 8, border: `1px dashed ${C.gold}`, background: 'transparent', color: C.gold, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start' }}
                        >
                          <Plus size={14} /> Añadir Servicio
                        </button>
                      </motion.div>
                    )}

                    {/* ── Step 2: Precio ── */}
                    {currentStep === 2 && (
                      <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Field label="Tipo de plan *">
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {(Object.keys(TYPE_LABELS) as MembershipType[]).map(t => {
                              const sel = form.type === t;
                              const tc = TYPE_COLORS[t];
                              return (
                                <button
                                  key={t} type="button"
                                  onClick={() => setForm(f => ({ ...f, type: t, duration_days: (t === 'per_class' || t === 'private' || t === 'pack' || t === 'inscription') ? '' : f.duration_days }))}
                                  style={{ padding: '10px 6px', borderRadius: 10, border: `2px solid ${sel ? tc.color : C.borderLight}`, background: sel ? tc.bg : 'transparent', color: sel ? tc.color : C.textBrown, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', letterSpacing: '0.04em' }}
                                >
                                  {TYPE_LABELS[t]}
                                </button>
                              );
                            })}
                          </div>
                        </Field>
                        <div style={{ display: 'grid', gridTemplateColumns: hasDuration ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                          <Field label="Precio (COP) *" error={formErrors.price}>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700, fontSize: 13 }}>$</span>
                              <input
                                autoFocus
                                type="text"
                                inputMode="numeric"
                                value={formatPrice(form.price)}
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  setForm(f => ({ ...f, price: digits }));
                                  setFormErrors(v => ({ ...v, price: undefined }));
                                }}
                                placeholder="45.000"
                                style={{ ...inputStyle(!!formErrors.price), paddingLeft: 28 }}
                              />
                            </div>
                          </Field>
                          {hasDuration && (
                            <Field label="Duración (días) *" error={formErrors.duration_days}>
                              <input
                                type="number" min="1"
                                value={form.duration_days}
                                onChange={e => { setForm(f => ({ ...f, duration_days: e.target.value })); setFormErrors(v => ({ ...v, duration_days: undefined })); }}
                                placeholder={form.type === 'annual' ? '365' : '30'}
                                style={inputStyle(!!formErrors.duration_days)}
                              />
                            </Field>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step 3: Confirmar ── */}
                    {currentStep === 3 && (
                      <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                          Así quedará el plan. Confirma antes de {editTarget ? 'guardar' : 'crear'}.
                        </p>

                        {/* Preview card */}
                        <div style={{ background: `linear-gradient(135deg, rgba(92,58,40,0.03), rgba(59,130,246,0.05))`, borderRadius: 16, padding: '1rem', border: `1.5px solid ${C.borderLight}`, overflow: 'hidden' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, background: tPreview.bg, color: tPreview.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', display: 'inline-block' }}>
                            {TYPE_LABELS[form.type]}
                          </span>
                          <h3 style={{ fontFamily: FONT_BODONI, fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', color: C.text, margin: '10px 0 4px', wordBreak: 'break-word' }}>
                            {form.name || <span style={{ opacity: 0.4 }}>Sin nombre</span>}
                          </h3>
                          {form.description && (
                            <p style={{ fontSize: 12, color: C.textMedium, margin: '0 0 10px', lineHeight: 1.5, wordBreak: 'break-word' }}>{form.description}</p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0', flexWrap: 'wrap' }}>
                            <span className="stat-value" style={{ fontSize: 'clamp(1.3rem, 5vw, 1.7rem)', lineHeight: 1 }}>{fmt(Number(form.price) || 0)}</span>
                            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>COP</span>
                          </div>
                          {form.duration_days && (
                            <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} style={{ flexShrink: 0 }} /> {form.duration_days} días de vigencia
                            </p>
                          )}
                          {form.services.length > 0 && (
                            <div style={{ marginTop: 12, borderTop: `1px solid ${C.borderLight}`, paddingTop: 10 }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incluye</p>
                              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {form.services.map((svc, i) => {
                                  const c = catalog.find(x => x.id === svc.serviceId);
                                  return (
                                    <li key={i} style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontWeight: 600, color: C.text }}>{svc.quantity}x</span> {c ? c.title : 'Servicio'}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Active toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0.75rem 1rem', background: C.bgPanel, borderRadius: 10, border: `1px solid ${C.borderLight}`, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.textBrown }}>Estado del plan</span>
                            <p style={{ fontSize: 11, color: C.textMuted, margin: '1px 0 0' }}>{form.is_active ? 'Visible para los usuarios' : 'Oculto para los usuarios'}</p>
                          </div>
                          <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, color: form.is_active ? '#16A34A' : C.textMuted, fontWeight: 600 }}>{form.is_active ? 'Activo' : 'Inactivo'}</span>
                            {form.is_active ? <ToggleRight size={26} color="#16A34A" /> : <ToggleLeft size={26} color={C.textMuted} />}
                          </button>
                        </div>

                        {formErrors.name && (
                          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                            <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{formErrors.name}</span>
                          </div>
                        )}
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Navigation */}
                <div style={{ padding: '0.75rem clamp(1rem, 4vw, 1.5rem) 1.5rem', display: 'flex', gap: 10, borderTop: `1px solid ${C.borderLight}`, flexWrap: 'nowrap', flexShrink: 0, background: C.white }}>
                  {currentStep === 0 ? (
                    <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  ) : (
                    <button onClick={() => { setFormErrors({}); setCurrentStep(s => s - 1); }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      ← Atrás
                    </button>
                  )}
                  {currentStep < STEPS.length - 1 ? (
                    <button onClick={handleNext} className="gold-button" style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, letterSpacing: '0.06em' }}>
                      Siguiente <span style={{ fontSize: 15 }}>→</span>
                    </button>
                  ) : (
                    <button onClick={handleSubmit} disabled={saving} className="gold-button" style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.06em', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {saving ? 'Guardando…' : editTarget ? '✓ Guardar Cambios' : '✓ Crear Plan'}
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.45)', backdropFilter: 'blur(6px)', zIndex: 110 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ position: 'fixed', inset: 0, zIndex: 111, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 16, padding: '2rem', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', pointerEvents: 'all', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Trash2 size={22} color="#DC2626" />
                </div>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.text, marginBottom: 8 }}>¿Eliminar plan?</h3>
                <p style={{ color: C.textMuted, fontSize: 13, marginBottom: '1.5rem' }}>Esta acción eliminará el plan permanentemente de la base de datos.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#DC2626', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 200,
              background: actionToast.ok ? '#16A34A' : '#DC2626',
              color: C.white, padding: '12px 24px', borderRadius: 12,
              fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              maxWidth: '90vw', textAlign: 'center',
            }}
          >
            {actionToast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: `1.5px solid ${hasError ? '#DC2626' : '#DDD6FE'}`,
  background: '#FAFAF9',
  fontSize: 13,
  color: '#1B1C1C',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: '"Inter", Inter, sans-serif',
  transition: 'border-color 0.18s',
});

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>{error}</span>}
  </div>
);

