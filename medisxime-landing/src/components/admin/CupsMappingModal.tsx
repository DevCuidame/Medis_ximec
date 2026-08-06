// ============================================================
// apps/frontend/src/components/admin/CupsMappingModal.tsx
// Modal: crear un mapeo CUPS sin salir del Catálogo de Servicios.
// Reutiliza los mismos endpoints del módulo Catálogo CUPS
// (GET /services/cups-catalog, POST /services/cups-mappings) en vez
// de duplicar pantallas o lógica nueva.
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, X } from 'lucide-react';
import { GRUPOS } from '../../lib/serviciosCatalogo';

const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  bg: '#FFFBF5', bgSecondary: '#F5EDE1',
  white: '#FFFFFF', text: '#3D2B1F', textBrown: '#7A6452',
  textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7', red: '#EF4444',
};
const FONT_SERIF = '"Cormorant Garamond", Georgia, serif';
const FONT_SANS = '"Inter", Inter, system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

interface CupsCatalogEntry { cupsCode: string; procedureName: string; isActive: boolean }

const authHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
});

const MAX_RESULTS = 50;

interface Props {
  specialty: string;
  serviceGroup: string;
  serviceSubgroup: string;
  serviceCategory: string;
  serviceSubcategory: string;
  onClose: () => void;
  onCreated: () => void;
}

export const CupsMappingModal: React.FC<Props> = ({
  specialty, serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, onClose, onCreated,
}) => {
  const [catalog, setCatalog] = useState<CupsCatalogEntry[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/services/cups-catalog', { headers: authHeaders() })
      .then(r => r.json())
      .then(j => {
        if (!j.success) { setLoadError(j.error ?? 'No se pudo cargar el catálogo CUPS.'); return; }
        setCatalog(j.data.catalog);
      })
      .catch(() => setLoadError('Error de conexión al cargar el catálogo CUPS.'))
      .finally(() => setLoadingCatalog(false));
  }, []);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter(c => c.isActive && (c.cupsCode.toLowerCase().includes(q) || c.procedureName.toLowerCase().includes(q)))
      .slice(0, MAX_RESULTS);
  }, [catalog, search]);

  const handleSelect = async (cupsCode: string) => {
    setSaveError(null);
    setSavingCode(cupsCode);
    try {
      const res = await fetch('/api/services/cups-mappings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ specialty, serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode }),
      });
      const json = await res.json();
      if (!json.success) { setSaveError(json.error ?? 'No se pudo crear el mapeo.'); return; }
      onCreated();
    } catch {
      setSaveError('Error de conexión al crear el mapeo.');
    } finally {
      setSavingCode(null);
    }
  };

  const groupName = GRUPOS.find(g => g.code === serviceGroup)?.name ?? serviceGroup;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(61,43,31,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 640, maxHeight: '85vh', background: C.white, borderRadius: 20, boxShadow: '0 24px 64px rgba(92,58,40,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT_SANS }}
      >
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Crear mapeo CUPS</h3>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.textMedium, fontFamily: FONT_MONO }}>
              {specialty} · {groupName} · {serviceSubgroup} / {serviceCategory} / {serviceSubcategory}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.borderLight}`, background: C.bgSecondary }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o nombre del procedimiento..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, outline: 'none', fontFamily: FONT_SANS, background: C.white }}
            />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: C.textMuted }}>
            {loadingCatalog ? 'Cargando catálogo CUPS…' : `${catalog.filter(c => c.isActive).length} códigos activos disponibles.`}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {loadError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.red, fontSize: 12, padding: '12px 12px' }}>
              <AlertTriangle size={13} /> {loadError}
            </div>
          )}
          {!loadError && search.trim() === '' && (
            <p style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: C.textMuted }}>
              Escribe un código o nombre para buscar entre el catálogo CUPS.
            </p>
          )}
          {!loadError && search.trim() !== '' && results.length === 0 && !loadingCatalog && (
            <p style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: C.textMuted }}>
              Sin resultados para "{search}".
            </p>
          )}
          {results.map(c => (
            <button
              key={c.cupsCode}
              type="button"
              onClick={() => handleSelect(c.cupsCode)}
              disabled={savingCode !== null}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent',
                cursor: savingCode !== null ? 'not-allowed' : 'pointer', opacity: savingCode && savingCode !== c.cupsCode ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.bgSecondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.gold, fontSize: 13, flexShrink: 0 }}>
                {savingCode === c.cupsCode ? '…' : c.cupsCode}
              </span>
              <span style={{ fontSize: 13, color: C.text }}>{c.procedureName}</span>
            </button>
          ))}
        </div>

        {saveError && (
          <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 6, color: C.red, fontSize: 12 }}>
            <AlertTriangle size={13} /> {saveError}
          </div>
        )}
      </div>
    </div>
  );
};
