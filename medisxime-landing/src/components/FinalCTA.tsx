import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const navigate = useNavigate()

  return (
    <section
      style={{
        position: 'relative',
        padding: '9rem 1.5rem',
        overflow: 'hidden',
        background: '#3D2418',
      }}
    >
      {/* Warm atmospheric background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(92,58,40,0.28) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '0%', left: '0%',
        width: '60%', height: '100%',
        background: 'radial-gradient(ellipse 80% 90% at 0% 50%, rgba(156,74,46,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(92,58,40,0.03) 60px, rgba(92,58,40,0.03) 61px)`,
        pointerEvents: 'none',
      }} />

      {/* Floating orbs */}
      {[
        { size: 350, top: '10%', left: '-5%', delay: 0 },
        { size: 250, top: '50%', right: '0%', delay: 2 },
        { size: 180, bottom: '5%', left: '40%', delay: 1 },
      ].map(({ size, top, left, right, bottom, delay }: any, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0.2, 0.5, 0] }}
          transition={{ duration: 12 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top, left, right, bottom,
            width: size, height: size, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(92,58,40,0.30) 0%, transparent 70%)',
            filter: 'blur(70px)',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        ref={ref}
        style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}
      >
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.35em',
            textTransform: 'uppercase', color: '#D4B896', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          }}
        >
          <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#D4B896,#9C4A2E)' }} />
          Agenda tu Consulta
          <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#9C4A2E,#D4B896)' }} />
        </motion.p>

        {/* Main headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-cormorant"
          style={{
            fontSize: 'clamp(3rem, 7vw, 6.5rem)',
            fontWeight: 300,
            lineHeight: 0.95,
            color: '#FFFFFF',
            marginBottom: '2rem',
            letterSpacing: '-0.02em',
          }}
        >
          Tu bienestar
          <br />
          <em style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, #D4B896, #C97B5A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            y el de tu equipo
          </em>
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '1rem',
            lineHeight: 1.8,
            color: 'rgba(251,249,248,0.60)',
            maxWidth: '550px',
            margin: '0 auto 3rem',
            fontWeight: 300,
          }}
        >
          Da el primer paso hacia una atención médica laboral y bioreguladora de calidad.
          La Dra. Ximena Correa está lista para acompañarte a ti y a tu empresa.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(92,58,40,0.55)' }}
            whileTap={{ scale: 0.97 }}
            className="brand-gradient"
            style={{
              padding: '1.1rem 2.8rem',
              borderRadius: '9999px',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 600,
              boxShadow: '0 10px 40px rgba(92,58,40,0.40)',
              transition: 'box-shadow 0.4s ease',
            }}
          >
            Agendar Cita
          </motion.button>

          <motion.a
            href="#servicios"
            whileHover={{
              scale: 1.05,
              backgroundColor: 'rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(92,58,40,0.20)',
            }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '1.1rem 2.8rem',
              borderRadius: '9999px',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 500,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(212,184,150,0.40)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.4s ease',
            }}
          >
            Conoce los Servicios
          </motion.a>
        </motion.div>

        {/* Decorative gold divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={inView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: '5rem',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(92,58,40,0.40), transparent)',
            transformOrigin: 'center',
          }}
        />

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.7 }}
          style={{
            marginTop: '3rem',
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(1.5rem, 4vw, 4rem)',
            flexWrap: 'wrap',
          }}
        >
          {[
            { icon: '✦', label: 'Primera consulta de valoración' },
            { icon: '◈', label: 'Atención cercana y profesional' },
            { icon: '❋', label: 'Médica certificada en SGSST' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: '#D4B896', fontSize: '0.85rem' }}>{icon}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'rgba(251,249,248,0.45)', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
