import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const PILLARS = [
  {
    icon: '✦',
    title: 'Cumplimiento Normativo',
    desc: 'Acompañamos a tu empresa en el cumplimiento del Sistema de Gestión de Seguridad y Salud en el Trabajo (SGSST), conforme a la normativa vigente.',
  },
  {
    icon: '◈',
    title: 'Medicina Preventiva Ocupacional',
    desc: 'Exámenes y programas diseñados para detectar riesgos a tiempo y proteger la salud de tus colaboradores en cada etapa laboral.',
  },
  {
    icon: '❋',
    title: 'Medicina Bioreguladora',
    desc: 'Un enfoque integral que estimula los procesos naturales de autorregulación del cuerpo, promoviendo el equilibrio y el bienestar.',
  },
  {
    icon: '⟡',
    title: 'Confianza y Profesionalismo',
    desc: 'Atención cercana, ética y rigurosa, tanto para empresas como para pacientes que buscan cuidar su salud.',
  },
]

function PillarCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, boxShadow: '0 28px 60px rgba(92,58,40,0.18)' }}
      style={{
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(92,58,40,0.12)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        cursor: 'default',
        transition: 'box-shadow 0.4s ease',
        boxShadow: '0 8px 32px rgba(92,58,40,0.07)',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(92,58,40,0.12), rgba(156,74,46,0.18))',
          border: '1px solid rgba(92,58,40,0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          fontSize: '1.4rem',
          color: '#5C3A28',
        }}
      >
        {icon}
      </div>
      <h3
        className="font-cormorant"
        style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1B1C1C', marginBottom: '0.75rem', lineHeight: 1.2 }}
      >
        {title}
      </h3>
      <p
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', lineHeight: 1.8, color: '#5E5E5E', fontWeight: 300 }}
      >
        {desc}
      </p>
    </motion.div>
  )
}

export default function About() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      id="sobre-nosotros"
      style={{ background: '#FFFFFF', padding: '9rem 1.5rem' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div ref={ref} style={{ marginBottom: '5rem', maxWidth: '680px' }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.72rem',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: '#5C3A28',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#5C3A28,#9C4A2E)' }} />
            Nuestro Enfoque
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-cormorant"
            style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 300, lineHeight: 1.05, color: '#1B1C1C', marginBottom: '1.5rem' }}
          >
            Medicina con
            <br />
            <em style={{ fontStyle: 'italic', color: '#5C3A28' }}>Calidez Humana</em>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', lineHeight: 1.85, color: '#5E5E5E', fontWeight: 300 }}
          >
            Nuestro consultorio acompaña tanto a empresas como a pacientes individuales —
            combinando el rigor de la medicina laboral y ocupacional con un enfoque integral
            de bienestar a través de la medicina bioreguladora.
          </motion.p>
        </div>

        {/* Pillar Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {PILLARS.map((p, i) => (
            <PillarCard key={p.title} {...p} delay={i * 0.1} />
          ))}
        </div>

        {/* Decorative horizontal rule with gold accent */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: '5rem',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(92,58,40,0.25), transparent)',
            transformOrigin: 'left',
          }}
        />

        {/* Stats row */}
        <div
          style={{
            marginTop: '4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '2rem',
            textAlign: 'center',
          }}
        >
          {[
            { number: '+500', label: 'Exámenes Realizados' },
            { number: 'SGSST', label: 'Cumplimiento Normativo' },
            { number: '5★', label: 'Calificación de Pacientes' },
            { number: '100%', label: 'Atención Personalizada' },
          ].map(({ number, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.7 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="font-cormorant brand-text-gradient"
                style={{ fontSize: '3rem', fontWeight: 600, lineHeight: 1, marginBottom: '0.5rem' }}
              >
                {number}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
