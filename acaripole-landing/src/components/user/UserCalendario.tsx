import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, Clock, MapPin } from 'lucide-react'
import { DoctorGreetingAnim } from '../professional/DoctorGreetingAnim'

const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  white: '#FFFFFF', bg: '#FFFBF5',
  text: '#3D2B1F', textBrown: '#7A6452',
  textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
}
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif'
const FONT_INTER  = 'Inter, system-ui, sans-serif'
const DAY_SHORT   = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const pad   = first.getDay() === 0 ? 6 : first.getDay() - 1
  const cells: (Date | null)[] = Array(pad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const MOTIVATIONAL = [
  {
    img: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800',
    quote: 'El bienestar no es solo la ausencia de enfermedad, es un estado de equilibrio físico y mental.',
    author: '— MedisXime Consultorio',
  },
  {
    img: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800',
    quote: 'Tu salud es una inversión, no un gasto. Dedica tiempo a cuidarte cada día.',
    author: '— Equipo Médico',
  },
  {
    img: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800',
    quote: 'La prevención es el mejor tratamiento. Asiste a tus chequeos regularmente.',
    author: '— MedisXime Consultorio',
  },
  {
    img: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800',
    quote: 'El cuidado compasivo y la medicina moderna van de la mano para tu recuperación.',
    author: '— Salud Integral',
  },
]

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

function getMondayOf(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0)
  const day = r.getDay(); r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  return r
}

function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function isSameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate() }

function fmtTime(s: string, dur?: number) {
  const d = new Date(s)
  const p = (x: Date) => `${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`
  if (!dur) return p(d)
  const e = new Date(d.getTime() + dur * 60000)
  return `${p(d)} – ${p(e)}`
}

interface Props { userId?: string }

export const UserCalendario: React.FC<Props> = () => {
  const [bookings, setBookings]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState<'week' | 'month'>('week')
  const [weekStart, setWeekStart]   = useState(() => getMondayOf(new Date()))
  const [monthDate, setMonthDate]   = useState(() => new Date())
  const today = new Date(); today.setHours(0,0,0,0)

  useEffect(() => {
    fetch('/api/services/my-sessions', { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) setBookings(d.data.sessions || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd   = weekDays[6]
  const weekTitle = (() => {
    const f = (d: Date) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}`
    return `${f(weekStart)} – ${f(weekEnd)} ${weekEnd.getFullYear()}`
  })()

  const offersForDay = (day: Date) =>
    bookings
      .filter(b => b.scheduledAt && isSameDay(new Date(b.scheduledAt), day))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 28px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '1.5rem',
              background: 'linear-gradient(135deg, rgba(92,58,40,0.04), rgba(59,130,246,0.04))',
              padding: '1.5rem', borderRadius: '1.25rem',
              border: `1px solid ${C.borderLight}`
            }}
          >
            <DoctorGreetingAnim size={160} color={C.goldLight} textTop="Estas son tus" textBottom="consultas" />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT_INTER }}>Mi Portal</p>
              <h1 style={{ fontFamily: FONT_BODONI, fontSize: 40, fontWeight: 700, color: C.text, margin: 0 }}>Mi Calendario</h1>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0 0' }}>
                {loading ? 'Cargando…' : `${bookings.length} consulta${bookings.length !== 1 ? 's' : ''} confirmada${bookings.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </motion.div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Week / Month toggle */}
            <div style={{ display: 'flex', background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 10, overflow: 'hidden' }}>
              {(['week','month'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '9px 18px', background: view === v ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: view === v ? C.white : C.textBrown, transition: 'all 0.2s', fontFamily: FONT_INTER }}>
                  {v === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '6px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <button
                onClick={() => view === 'week'
                  ? setWeekStart(d => addDays(d, -7))
                  : setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textBrown }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5EDE1'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, minWidth: 190, textAlign: 'center', fontFamily: FONT_INTER }}>
                {view === 'week' ? weekTitle : `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`}
              </span>
              <button
                onClick={() => view === 'week'
                  ? setWeekStart(d => addDays(d, 7))
                  : setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textBrown }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5EDE1'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => { setWeekStart(getMondayOf(new Date())); setMonthDate(new Date()) }}
                style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${C.borderLight}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: FONT_INTER }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(92,58,40,0.06)'; e.currentTarget.style.borderColor = C.gold }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.borderLight }}>
                Hoy
              </button>
            </div>
          </div>
        </div>

        {/* ── CALENDAR ── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '100px 0', color: C.textMuted }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Cargando tu calendario…</span>
          </div>
        ) : (
          <>
            {/* ── MONTH VIEW ── */}
            {view === 'month' && (
              <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, padding: 20, marginBottom: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, minWidth: 700 }}>
                  {/* Day headers */}
                  {DAY_SHORT.map(h => (
                    <div key={h} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.1em', paddingBottom: 10, borderBottom: `1px solid ${C.borderLight}` }}>{h}</div>
                  ))}
                  {/* Day cells */}
                  {getMonthGrid(monthDate.getFullYear(), monthDate.getMonth()).map((day, idx) => {
                    if (!day) return <div key={idx} style={{ minHeight: 90, background: '#F9F7F5', borderRadius: 10, opacity: 0.4 }} />
                    const isToday   = isSameDay(day, today)
                    const dayItems  = offersForDay(day)
                    return (
                      <div key={idx} style={{ minHeight: 90, background: C.white, borderTop: `1px solid ${isToday ? C.gold : C.borderLight}`, borderRight: `1px solid ${isToday ? C.gold : C.borderLight}`, borderBottom: `1px solid ${isToday ? C.gold : C.borderLight}`, borderLeft: isToday ? `3px solid ${C.gold}` : `1px solid ${C.borderLight}`, borderRadius: 10, padding: '6px 7px', cursor: 'default', transition: 'border-color 0.15s', boxShadow: isToday ? '0 4px 12px rgba(92,58,40,0.1)' : 'none' }}>
                        {/* Number */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? C.gold : 'transparent', color: isToday ? C.white : C.text }}>
                            {day.getDate()}
                          </span>
                        </div>
                        {/* Pills */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {dayItems.slice(0, 3).map(b => {
                            const parts = (b.offerTitle ?? 'Servicio').split(' — ')
                            return (
                              <div key={b.id} title={`${b.offerTitle} · ${fmtTime(b.scheduledAt, b.durationMinutes)}`}
                                style={{ fontSize: 9, fontWeight: 600, background: 'rgba(92,58,40,0.08)', borderLeft: `2.5px solid ${C.gold}`, color: C.textBrown, padding: '2px 5px', borderRadius: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {parts[1] || parts[0]}
                              </div>
                            )
                          })}
                          {dayItems.length > 3 && (
                            <div style={{ fontSize: 8, fontWeight: 700, color: C.textMuted, paddingLeft: 4 }}>+{dayItems.length - 3} más</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── WEEK VIEW ── */}
            {view === 'week' && <div style={{ overflowX: 'auto', marginBottom: 48 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 14, minWidth: 900 }}>
                {weekDays.map((day, di) => {
                  const isToday   = isSameDay(day, today)
                  const dayItems  = offersForDay(day)
                  const hasClass  = dayItems.length > 0
                  return (
                    <div key={di}>
                      {/* Day header */}
                      <div style={{ textAlign: 'center', marginBottom: 14, padding: '12px 8px', borderRadius: 12, background: isToday ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : C.white, boxShadow: isToday ? `0 4px 16px rgba(92,58,40,0.25)` : '0 1px 4px rgba(0,0,0,0.04)', border: isToday ? 'none' : `1px solid ${C.borderLight}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: isToday ? 'rgba(255,255,255,0.8)' : C.textMuted, marginBottom: 4 }}>
                          {DAY_SHORT[di]}
                        </div>
                        <div style={{ fontFamily: FONT_BODONI, fontSize: 30, fontWeight: 700, color: isToday ? C.white : C.text, lineHeight: 1 }}>
                          {day.getDate()}
                        </div>
                        {hasClass && !isToday && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, margin: '6px auto 0' }} />
                        )}
                      </div>

                      {/* Class cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 140 }}>
                        {dayItems.length === 0 ? (
                          <div style={{ border: `1.5px dashed ${C.borderLight}`, borderRadius: 12, padding: '40px 8px', textAlign: 'center', background: 'rgba(255,255,255,0.5)' }}>
                            <span style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>Libre</span>
                          </div>
                        ) : dayItems.map(b => {
                          const parts = (b.offerTitle ?? 'Servicio').split(' — ')
                          return (
                            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              style={{ background: C.white, borderTop: `1.5px solid ${C.borderLight}`, borderRight: `1.5px solid ${C.borderLight}`, borderBottom: `1.5px solid ${C.borderLight}`, borderLeft: `5px solid ${C.gold}`, borderRadius: 12, padding: '14px 12px', boxShadow: '0 4px 16px rgba(92,58,40,0.07)' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={10} /> {fmtTime(b.scheduledAt, b.durationMinutes)}
                              </div>
                              <div style={{ fontFamily: FONT_BODONI, fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.25, marginBottom: 6 }}>
                                {parts[1] || parts[0]}
                              </div>
                              {parts[1] && (
                                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>{parts[0]}</div>
                              )}
                              {b.locationName && (
                                <span style={{ fontSize: 10, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <MapPin size={9} color={C.goldLight} />{b.locationName}
                                </span>
                              )}
                              <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(34,197,94,0.08)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confirmada</span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>}

            {/* ── MOTIVATIONAL SECTION ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ height: 1, flex: 1, background: C.borderLight }} />
                <p style={{ fontFamily: FONT_BODONI, fontSize: 13, color: C.textMuted, fontStyle: 'italic', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Inspiración Médica</p>
                <div style={{ height: 1, flex: 1, background: C.borderLight }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                {MOTIVATIONAL.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                    style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', position: 'relative', cursor: 'default' }}>
                    {/* Image */}
                    <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                      <img src={item.img} alt="medical inspiration"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
                    </div>
                    {/* Quote */}
                    <div style={{ background: C.white, padding: '18px 20px' }}>
                      <div style={{ width: 28, height: 3, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`, borderRadius: 2, marginBottom: 12 }} />
                      <p style={{ fontFamily: FONT_BODONI, fontSize: 14, fontStyle: 'italic', color: C.text, lineHeight: 1.65, margin: '0 0 10px' }}>
                        "{item.quote}"
                      </p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, margin: 0, letterSpacing: '0.06em' }}>{item.author}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
