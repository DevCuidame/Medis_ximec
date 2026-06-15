import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const SERVICES = [
  {
    title: 'Exámenes de Ingreso Ocupacional',
    level: 'Empresas',
    duration: '30 min',
    description: 'Evaluación médica pre-ocupacional para nuevos colaboradores, garantizando que cada persona inicie su labor en óptimas condiciones de salud.',
    accent: '#D4B896',
    tag: 'Empresas',
    gradient: 'linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)',
  },
  {
    title: 'Exámenes Periódicos y de Retiro',
    level: 'Empresas',
    duration: '30 min',
    description: 'Seguimiento del estado de salud de tus colaboradores durante su vinculación laboral y al finalizar su contrato.',
    accent: '#D4B896',
    tag: 'Empresas',
    gradient: 'linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)',
  },
  {
    title: 'Medicina Laboral',
    level: 'Empresas',
    duration: '45 min',
    description: 'Atención médica especializada en la prevención, diagnóstico y manejo de enfermedades relacionadas con el trabajo.',
    accent: '#D4B896',
    tag: 'Más solicitada',
    gradient: 'linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)',
  },
  {
    title: 'Consultoría en SGSST',
    level: 'Empresas',
    duration: 'Asesoría',
    description: 'Acompañamiento integral en el Sistema de Gestión de Seguridad y Salud en el Trabajo, asegurando el cumplimiento de la normativa vigente.',
    accent: '#D4B896',
    tag: 'Cumplimiento',
    gradient: 'linear-gradient(160deg, #3D2418 0%, #9C4A2E 50%, #2A1810 100%)',
  },
  {
    title: 'Medicina Bioreguladora',
    level: 'Pacientes',
    duration: '45 min',
    description: 'Un enfoque integral que estimula los procesos naturales de autorregulación del cuerpo para promover tu bienestar físico y emocional.',
    accent: '#C97B5A',
    tag: 'Bienestar',
    gradient: 'linear-gradient(160deg, #3D2418 0%, #9C4A2E 50%, #2A1810 100%)',
  },
  {
    title: 'Salud en el Trabajo',
    level: 'Empresas y Equipos',
    duration: 'Programas',
    description: 'Programas de promoción y prevención enfocados en el bienestar físico y mental de los colaboradores en su entorno laboral.',
    accent: '#C97B5A',
    tag: 'Bienestar Laboral',
    gradient: 'linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)',
  },
]

function ClassCard({ title, level, duration, description, accent, tag, gradient, delay }: typeof SERVICES[0] & { delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const navigate = useNavigate()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', cursor: 'pointer' }}
    >
      <motion.div
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: gradient,
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Inner glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 20% 20%, rgba(92,58,40,0.18) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Decorative line */}
        <div style={{
          position: 'absolute', top: '1.75rem', right: '1.75rem',
          width: 40, height: 1,
          background: `linear-gradient(90deg, transparent, ${accent})`,
        }} />

        {/* Tag */}
        <div style={{
          position: 'absolute', top: '1.5rem', left: '1.5rem',
          padding: '0.3rem 0.8rem',
          borderRadius: '9999px',
          background: `rgba(${accent === '#D4B896' ? '212,184,150' : '201,123,90'},0.20)`,
          border: `1px solid ${accent}40`,
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: accent,
          backdropFilter: 'blur(6px)',
        }}>
          {tag}
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              {level}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              {duration}
            </span>
          </div>

          <h3
            className="font-cormorant"
            style={{ fontSize: '2rem', fontWeight: 500, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '0.75rem' }}
          >
            {title}
          </h3>

          <p
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', lineHeight: 1.7, color: 'rgba(251,249,248,0.62)', fontWeight: 300, marginBottom: '1.25rem' }}
          >
            {description}
          </p>

          {/* Hover CTA */}
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{ x: 6 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: accent,
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Agendar
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Classes() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const navigate = useNavigate()

  return (
    <section id="servicios" style={{ background: '#F5EDE1', padding: '9rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div ref={ref} style={{ marginBottom: '4rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem' }}>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.35em',
                textTransform: 'uppercase', color: '#5C3A28', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}
            >
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#5C3A28,#9C4A2E)' }} />
              Nuestros Servicios
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant"
              style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 300, lineHeight: 1.05, color: '#1B1C1C' }}
            >
              Salud Laboral & <em style={{ fontStyle: 'italic', color: '#5C3A28' }}>Bienestar</em>
            </motion.h2>
          </div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            onClick={() => navigate('/login')}
            whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(92,58,40,0.30)' }}
            className="brand-gradient"
            style={{
              padding: '0.85rem 2rem',
              borderRadius: '9999px',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 6px 24px rgba(92,58,40,0.25)',
            }}
          >
            Agendar Cita
          </motion.button>
        </div>

        {/* Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}>
          {SERVICES.map((c, i) => (
            <ClassCard key={c.title} {...c} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  )
}
