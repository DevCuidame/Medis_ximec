import React, { useEffect, useState } from 'react';
import { Menu, ClipboardList, Plus, Trash2, AlertTriangle, CheckCircle2, Ban, RotateCcw, History } from 'lucide-react';
import './MainDashboard.css';
import { AdminSidebar } from './AdminSidebar';
import { categoriaEnum } from './servicioSchema';
import { GRUPOS, CATALOGO } from '../../lib/serviciosCatalogo';

const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  bg: '#FFFBF5', bgPanel: '#F5EDE1', bgSecondary: '#F5EDE1',
  white: '#FFFFFF', text: '#3D2B1F', textBrown: '#7A6452',
  textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
  red: '#EF4444', redLight: '#FEE2E2', green: '#10B981', greenLight: '#D1FAE5',
};
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif';
const FONT_INTER = '"Inter", Inter, system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

interface CupsCatalogEntry { cupsCode: string; procedureName: string; isActive: boolean; createdAt: string }
interface CupsMapping {
  id: string; specialty: string;
  serviceGroup: string; serviceSubgroup: string; serviceCategory: string; serviceSubcategory: string;
  cupsCode: string; procedureName: string; isActive: boolean;
}
interface CupsAuditEntry {
  id: string; entityType: 'catalog' | 'mapping'; entityRef: string;
  action: 'create' | 'update' | 'deactivate' | 'reactivate' | 'delete';
  performedByEmail: string | null; createdAt: string;
}

const authHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
});

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: C.white,
  border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px',
  fontSize: 13, color: C.text, outline: 'none', fontFamily: FONT_INTER,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
};
const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
};
const td: React.CSSProperties = { padding: '10px 14px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.borderLight}` };

const ACTION_LABEL: Record<CupsAuditEntry['action'], string> = {
  create: 'Creado', update: 'Modificado', deactivate: 'Desactivado', reactivate: 'Reactivado', delete: 'Eliminado',
};

const InactiveBadge: React.FC = () => (
  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted, background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: 6, padding: '2px 6px' }}>
    Inactivo
  </span>
);

export const CupsCatalogDashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [catalog, setCatalog] = useState<CupsCatalogEntry[]>([]);
  const [mappings, setMappings] = useState<CupsMapping[]>([]);
  const [auditLog, setAuditLog] = useState<CupsAuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSaving, setCatalogSaving] = useState(false);

  const [mSpecialty, setMSpecialty] = useState('');
  const [mGroup, setMGroup] = useState('');
  const [mSubgroup, setMSubgroup] = useState('');
  const [mCategory, setMCategory] = useState('');
  const [mSubcategory, setMSubcategory] = useState('');
  const [mCupsCode, setMCupsCode] = useState('');
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSaving, setMappingSaving] = useState(false);
  const [statusCheck, setStatusCheck] = useState<{ text: string; kind: 'ok' | 'warn' } | null>(null);

  const loadAll = () => {
    fetch('/api/services/cups-catalog', { headers: authHeaders() }).then(r => r.json()).then(j => {
      if (j.success) setCatalog(j.data.catalog);
    }).catch(() => {});
    fetch('/api/services/cups-mappings', { headers: authHeaders() }).then(r => r.json()).then(j => {
      if (j.success) setMappings(j.data.mappings);
    }).catch(() => {});
    fetch('/api/services/cups-audit-log', { headers: authHeaders() }).then(r => r.json()).then(j => {
      if (j.success) setAuditLog(j.data.log);
    }).catch(() => {});
  };
  useEffect(() => { loadAll(); }, []);

  // ── Selects encadenados del formulario de mapeo (mismo árbol que el formulario de servicios) ──
  const mSubgrupos = CATALOGO[mGroup] ?? [];
  const mCategorias = mSubgrupos.find(s => s.code === mSubgroup)?.children ?? [];
  const mSubcategorias = mCategorias.find(c => c.code === mCategory)?.children ?? [];

  // ── Verifica en vivo el estado actual de la combinación elegida ──
  useEffect(() => {
    if (!mSpecialty || !mGroup || !mSubgroup || !mCategory || !mSubcategory) { setStatusCheck(null); return; }
    let cancelled = false;
    const params = new URLSearchParams({ specialty: mSpecialty, serviceGroup: mGroup, serviceSubgroup: mSubgroup, serviceCategory: mCategory, serviceSubcategory: mSubcategory });
    fetch(`/api/services/cups-lookup?${params.toString()}`, { headers: authHeaders() })
      .then(async r => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok || !body.success) { setStatusCheck({ text: 'Sin mapeo todavía — esta combinación quedará bloqueada hasta agregar una fila.', kind: 'warn' }); return; }
        if (body.data.match === 'unique') { setStatusCheck({ text: `Ya tiene un único CUPS: ${body.data.cupsCode} — agregar otro lo volverá ambiguo.`, kind: 'ok' }); return; }
        setStatusCheck({ text: `Ya es ambiguo (${body.data.candidates.length} candidatos).`, kind: 'warn' });
      })
      .catch(() => { if (!cancelled) setStatusCheck(null); });
    return () => { cancelled = true; };
  }, [mSpecialty, mGroup, mSubgroup, mCategory, mSubcategory]);

  const handleAddCatalogEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogError(null);
    setCatalogSaving(true);
    try {
      const res = await fetch('/api/services/cups-catalog', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ cupsCode: newCode.trim(), procedureName: newName.trim() }),
      });
      const json = await res.json();
      if (!json.success) { setCatalogError(json.error ?? 'No se pudo agregar el código.'); return; }
      setNewCode(''); setNewName('');
      loadAll();
    } catch { setCatalogError('Error de conexión al guardar.'); }
    finally { setCatalogSaving(false); }
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setMappingError(null);
    setMappingSaving(true);
    try {
      const res = await fetch('/api/services/cups-mappings', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          specialty: mSpecialty, serviceGroup: mGroup, serviceSubgroup: mSubgroup,
          serviceCategory: mCategory, serviceSubcategory: mSubcategory, cupsCode: mCupsCode.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) { setMappingError(json.error ?? 'No se pudo agregar el mapeo.'); return; }
      setMSpecialty(''); setMGroup(''); setMSubgroup(''); setMCategory(''); setMSubcategory(''); setMCupsCode('');
      loadAll();
    } catch { setMappingError('Error de conexión al guardar.'); }
    finally { setMappingSaving(false); }
  };

  const handleToggleCatalogActive = async (entry: CupsCatalogEntry) => {
    try {
      const res = await fetch(`/api/services/cups-catalog/${entry.cupsCode}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ isActive: !entry.isActive }),
      });
      const json = await res.json();
      if (!json.success) { alert(json.error ?? 'No se pudo actualizar.'); return; }
      loadAll();
    } catch { alert('Error de conexión al actualizar.'); }
  };

  const handleDeleteCatalogEntry = async (entry: CupsCatalogEntry) => {
    if (!window.confirm(`¿Eliminar el código ${entry.cupsCode} del catálogo? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/services/cups-catalog/${entry.cupsCode}`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (!json.success) {
        if (res.status === 409 && window.confirm(`${json.error}\n\n¿Marcarlo como inactivo en su lugar?`)) {
          await handleToggleCatalogActive(entry);
        } else if (res.status !== 409) {
          alert(json.error ?? 'No se pudo eliminar.');
        }
        return;
      }
      loadAll();
    } catch { alert('Error de conexión al eliminar.'); }
  };

  const handleToggleMappingActive = async (mapping: CupsMapping) => {
    try {
      const res = await fetch(`/api/services/cups-mappings/${mapping.id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ isActive: !mapping.isActive }),
      });
      const json = await res.json();
      if (!json.success) { alert(json.error ?? 'No se pudo actualizar.'); return; }
      loadAll();
    } catch { alert('Error de conexión al actualizar.'); }
  };

  const handleDeleteMapping = async (mapping: CupsMapping) => {
    if (!window.confirm(`¿Eliminar el mapeo de "${mapping.specialty}" → ${mapping.cupsCode}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/services/cups-mappings/${mapping.id}`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (!json.success) {
        if (res.status === 409 && window.confirm(`${json.error}\n\n¿Marcarlo como inactivo en su lugar?`)) {
          await handleToggleMappingActive(mapping);
        } else if (res.status !== 409) {
          alert(json.error ?? 'No se pudo eliminar.');
        }
        return;
      }
      loadAll();
    } catch { alert('Error de conexión al eliminar.'); }
  };

  const groupName = (code: string) => GRUPOS.find(g => g.code === code)?.name ?? code;
  const activeCatalog = catalog.filter(c => c.isActive);

  const iconBtnStyle = (color: string): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: 'pointer', color, padding: 6, borderRadius: 6, display: 'inline-flex',
  });

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <AdminSidebar active="cupsCatalogo" isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />

      <main className="main-content" style={{ background: C.bg }}>
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', flexShrink: 0, zIndex: 10 }}>
          <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
          <h1 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Catálogo CUPS</h1>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.goldLight }}>Facturación</span>
              <h2 style={{ fontFamily: FONT_BODONI, fontSize: '2.2rem', fontWeight: 700, color: C.text, margin: '4px 0 6px' }}>Códigos CUPS y mapeos</h2>
              <p style={{ fontSize: '0.95rem', color: C.textBrown, margin: 0, maxWidth: 640 }}>
                El Código CUPS del formulario de servicios se calcula automáticamente a partir de la Especialidad y la
                clasificación (Grupo/Subgrupo/Categoría/Subcategoría). Si un código o mapeo ya está en uso, no se puede
                eliminar — solo desactivar; el formulario de servicios deja de ofrecerlo pero no se rompe nada de lo ya guardado.
              </p>
            </div>
            <button
              onClick={() => setShowAudit(v => !v)}
              style={{ background: C.white, color: C.textBrown, border: `1px solid ${C.border}`, padding: '10px 16px', borderRadius: 10, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <History size={14} /> {showAudit ? 'Ocultar auditoría' : 'Ver auditoría'}
            </button>
          </div>

          {/* ── Auditoría ── */}
          {showAudit && (
            <div style={{ maxWidth: 1140, margin: '0 auto 24px', background: C.white, borderRadius: 16, border: `1px solid ${C.borderLight}`, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={18} color={C.gold} />
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Historial de cambios</h3>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={th}>Cuándo</th><th style={th}>Quién</th><th style={th}>Acción</th><th style={th}>Entidad</th><th style={th}>Referencia</th></tr>
                  </thead>
                  <tbody>
                    {auditLog.length === 0 && (
                      <tr><td style={td} colSpan={5}><span style={{ color: C.textMuted }}>Sin actividad registrada todavía.</span></td></tr>
                    )}
                    {auditLog.map(a => (
                      <tr key={a.id}>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: C.textMedium }}>{new Date(a.createdAt).toLocaleString('es-CO')}</td>
                        <td style={td}>{a.performedByEmail ?? '—'}</td>
                        <td style={td}>{ACTION_LABEL[a.action]}</td>
                        <td style={td}>{a.entityType === 'catalog' ? 'Código CUPS' : 'Mapeo'}</td>
                        <td style={{ ...td, fontFamily: FONT_MONO }}>{a.entityRef}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Catálogo CUPS ── */}
          <div style={{ maxWidth: 1140, margin: '0 auto 24px', background: C.white, borderRadius: 16, border: `1px solid ${C.borderLight}`, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardList size={18} color={C.gold} />
              <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Catálogo (código → nombre oficial)</h3>
            </div>

            <form onSubmit={handleAddCatalogEntry} style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 12, alignItems: 'end', background: C.bgSecondary }}>
              <div>
                <label style={labelStyle}>Código CUPS</label>
                <input style={{ ...inputStyle, fontFamily: FONT_MONO }} value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Ej. 890250" required />
              </div>
              <div>
                <label style={labelStyle}>Nombre oficial del procedimiento</label>
                <input style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej. Consulta de primera vez por especialista en..." required />
              </div>
              <button type="submit" disabled={catalogSaving} style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', padding: '10px 18px', borderRadius: 8, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: catalogSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: catalogSaving ? 0.7 : 1 }}>
                <Plus size={14} /> {catalogSaving ? 'Guardando…' : 'Agregar'}
              </button>
              {catalogError && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, color: C.red, fontSize: 12 }}>
                  <AlertTriangle size={13} /> {catalogError}
                </div>
              )}
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Código</th><th style={th}>Nombre oficial</th><th style={th}></th></tr></thead>
                <tbody>
                  {catalog.length === 0 && (
                    <tr><td style={td} colSpan={3}><span style={{ color: C.textMuted }}>Sin códigos todavía.</span></td></tr>
                  )}
                  {catalog.map(c => (
                    <tr key={c.cupsCode} style={{ opacity: c.isActive ? 1 : 0.55 }}>
                      <td style={{ ...td, fontFamily: FONT_MONO, fontWeight: 700, color: C.gold }}>{c.cupsCode}</td>
                      <td style={td}>{c.procedureName}{!c.isActive && <InactiveBadge />}</td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleToggleCatalogActive(c)} title={c.isActive ? 'Desactivar' : 'Reactivar'} style={iconBtnStyle(c.isActive ? C.goldLight : C.green)}>
                          {c.isActive ? <Ban size={15} /> : <RotateCcw size={15} />}
                        </button>
                        <button onClick={() => handleDeleteCatalogEntry(c)} title="Eliminar" style={iconBtnStyle(C.red)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mapeos ── */}
          <div style={{ maxWidth: 1140, margin: '0 auto', background: C.white, borderRadius: 16, border: `1px solid ${C.borderLight}`, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardList size={18} color={C.gold} />
              <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Mapeos (especialidad + clasificación → CUPS)</h3>
            </div>

            <form onSubmit={handleAddMapping} style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, background: C.bgSecondary }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Especialidad</label>
                  <select style={inputStyle} value={mSpecialty} onChange={e => setMSpecialty(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {categoriaEnum.options.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Grupo</label>
                  <select style={inputStyle} value={mGroup} onChange={e => { setMGroup(e.target.value); setMSubgroup(''); setMCategory(''); setMSubcategory(''); }} required>
                    <option value="">Selecciona...</option>
                    {GRUPOS.map(g => <option key={g.code} value={g.code}>{g.code} — {g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Subgrupo</label>
                  <select style={inputStyle} value={mSubgroup} onChange={e => { setMSubgroup(e.target.value); setMCategory(''); setMSubcategory(''); }} disabled={!mGroup} required>
                    <option value="">{mGroup ? 'Selecciona...' : 'Elige un grupo'}</option>
                    {mSubgrupos.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Categoría</label>
                  <select style={inputStyle} value={mCategory} onChange={e => { setMCategory(e.target.value); setMSubcategory(''); }} disabled={!mSubgroup} required>
                    <option value="">{mSubgroup ? 'Selecciona...' : 'Elige un subgrupo'}</option>
                    {mCategorias.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Subcategoría</label>
                  <select style={inputStyle} value={mSubcategory} onChange={e => setMSubcategory(e.target.value)} disabled={!mCategory} required>
                    <option value="">{mCategory ? 'Selecciona...' : 'Elige una categoría'}</option>
                    {mSubcategorias.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                  </select>
                </div>
              </div>

              {statusCheck && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 12, color: statusCheck.kind === 'warn' ? C.goldLight : C.green }}>
                  {statusCheck.kind === 'warn' ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />} {statusCheck.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Código CUPS (activos del catálogo de arriba)</label>
                  <select style={{ ...inputStyle, fontFamily: FONT_MONO }} value={mCupsCode} onChange={e => setMCupsCode(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {activeCatalog.map(c => <option key={c.cupsCode} value={c.cupsCode}>{c.cupsCode} — {c.procedureName}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={mappingSaving} style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', padding: '10px 18px', borderRadius: 8, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: mappingSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: mappingSaving ? 0.7 : 1 }}>
                  <Plus size={14} /> {mappingSaving ? 'Guardando…' : 'Agregar mapeo'}
                </button>
              </div>
              {mappingError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.red, fontSize: 12, marginTop: 10 }}>
                  <AlertTriangle size={13} /> {mappingError}
                </div>
              )}
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Especialidad</th>
                    <th style={th}>Grupo</th>
                    <th style={th}>Clasificación</th>
                    <th style={th}>CUPS</th>
                    <th style={th}>Procedimiento</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.length === 0 && (
                    <tr><td style={td} colSpan={6}><span style={{ color: C.textMuted }}>Sin mapeos todavía.</span></td></tr>
                  )}
                  {mappings.map(m => (
                    <tr key={m.id} style={{ opacity: m.isActive ? 1 : 0.55 }}>
                      <td style={{ ...td, fontWeight: 600 }}>{m.specialty}{!m.isActive && <InactiveBadge />}</td>
                      <td style={td}>{groupName(m.serviceGroup)}</td>
                      <td style={{ ...td, fontFamily: FONT_MONO, fontSize: 12, color: C.textMedium }}>
                        {m.serviceSubgroup} / {m.serviceCategory} / {m.serviceSubcategory}
                      </td>
                      <td style={{ ...td, fontFamily: FONT_MONO, fontWeight: 700, color: C.gold }}>{m.cupsCode}</td>
                      <td style={td}>{m.procedureName}</td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleToggleMappingActive(m)} title={m.isActive ? 'Desactivar' : 'Reactivar'} style={iconBtnStyle(m.isActive ? C.goldLight : C.green)}>
                          {m.isActive ? <Ban size={15} /> : <RotateCcw size={15} />}
                        </button>
                        <button onClick={() => handleDeleteMapping(m)} title="Eliminar mapeo" style={iconBtnStyle(C.red)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
