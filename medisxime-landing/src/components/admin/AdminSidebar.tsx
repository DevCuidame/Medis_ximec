import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Building2, Briefcase,
  BadgePercent, DollarSign, CreditCard, LogOut, ChevronDown, ChevronRight,
} from 'lucide-react'

// ─── Design tokens (paleta Dra. Ximena Correa) ────────────────────────────────
const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  bgPanel: '#F5EDE1', white: '#FFFFFF',
  textBrown: '#7A6452', textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
}
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif'
const FONT_INTER  = '"Inter", Inter, system-ui, sans-serif'

export type AdminNavKey =
  | 'dashboard' | 'usuarios' | 'calendario'
  | 'infraestructura' | 'servicios' | 'descuentos' | 'finanzas' | 'planes'

interface NavEntry {
  key: AdminNavKey
  icon: React.ComponentType<{ size?: number | string; color?: string; strokeWidth?: number | string; style?: React.CSSProperties }>
  label: string
  route?: string   // sin route = expandible (Infraestructura)
}

const NAV: NavEntry[] = [
  { key: 'dashboard',       icon: LayoutDashboard, label: 'Dashboard',       route: '/admin/dashboard' },
  { key: 'usuarios',        icon: Users,           label: 'Usuarios',        route: '/admin/users' },
  { key: 'calendario',      icon: CalendarDays,    label: 'Calendario',      route: '/admin/classes' },
  { key: 'infraestructura', icon: Building2,       label: 'Infraestructura' },
  { key: 'servicios',       icon: Briefcase,       label: 'Servicios',       route: '/admin/services/create' },
  { key: 'descuentos',      icon: BadgePercent,    label: 'Descuentos',      route: '/admin/discounts' },
  { key: 'finanzas',        icon: DollarSign,      label: 'Finanzas',        route: '/admin/finances' },
  { key: 'planes',          icon: CreditCard,      label: 'Planes',          route: '/admin/memberships' },
]

const INFRA_SUBITEMS = [
  { label: 'Sedes',    route: '/admin/services/locations' },
  { label: 'Espacios', route: '/admin/services/rooms' },
]

interface AdminSidebarProps {
  active?: AdminNavKey
  isMobileOpen?: boolean
  onMobileClose?: () => void
  actionSlot?: React.ReactNode
}

export function AdminSidebar({ active, isMobileOpen = false, onMobileClose, actionSlot }: AdminSidebarProps) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<AdminNavKey | null>(null)
  const [hoveredSub, setHoveredSub] = useState<string | null>(null)
  const [infraExpanded, setInfraExpanded] = useState(active === 'infraestructura')

  const go = (route: string) => { onMobileClose?.(); navigate(route) }
  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  return (
    <>
      <style>{`
        .admin-sidebar-overlay { display: none; }
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0; bottom: 0; left: 0;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-sidebar-overlay.open {
            display: block; position: fixed; inset: 0;
            background: rgba(0,0,0,0.4); z-index: 49;
          }
        }
      `}</style>
      <div className={`admin-sidebar-overlay ${isMobileOpen ? 'open' : ''}`} onClick={onMobileClose} />
      <aside
        className={`admin-sidebar ${isMobileOpen ? 'open' : ''}`}
        style={{ width: 240, flexShrink: 0, background: C.bgPanel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', height: '100vh' }}
      >
        {/* ── Logo ── */}
        <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 46, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FONT_BODONI, fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.white }}>XC</span>
            </div>
            <div>
              <div style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MedisXime</div>
              <div style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Consultorio Admin</div>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: '16px 10px' }}>
          <span style={{ fontFamily: FONT_INTER, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 10px', display: 'block', marginBottom: 6 }}>Menú Principal</span>
          {NAV.map(item => {
            const Icon = item.icon
            const isActive = active === item.key
            const isHovered = hovered === item.key
            const isInfra = item.key === 'infraestructura'
            return (
              <div key={item.key}>
                <button
                  onClick={() => (isInfra ? setInfraExpanded(v => !v) : go(item.route!))}
                  onMouseEnter={() => setHovered(item.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                    background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(92,58,40,0.07)' : 'transparent',
                    borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                    borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                    transition: 'background 0.18s ease', cursor: 'pointer',
                  }}
                >
                  <Icon size={16} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: isActive ? C.white : isHovered ? C.gold : C.textBrown, transition: 'color 0.18s ease' }}>
                    {item.label}
                  </span>
                  {isInfra && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      {infraExpanded
                        ? <ChevronDown size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />
                        : <ChevronRight size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />}
                    </span>
                  )}
                </button>
                {isInfra && infraExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 34, marginTop: 4, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 8 }}>
                    {INFRA_SUBITEMS.map(sub => (
                      <span
                        key={sub.label}
                        onClick={() => go(sub.route)}
                        onMouseEnter={() => setHoveredSub(sub.label)}
                        onMouseLeave={() => setHoveredSub(null)}
                        style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: hoveredSub === sub.label ? C.gold : C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.18s ease' }}
                      >
                        {sub.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* ── Action slot (p.ej. botón "Nuevo Usuario") ── */}
        {actionSlot && <div style={{ padding: '12px 16px' }}>{actionSlot}</div>}

        {/* ── Footer ── */}
        <div style={{ padding: '10px 10px 20px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium }}>
            <LogOut size={16} strokeWidth={2} />
            <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
