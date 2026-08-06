import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Search, Edit2, Trash2, X, Check, Menu, Bell,
  AlertTriangle, Layers, PackageX, ToggleLeft, ToggleRight, RefreshCw,
} from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import './MainDashboard.css';

// ── Paleta y tipografías (Dra. Ximena Correa — MedisXime) ─────────────────────
const C = {
  gold: '#5C3A28',
  goldLight: '#9C4A2E',
  bg: '#FFFBF5',
  bgPanel: '#F5EDE1',
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

// Sugerencias (el backend guarda category/unit como texto libre, sin enum)
const CATEGORY_SUGGESTIONS = ['Medicamentos', 'Insumos médicos', 'Equipos', 'Papelería', 'Aseo y desinfección'];
const UNIT_SUGGESTIONS = ['unidades', 'cajas', 'frascos', 'paquetes', 'litros', 'ml', 'mg'];

function adminHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Contrato del API real (apps/backend/src/types/inventory.types.ts) ────────
interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  minStock: number;
  notes: string | null;
  isActive: boolean;
}

type ItemStatus = 'ok' | 'low' | 'out';

function itemStatus(it: InventoryItem): ItemStatus {
  if (it.quantity <= 0) return 'out';
  if (it.quantity <= it.minStock) return 'low';
  return 'ok';
}

const STATUS_META: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  ok: { label: 'Disponible', color: '#16A34A', bg: 'rgba(34,197,94,0.10)' },
  low: { label: 'Stock bajo', color: '#D97706', bg: 'rgba(245,158,11,0.12)' },
  out: { label: 'Agotado', color: '#DC2626', bg: 'rgba(239,68,68,0.10)' },
};

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// El estado del formulario guarda solo dígitos; esto añade separador de miles visual
const fmtMiles = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

interface FormState {
  name: string;
  category: string;
  unit: string;
  price: string;
  quantity: string;
  minStock: string;
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  unit: '',
  price: '',
  quantity: '0',
  minStock: '0',
  notes: '',
  isActive: true,
};

type ActiveFilter = 'todos' | 'activos' | 'inactivos';

export const InventarioDashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('todos');

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [actionToast, setActionToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showActionToast = (msg: string, ok: boolean) => {
    setActionToast({ msg, ok });
    setTimeout(() => setActionToast(null), 4000);
  };

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory', { headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al cargar el inventario');
      setItems(data.data.items as InventoryItem[]);
    } catch (e: unknown) {
      setError((e as Error).message || 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const categories = useMemo(
    () => Array.from(new Set(items.map(i => i.category))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(it => categoryFilter === 'todas' || it.category === categoryFilter)
      .filter(it => activeFilter === 'todos' || (activeFilter === 'activos' ? it.isActive : !it.isActive))
      .filter(it => !q || it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search, categoryFilter, activeFilter]);

  const activeItems = useMemo(() => items.filter(i => i.isActive), [items]);
  const lowCount = activeItems.filter(it => itemStatus(it) === 'low').length;
  const outCount = activeItems.filter(it => itemStatus(it) === 'out').length;
  const inactiveCount = items.length - activeItems.length;

  const KPIS = [
    { icon: Package, label: 'Ítems Activos', value: activeItems.length, color: C.gold, bg: 'rgba(92,58,40,0.08)' },
    { icon: AlertTriangle, label: 'Stock Bajo', value: lowCount, color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    { icon: PackageX, label: 'Agotados', value: outCount, color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
    { icon: Layers, label: 'Categorías', value: categories.length, color: C.goldLight, bg: 'rgba(156,74,46,0.08)' },
  ];

  // ── Form helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (it: InventoryItem) => {
    setEditingItem(it);
    setForm({
      name: it.name,
      category: it.category,
      unit: it.unit,
      price: String(it.price),
      quantity: String(it.quantity),
      minStock: String(it.minStock),
      notes: it.notes ?? '',
      isActive: it.isActive,
    });
    setFormError('');
    setShowForm(true);
  };

  const saveForm = async () => {
    const name = form.name.trim();
    const category = form.category.trim();
    const unit = form.unit.trim();
    const price = Number(form.price);
    const quantity = Number(form.quantity || 0);
    const minStock = Number(form.minStock || 0);

    if (!name) { setFormError('El nombre es requerido.'); return; }
    if (!category) { setFormError('La categoría es requerida.'); return; }
    if (!unit) { setFormError('La unidad es requerida.'); return; }
    if (!form.price.trim() || !Number.isFinite(price) || price < 0) { setFormError('El precio es requerido y debe ser un número mayor o igual a 0.'); return; }
    if (!Number.isFinite(quantity) || quantity < 0) { setFormError('La cantidad debe ser un número mayor o igual a 0.'); return; }
    if (!Number.isFinite(minStock) || minStock < 0) { setFormError('El stock mínimo debe ser un número mayor o igual a 0.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const body = {
        name,
        category,
        unit,
        price,
        quantity,
        minStock,
        notes: form.notes.trim() || null,
        isActive: form.isActive,
      };
      const url = editingItem ? `/api/inventory/${editingItem.id}` : '/api/inventory';
      const method = editingItem ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: adminHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'No se pudo guardar el ítem.');
      setShowForm(false);
      await fetchItems();
      showActionToast(editingItem ? 'Ítem actualizado.' : 'Ítem creado.', true);
    } catch (e: unknown) {
      setFormError((e as Error).message || 'No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const adjustQuantity = async (it: InventoryItem, delta: number) => {
    const nextQuantity = Math.max(0, it.quantity + delta);
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, quantity: nextQuantity } : x));
    try {
      const res = await fetch(`/api/inventory/${it.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ quantity: nextQuantity }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'No se pudo actualizar la cantidad.');
    } catch (e: unknown) {
      showActionToast((e as Error).message || 'Error al actualizar la cantidad.', false);
      await fetchItems();
    }
  };

  const toggleActive = async (it: InventoryItem) => {
    const nextActive = !it.isActive;
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, isActive: nextActive } : x));
    try {
      const res = await fetch(`/api/inventory/${it.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'No se pudo cambiar el estado.');
      showActionToast(nextActive ? 'Ítem activado.' : 'Ítem desactivado.', true);
    } catch (e: unknown) {
      showActionToast((e as Error).message || 'Error al cambiar el estado.', false);
      await fetchItems();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/${deleteTarget.id}`, { method: 'DELETE', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'No se pudo eliminar el ítem.');
      setItems(prev => prev.map(x => x.id === deleteTarget.id ? { ...x, isActive: false } : x));
      showActionToast('Ítem desactivado del inventario.', true);
      setDeleteTarget(null);
    } catch (e: unknown) {
      showActionToast((e as Error).message || 'Error al eliminar el ítem.', false);
    } finally {
      setDeleting(false);
    }
  };

  const INPUT: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#FAFAF9', border: `1.5px solid ${C.border}`,
    borderRadius: 10, padding: '11px 14px',
    fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none',
  };
  const LABEL: React.CSSProperties = {
    fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown,
    letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  };

  return (
    <div className="dashboard-container">
      <AdminSidebar
        active="inventario"
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        actionSlot={
          <button
            className="gold-button"
            onClick={openCreate}
            style={{ width: '100%', padding: '12px 0', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Plus size={16} strokeWidth={3} />
            Nuevo Ítem
          </button>
        }
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">

        {/* TOPBAR */}
        <header style={{ height: 72, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 600, color: C.gold, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              MEDIS <span className="overview-label" style={{ fontSize: 12, fontFamily: FONT_INTER, color: C.textMuted, fontWeight: 500, letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>/ Inventario</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={fetchItems} title="Recargar" style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }} onMouseEnter={e => e.currentTarget.style.background = C.white} onMouseLeave={e => e.currentTarget.style.background = C.bgPanel}>
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
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontFamily: FONT_BODONI, fontSize: '2.5rem', color: C.text, marginBottom: '0.5rem', lineHeight: 1.2 }}>Inventario</h1>
                <p style={{ color: C.textMuted, fontSize: '1.05rem' }}>Controla insumos, medicamentos y equipos del consultorio.</p>
              </div>
              <button onClick={openCreate} className="gold-button" style={{ padding: '12px 24px', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} strokeWidth={3} /> Nuevo Ítem
              </button>
            </motion.div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</span>
                <button onClick={fetchItems} style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Reintentar</button>
              </div>
            )}

            {/* KPIs */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {KPIS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="glass-card" style={{ padding: '1.4rem', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} color={s.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</p>
                      <p className="stat-value" style={{ fontSize: '1.8rem', margin: 0, lineHeight: 1 }}>{s.value}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={15} color={C.textMuted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o categoría…"
                  style={{ ...INPUT, paddingLeft: 40, background: C.white }}
                />
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...INPUT, width: 'auto', background: C.white, cursor: 'pointer' }}>
                <option value="todas">Todas las categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as ActiveFilter)} style={{ ...INPUT, width: 'auto', background: C.white, cursor: 'pointer' }}>
                <option value="todos">Todos los estados</option>
                <option value="activos">Solo activos</option>
                <option value="inactivos">Solo inactivos</option>
              </select>
            </div>

            {/* Tabla / estados vacíos */}
            {loading ? (
              <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 16, padding: '56px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Cargando inventario…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 16, padding: '56px 24px', textAlign: 'center' }}>
                <Package size={36} color={C.textMuted} style={{ marginBottom: 12 }} />
                <p style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>
                  {items.length === 0 ? 'Inventario vacío' : 'Sin resultados'}
                </p>
                <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                  {items.length === 0
                    ? 'Registra el primer insumo, medicamento o equipo del consultorio.'
                    : 'Ningún ítem coincide con la búsqueda o los filtros.'}
                </p>
              </div>
            ) : (
              <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 16, overflow: 'hidden' }}>
                <div className="table-scroll" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.borderLight}`, background: C.bgPanel }}>
                        {['Ítem', 'Categoría', 'Precio', 'Cantidad', 'Stock mínimo', 'Estado', 'Acciones'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '13px 18px', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filtered.map(it => {
                          const st = STATUS_META[itemStatus(it)];
                          return (
                            <motion.tr
                              key={it.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: it.isActive ? 1 : 0.55 }}
                              exit={{ opacity: 0 }}
                              style={{ borderBottom: `1px solid ${C.borderLight}` }}
                            >
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{it.name}</div>
                                {it.notes && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{it.notes}</div>}
                              </td>
                              <td style={{ padding: '14px 18px', fontSize: 13, color: C.textBrown, fontWeight: 500 }}>{it.category}</td>
                              <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: C.text }}>{fmtPrice(it.price)}</td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <button onClick={() => adjustQuantity(it, -1)} disabled={!it.isActive} title="Restar 1"
                                    style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: it.isActive ? 'pointer' : 'not-allowed', color: C.textBrown, fontWeight: 700, lineHeight: 1, opacity: it.isActive ? 1 : 0.5 }}>−</button>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 34, textAlign: 'center' }}>{it.quantity}</span>
                                  <button onClick={() => adjustQuantity(it, 1)} disabled={!it.isActive} title="Sumar 1"
                                    style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: it.isActive ? 'pointer' : 'not-allowed', color: C.textBrown, fontWeight: 700, lineHeight: 1, opacity: it.isActive ? 1 : 0.5 }}>+</button>
                                  <span style={{ fontSize: 12, color: C.textMuted }}>{it.unit}</span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px', fontSize: 13, color: C.textBrown }}>{it.minStock} {it.unit}</td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                  {it.isActive && (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 11px', borderRadius: 9999, whiteSpace: 'nowrap' }}>{st.label}</span>
                                  )}
                                  <button onClick={() => toggleActive(it)} title={it.isActive ? 'Desactivar' : 'Activar'} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    {it.isActive
                                      ? <ToggleRight size={20} color="#16A34A" />
                                      : <ToggleLeft size={20} color={C.textMuted} />}
                                    <span style={{ fontSize: 11, fontWeight: 600, color: it.isActive ? '#16A34A' : C.textMuted }}>{it.isActive ? 'Activo' : 'Inactivo'}</span>
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button onClick={() => openEdit(it)} title="Editar"
                                    style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => setDeleteTarget(it)} disabled={!it.isActive} title={it.isActive ? 'Eliminar' : 'Ya está inactivo'}
                                    style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(220,38,38,0.25)', background: C.white, cursor: it.isActive ? 'pointer' : 'not-allowed', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: it.isActive ? 1 : 0.4 }}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {inactiveCount > 0 && (
              <p style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>
                {inactiveCount} ítem{inactiveCount !== 1 ? 's' : ''} inactivo{inactiveCount !== 1 ? 's' : ''} — usa el filtro de estado para verlos y reactivarlos.
              </p>
            )}

          </div>
        </main>
      </div>

      {/* ── MODAL crear/editar ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !saving && setShowForm(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(8px)', zIndex: 100 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}
            >
              <div style={{ background: C.white, borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', pointerEvents: 'all', padding: 28, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                  <div>
                    <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 4px' }}>Inventario</p>
                    <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 600, color: C.text, margin: 0 }}>
                      {editingItem ? 'Editar Ítem' : 'Nuevo Ítem'}
                    </h2>
                  </div>
                  <button onClick={() => setShowForm(false)} style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium, flexShrink: 0 }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={LABEL}>Nombre <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      autoFocus
                      value={form.name}
                      placeholder="Ej: Guantes de nitrilo talla M"
                      onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(''); }}
                      style={INPUT}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={LABEL}>Categoría <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        list="inv-category-suggestions"
                        value={form.category}
                        placeholder="Ej: Medicamentos"
                        onChange={e => { setForm(f => ({ ...f, category: e.target.value })); setFormError(''); }}
                        style={INPUT}
                      />
                      <datalist id="inv-category-suggestions">
                        {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label style={LABEL}>Unidad <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        list="inv-unit-suggestions"
                        value={form.unit}
                        placeholder="Ej: unidades"
                        onChange={e => { setForm(f => ({ ...f, unit: e.target.value })); setFormError(''); }}
                        style={INPUT}
                      />
                      <datalist id="inv-unit-suggestions">
                        {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label style={LABEL}>Precio (COP) <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700, fontSize: 13 }}>$</span>
                      <input
                        type="text" inputMode="numeric"
                        value={fmtMiles(form.price)}
                        placeholder="25.000"
                        onChange={e => { const digits = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, price: digits })); setFormError(''); }}
                        style={{ ...INPUT, paddingLeft: 28 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={LABEL}>Cantidad</label>
                      <input
                        type="number" min={0} value={form.quantity} placeholder="0"
                        onChange={e => { setForm(f => ({ ...f, quantity: e.target.value })); setFormError(''); }}
                        style={INPUT}
                      />
                    </div>
                    <div>
                      <label style={LABEL}>Stock mínimo</label>
                      <input
                        type="number" min={0} value={form.minStock} placeholder="0"
                        onChange={e => { setForm(f => ({ ...f, minStock: e.target.value })); setFormError(''); }}
                        style={INPUT}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={LABEL}>Notas</label>
                    <textarea
                      rows={3} value={form.notes} placeholder="Proveedor, ubicación, fecha de vencimiento…"
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0.75rem 1rem', background: C.bgPanel, borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textBrown }}>Estado del ítem</span>
                      <p style={{ fontSize: 11, color: C.textMuted, margin: '1px 0 0' }}>{form.isActive ? 'Visible y disponible' : 'Oculto del catálogo'}</p>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: form.isActive ? '#16A34A' : C.textMuted, fontWeight: 600 }}>{form.isActive ? 'Activo' : 'Inactivo'}</span>
                      {form.isActive ? <ToggleRight size={24} color="#16A34A" /> : <ToggleLeft size={24} color={C.textMuted} />}
                    </button>
                  </div>

                  {formError && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                      <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{formError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button onClick={() => setShowForm(false)}
                      style={{ padding: '11px 18px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={saveForm} disabled={saving} className="gold-button"
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                      <Check size={14} strokeWidth={2.5} />
                      {saving ? 'Guardando…' : editingItem ? 'Guardar Cambios' : 'Crear Ítem'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !deleting && setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.45)', backdropFilter: 'blur(6px)', zIndex: 110 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ position: 'fixed', inset: 0, zIndex: 111, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 16, padding: '2rem', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', pointerEvents: 'all', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Trash2 size={22} color="#DC2626" />
                </div>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.text, marginBottom: 8 }}>¿Eliminar ítem?</h3>
                <p style={{ color: C.textMuted, fontSize: 13, marginBottom: '1.5rem' }}>
                  Se desactivará <strong>{deleteTarget.name}</strong> del inventario. Podrás reactivarlo luego desde el filtro de inactivos.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#DC2626', color: C.white, fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                    {deleting ? 'Eliminando…' : 'Eliminar'}
                  </button>
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
