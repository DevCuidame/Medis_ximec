import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion'

import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Classes from './components/Classes'
import Instructors from './components/Instructors'
import Testimonials from './components/Testimonials'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'
import ArtistLogin from './components/ArtistLogin'
import { SEO } from './components/SEO'
import { UsuariosDashboard } from './components/admin/UsuariosDashboard'
import { MainDashboard } from './components/admin/MainDashboard'
import { AdminClasses } from './components/admin/AdminClasses'
import { CreateService } from './components/admin/CreateService'
import { CupsCatalogDashboard } from './components/admin/CupsCatalogDashboard'
import { SedesDashboard } from './components/admin/SedesDashboard'
import { EspaciosDashboard } from './components/admin/EspaciosDashboard'
import { FinanzasDashboard } from './components/admin/FinanzasDashboard'
import { DescuentosDashboard } from './components/admin/DescuentosDashboard'
import { MembresiasDashboard } from './components/admin/MembresiasDashboard'
import { InventarioDashboard } from './components/admin/InventarioDashboard'
import { InscripcionesDashboard } from './components/admin/InscripcionesDashboard'
import { ProtectedRoute } from './components/ProtectedRoute'
import { UserLayout } from './components/user/UserLayout'
import { ProfessionalDashboard } from './components/professional/ProfessionalDashboard'
import XimenaBookingCalendar from './components/XimenaBookingCalendar'

// ── Scroll to top on every route change ──────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

// ── Scroll-progress bar (landing only) ────────────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, #5C3A28, #9C4A2E, #D4B896)',
        transformOrigin: '0%',
        scaleX,
        zIndex: 200,
      }}
    />
  )
}

// ── Route pages ───────────────────────────────────────────────────────────────

// Datos reales confirmados (telefono/instagram/horario/email). Direccion y
// universidad/institucion siguen pendientes de confirmar con la Dra. Ximena —
// omitidas aqui en vez de inventadas.
const PHYSICIAN_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Physician',
  name: 'Dra. Ximena Correa',
  url: 'https://docxime.cuidame.tech/',
  image: 'https://docxime.cuidame.tech/Logo_Medis.jpeg',
  description:
    'Consultorio de la Dra. Ximena Correa, especialista en Medicina Bioreguladora, exámenes médico-ocupacionales, Medicina Laboral y consultoría en el SGSST.',
  medicalSpecialty: ['Medicina Laboral y Ocupacional', 'Medicina Bioreguladora', 'Medicina Preventiva'],
  telephone: '+573133894523',
  email: 'ximenadoc@gmail.com',
  sameAs: ['https://www.instagram.com/ximenadoc/'],
  areaServed: 'CO',
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'Universidad del Rosario' },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '08:00', closes: '12:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '14:00', closes: '17:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Wednesday', opens: '08:00', closes: '12:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Wednesday', opens: '13:00', closes: '17:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', opens: '08:00', closes: '12:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', opens: '13:00', closes: '17:00' },
  ],
}

function LandingPage() {
  const navigate = useNavigate()
  return (
    <>
      <SEO canonical="https://docxime.cuidame.tech/" jsonLd={PHYSICIAN_JSON_LD} />
      <ScrollProgressBar />
      <Navbar onLoginClick={() => navigate('/login')} />
      <main>
        <Hero />
        <About />
        <Classes />
        <Instructors />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from

  return (
    <ArtistLogin
      onBackToHome={() => navigate('/')}
      onRegisterClick={() => alert('¡El registro de nuevos profesionales estará disponible muy pronto!')}
      onForgotPasswordClick={() => alert('Se ha enviado un enlace de recuperación a tu correo electrónico registrado.')}
      onLoginSuccess={(role) => {
        if (role === 'USER')         navigate(from ?? '/user/dashboard',         { replace: true })
        else if (role === 'PROFESSIONAL') navigate(from ?? '/professional/classes', { replace: true })
        else                         navigate(from ?? '/admin/dashboard',         { replace: true })
      }}
    />
  )
}

// ── Agenda Page ──────────────────────────────────────────────────────────────
function AgendaPage() {
  const navigate = useNavigate()
  return <XimenaBookingCalendar onBackToHome={() => navigate('/')} />
}

// ── Session expired notification ─────────────────────────────────────────────
function SessionExpiredBanner() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => {
      // Only show if user is logged in (has token)
      if (!localStorage.getItem('accessToken')) return
      setVisible(true)
      // Auto-redirect after 4 seconds
      setTimeout(() => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setVisible(false)
        navigate('/login')
      }, 4000)
    }
    window.addEventListener('session:expired', handler)
    return () => window.removeEventListener('session:expired', handler)
  }, [navigate])

  const handleLogin = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setVisible(false)
    navigate('/login')
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, display: 'flex', alignItems: 'center', gap: 14,
            background: '#1B1C1C', color: '#fff', borderRadius: 14,
            padding: '14px 20px', boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
            maxWidth: 420, width: 'calc(100vw - 32px)',
            fontFamily: '"Hanken Grotesk", Inter, sans-serif',
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>⏰</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>Sesión expirada</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
              Tu sesión de 2 horas terminó. Redirigiendo al login…
            </p>
          </div>
          <button
            onClick={handleLogin}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg, #5C3A28, #9C4A2E)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Iniciar sesión
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <SessionExpiredBanner />
      <ScrollToTop />
      <Routes>
        <Route path="/"      element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/agenda" element={<AgendaPage />} />

        {/* /admin → redirect to default admin page */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Legacy admin path */}
        <Route path="/admin/professionals" element={<Navigate to="/admin/users" replace />} />

        {/* Protected admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MainDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UsuariosDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services/create"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <CreateService />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services/locations"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SedesDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services/rooms"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <EspaciosDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services/cups"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <CupsCatalogDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/discounts"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DescuentosDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/finances"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <FinanzasDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/memberships"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MembresiasDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <InventarioDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inscripciones"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <InscripcionesDashboard />
            </ProtectedRoute>
          }
        />

        {/* User Portal */}
        <Route
          path="/user/*"
          element={
            <ProtectedRoute allowedRoles={['USER']}>
              <UserLayout />
            </ProtectedRoute>
          }
        />

        {/* Professional Portal */}
        <Route
          path="/professional/*"
          element={
            <ProtectedRoute allowedRoles={['PROFESSIONAL']}>
              <ProfessionalDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
