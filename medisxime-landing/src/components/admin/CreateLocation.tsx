import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import './MainDashboard.css';
import { AdminSidebar } from './AdminSidebar';

const C = { gold: '#5C3A28', goldLight: '#9C4A2E', bg: '#FFFBF5', bgPanel: '#F5EDE1', bgSecondary: '#F5EDE1', white: '#FFFFFF', text: '#3D2B1F', textBrown: '#7A6452', textMedium: '#7A6452', textMuted: '#B0A08C', border: '#E6D9C7', borderLight: '#E6D9C7' };
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif';
const FONT_INTER = '"Inter", Inter, system-ui, sans-serif';

export const CreateLocation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <AdminSidebar active="infraestructura" isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />

      <div className="main-content">
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 600, color: C.gold, margin: 0 }}>MedisXime</h2>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Sedes</p>
                <h1 style={{ fontFamily: FONT_BODONI, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Creación de Sedes</h1>
              </div>
            </div>
            <div style={{ maxWidth: 800, padding: 32, background: C.white, borderRadius: 16, border: `1px solid ${C.border}` }}>
              <p style={{ color: C.textMedium }}>Formulario de creación de sedes (en construcción).</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

