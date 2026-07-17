import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Clock, User, X, Loader2, Repeat, CalendarDays } from 'lucide-react'
import { DoctorServicesAnim } from './DoctorServicesAnim'

const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  white: '#FFFFFF', bg: '#F5F3F1',
  text: '#3D2B1F', textBrown: '#7A6452',
  textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
}
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif'
const FONT_INTER  = '"Inter", Inter, system-ui, sans-serif'

const TYPE_COLOR: Record<string, string> = { class: '#5C3A28', open_pole: '#9C4A2E', event: '#C97B5A', workshop: '#9C4A2E', appointment: '#5C3A28' }
const TYPE_LABEL: Record<string, string> = { class: 'Consulta', open_pole: 'Valoración', event: 'Procedimiento', workshop: 'Examen', appointment: 'Consulta' }

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}


function fmtPrice(n: number) {
  return n > 0 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n) : 'Gratuito'
}

function fmtDateShort(d: Date) {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DAY_NAMES_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DAY_ORDER = [1,2,3,4,5,6,0]

interface ServiceGroup {
  key: string; title: string; offerType: string; description: string | null
  location: { name: string } | null; professional: { firstName: string; lastName: string } | null
  timeStart: string | null; timeEnd: string | null; durationMinutes: number; price: number
  firstDate: Date | null; lastDate: Date | null; days: string[]; sessionCount: number; ids: string[]
  disciplineName: string | null
  /** Oferta original — se usa para leer los campos de catálogo (instructions/restrictions/etc.) en el detalle. */
  representative: any
}

function validDate(s: any): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function padTime(h: number, m: number) {
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function groupOffers(offers: any[]): ServiceGroup[] {
  const map = new Map<string, ServiceGroup>()
  for (const o of offers) {
    const d  = validDate(o.scheduledAt)
    const tS = d ? padTime(d.getHours(), d.getMinutes()) : null
    // Los servicios de catálogo (sin scheduledAt) nunca se agrupan entre sí: cada oferta es su propia tarjeta.
    const key = d
      ? [o.title, o.professionalId??'', o.locationId??'', o.roomId??'', tS, o.durationMinutes ?? 0].join('|')
      : `catalog:${o.id}`
    if (!map.has(key)) {
      let tE: string | null = null
      if (d && o.durationMinutes) {
        const eD = new Date(d.getTime() + o.durationMinutes * 60000)
        tE = padTime(eD.getHours(), eD.getMinutes())
      }
      map.set(key, { key, title: o.title ?? '', offerType: o.offerType ?? '', description: o.description ?? null, location: o.location ?? null, professional: o.professional ?? null, timeStart: tS, timeEnd: tE, durationMinutes: o.durationMinutes ?? 0, price: o.price ?? 0, firstDate: d, lastDate: d, days: [], sessionCount: 0, ids: [], disciplineName: o.discipline?.name ?? null, representative: o })
    }
    const g = map.get(key)!
    g.ids.push(o.id)
    g.sessionCount++
    if (d) {
      if (!g.firstDate || d < g.firstDate) g.firstDate = d
      if (!g.lastDate || d > g.lastDate)  g.lastDate = d
    }
  }
  for (const g of map.values()) {
    if (!g.firstDate) continue
    const daySet = new Set(
      offers.filter(o => g.ids.includes(o.id))
            .map((o: any) => validDate(o.scheduledAt)?.getDay())
            .filter((d): d is number => d !== undefined)
    )
    g.days = DAY_ORDER.filter(d => daySet.has(d)).map(d => DAY_NAMES_SHORT[d])
  }
  // Servicios con fecha primero (ordenados por fecha); servicios de catálogo (sin fecha) al final.
  return Array.from(map.values())
    .sort((a, b) => {
      if (a.firstDate && b.firstDate) return a.firstDate.getTime() - b.firstDate.getTime()
      if (a.firstDate && !b.firstDate) return -1
      if (!a.firstDate && b.firstDate) return 1
      return 0
    })
}

interface Props { userId?: string }

export const UserServicios: React.FC<Props> = () => {
  const [offers, setOffers]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds]   = useState<Set<string>>(new Set())
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType] = useState('all')
  const [enrolling, setEnrolling]   = useState<string | null>(null)
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null)
  const [payMethod, setPayMethod] = useState<'cash' | 'wompi'>('cash')
  const [confirmBooking, setConfirmBooking] = useState<{
    ids: string[]; key: string; title: string; sessionCount: number; price: number
    instructions: string | null; restrictions: string | null; risks: string | null; contraindications: string | null
  } | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [bookingError, setBookingError] = useState<string | null>(null)

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => {
    Promise.all([
      fetch('/api/services/offers?limit=200', { headers: authH() }).then(r => r.json()),
      fetch('/api/services/my-requests', { headers: authH() }).then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([offersData, bookingsData]) => {
      if (offersData.success) setOffers((offersData.data.offers || []).filter((o: any) => o.status === 'published'))
      if (bookingsData.success) {
        const requests: any[] = bookingsData.data.requests || []
        setEnrolledIds(new Set(requests.filter((r: any) => r.status === 'approved').map((r: any) => r.offerId)))
        setPendingIds( new Set(requests.filter((r: any) => r.status === 'pending' ).map((r: any) => r.offerId)))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const openConfirm = (g: ServiceGroup) => {
    const parts = (g.title ?? '').split(' — ')
    const s = g.representative ?? {}
    setConfirmBooking({
      ids: g.ids, key: g.key, title: parts[1] || parts[0], sessionCount: g.ids.length, price: g.price,
      instructions: s.instructions ?? null,
      restrictions: s.restrictions ?? null,
      risks: s.risks ?? null,
      contraindications: s.contraindications ?? null,
    })
    setDiscountCode('')
    setBookingError(null)
    setPayMethod('cash')
  }

  const handleEnroll = async (
    ids: string[], groupKey: string,
    opts?: { paymentMethod?: 'cash' | 'wompi'; discountCode?: string }
  ): Promise<boolean> => {
    setEnrolling(groupKey)
    setBookingError(null)
    try {
      const body: Record<string, unknown> = {
        offerIds: ids,
        paymentMethod: opts?.paymentMethod ?? 'cash',
      }
      const code = opts?.discountCode?.trim()
      if (code) body.discountCode = code
      const res = await fetch('/api/services/requests/bulk', {
        method: 'POST', headers: authH(),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al inscribirse')
      const created = data.data?.created ?? ids.length
      if (opts?.paymentMethod === 'wompi') {
        showToast('Redirigiendo a Wompi para completar el pago…', true)
        // TODO: redirect to Wompi checkout URL when integration is ready
      } else {
        showToast(`¡${created} sesión${created !== 1 ? 'es enviadas' : ' enviada'}! El consultorio confirmará tu pago en efectivo.`, true)
      }
      setPendingIds(prev => new Set([...prev, ids[0]]))
      return true
    } catch (e: any) {
      setBookingError(e.message)
      return false
    } finally { setEnrolling(null) }
  }

  const groups = groupOffers(offers)

  const filtered = groups.filter(g => {
    const q = search.toLowerCase()
    const profName = g.professional ? `${g.professional.firstName} ${g.professional.lastName}` : ''
    const matchQ = !q || g.title.toLowerCase().includes(q) || profName.toLowerCase().includes(q)
    const matchT = filterType === 'all' || g.offerType === filterType
    return matchQ && matchT
  })

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT_INTER }}>MedisXime Consultorio</p>
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: 0 }}>Servicios Disponibles</h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0 0' }}>
              {loading ? 'Cargando…' : `${groups.length} servicio${groups.length !== 1 ? 's' : ''} · ${offers.length} sesiones`}
            </p>
          </div>

          {/* Animation */}
          <div style={{ flexShrink: 0, opacity: 0.85 }}>
            <DoctorServicesAnim size={190} color={C.goldLight} />
          </div>
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} color={C.textMuted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar servicio o especialista…"
              style={{ width: '100%', padding: '10px 36px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: FONT_INTER }}
              onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.borderLight}
            />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center' }}><X size={13} /></button>}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {[['all','Todos'],['class','Consultas'],['open_pole','Valoración'],['event','Procedimientos'],['workshop','Exámenes']].map(([v,l]) => (
              <button key={v} onClick={() => setFilterType(v)}
                style={{ padding: '9px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filterType === v ? C.gold : C.borderLight}`, background: filterType === v ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : 'transparent', color: filterType === v ? C.white : C.textBrown, cursor: 'pointer', fontFamily: FONT_INTER }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.textMuted }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando servicios…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
            <p style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.textMuted, margin: '0 0 8px' }}>Sin resultados</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Intenta con otro término o tipo de servicio.</p>
          </div>
        ) : (
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          <AnimatePresence>
            {filtered.map((g, i) => {
              const color    = TYPE_COLOR[g.offerType] ?? C.gold
              const parts    = (g.title ?? '').split(' — ')
              const profName = g.professional ? `${g.professional.firstName} ${g.professional.lastName}` : null
              return (
                <motion.div key={g.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ background: C.white, borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${C.borderLight}`, boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                  <div style={{ padding: '18px 20px', flex: 1 }}>
                    {/* Type badge */}
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color, background: `${color}15`, padding: '3px 9px', borderRadius: 6, display: 'inline-block', marginBottom: 10 }}>
                      {TYPE_LABEL[g.offerType] ?? g.offerType}
                    </span>
                    {/* Title */}
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 2px', lineHeight: 1.2 }}>{parts[1] || parts[0]}</h3>
                    {parts[1] && <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 12px' }}>{parts[0]}</p>}
                    {/* Info rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                      <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Repeat size={12} color={C.gold} />
                        <strong>{g.sessionCount}</strong>&nbsp;sesión{g.sessionCount!==1?'es':''}
                        {g.firstDate && <>&nbsp;· {fmtDateShort(g.firstDate)}{g.sessionCount > 1 && g.lastDate ? ` → ${fmtDateShort(g.lastDate)}` : ''}</>}
                      </span>
                      {g.days.length > 0 && (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CalendarDays size={12} color={C.gold} />
                          {g.days.join(' · ')}
                        </span>
                      )}
                      {g.timeStart ? (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} color={C.gold} /> {g.timeStart} – {g.timeEnd}
                          <span style={{ color: C.textMuted }}>({g.durationMinutes} min)</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} color={C.gold} /> Horario por coordinar con el consultorio
                        </span>
                      )}
                      {g.location?.name && (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={12} color={C.gold} /> {g.location.name}
                        </span>
                      )}
                      {profName && (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={12} color={C.gold} /> {profName}
                        </span>
                      )}
                    </div>
                    {/* Price / enrollment indicator */}
                    {(() => {
                      const isEnrolled  = enrolledIds.has(g.ids[0])
                      const isPending   = pendingIds.has(g.ids[0])
                      return (
                        <div style={{ paddingTop: 12, borderTop: `1px solid ${C.borderLight}` }}>
                          {isEnrolled ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', background: 'rgba(34,197,94,0.1)', padding: '4px 12px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              ✓ Ya inscrito en este servicio
                            </span>
                          ) : isPending ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309', background: 'rgba(234,179,8,0.1)', padding: '4px 12px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              ⏳ Inscripción pendiente de aprobación
                            </span>
                          ) : (
                            <>
                              <span style={{ fontSize: 15, fontWeight: 800, color: C.gold, fontFamily: FONT_BODONI }}>{fmtPrice(g.price)}</span>
                              <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>por sesión</span>
                            </>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  <div style={{ padding: '0 20px 18px' }}>
                    {(() => {
                      const isEnrolled = enrolledIds.has(g.ids[0])
                      const isPending  = pendingIds.has(g.ids[0])

                      if (isEnrolled) {
                        return (
                          <button disabled style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #16A34A', background: 'rgba(34,197,94,0.06)', color: '#16A34A', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', fontFamily: FONT_INTER, opacity: 0.8 }}>
                            ✓ Ya inscrito
                          </button>
                        )
                      }
                      if (isPending) {
                        return (
                          <button disabled style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #B45309', background: 'rgba(234,179,8,0.06)', color: '#B45309', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', fontFamily: FONT_INTER, opacity: 0.8 }}>
                            ⏳ Pendiente de aprobación
                          </button>
                        )
                      }
                      return (
                        <button onClick={() => openConfirm(g)} disabled={enrolling === g.key}
                          style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: enrolling === g.key ? 'not-allowed' : 'pointer', opacity: enrolling === g.key ? 0.7 : 1, fontFamily: FONT_INTER }}>
                          {enrolling === g.key ? 'Enviando…' : 'Solicitar inscripción'}
                        </button>
                      )
                    })()}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Booking confirmation modal */}
      <AnimatePresence>
        {confirmBooking && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmBooking(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(6px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 20, maxWidth: 420, width: '100%', padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', pointerEvents: 'all' }}>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.text, textAlign: 'center', margin: '0 0 6px' }}>
                  Confirmar inscripción
                </h3>
                <p style={{ fontSize: 12, color: C.textMedium, textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
                  <strong>{confirmBooking.title}</strong> · {confirmBooking.sessionCount} sesión{confirmBooking.sessionCount !== 1 ? 'es' : ''}
                </p>

                {/* Price summary */}
                <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '14px 16px', marginBottom: 18, border: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.textMedium }}>
                      {confirmBooking.sessionCount} sesión{confirmBooking.sessionCount !== 1 ? 'es' : ''} ({fmtPrice(confirmBooking.price)} c/u)
                    </span>
                    <span style={{ fontSize: 12, color: C.textMedium }}>{fmtPrice(confirmBooking.sessionCount * confirmBooking.price)}</span>
                  </div>
                  <div style={{ height: 1, background: C.borderLight, margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Total</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.gold, fontFamily: FONT_BODONI }}>
                      {fmtPrice(confirmBooking.sessionCount * confirmBooking.price)}
                    </span>
                  </div>
                </div>

                {/* Textos clínicos del servicio (si existen) */}
                {(confirmBooking.instructions || confirmBooking.restrictions || confirmBooking.risks || confirmBooking.contraindications) && (
                  <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {confirmBooking.instructions && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Instrucciones</p>
                        <p style={{ fontSize: 12, color: C.textMedium, margin: 0, lineHeight: 1.5 }}>{confirmBooking.instructions}</p>
                      </div>
                    )}
                    {confirmBooking.restrictions && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Restricciones</p>
                        <p style={{ fontSize: 12, color: C.textMedium, margin: 0, lineHeight: 1.5 }}>{confirmBooking.restrictions}</p>
                      </div>
                    )}
                    {confirmBooking.risks && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Riesgos</p>
                        <p style={{ fontSize: 12, color: C.textMedium, margin: 0, lineHeight: 1.5 }}>{confirmBooking.risks}</p>
                      </div>
                    )}
                    {confirmBooking.contraindications && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Contraindicaciones</p>
                        <p style={{ fontSize: 12, color: C.textMedium, margin: 0, lineHeight: 1.5 }}>{confirmBooking.contraindications}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Discount code */}
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                  Código de descuento (opcional)
                </label>
                <input
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setBookingError(null) }}
                  placeholder="Ej: SALUD20"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${bookingError ? '#DC2626' : C.borderLight}`, background: C.white, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: FONT_INTER, letterSpacing: '0.05em', marginBottom: 6 }}
                  onFocus={e => { if (!bookingError) e.target.style.borderColor = C.gold }}
                  onBlur={e => { if (!bookingError) e.target.style.borderColor = C.borderLight }}
                />
                <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 14px', lineHeight: 1.5 }}>
                  Si el código es válido, el descuento se aplicará al confirmar la inscripción.
                </p>

                {/* Payment method */}
                <p style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Método de pago</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {(['cash', 'wompi'] as const).map(m => (
                    <button key={m} onClick={() => setPayMethod(m)}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${payMethod === m ? C.gold : C.borderLight}`, background: payMethod === m ? 'rgba(92,58,40,0.06)' : 'transparent', color: payMethod === m ? C.gold : C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                      {m === 'cash' ? '💵 Efectivo' : '💳 Wompi'}
                    </button>
                  ))}
                </div>
                {payMethod === 'cash' && <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 14px', lineHeight: 1.5 }}>Paga en el consultorio. El administrador confirmará tu inscripción.</p>}
                {payMethod === 'wompi' && <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 14px', lineHeight: 1.5 }}>Serás redirigido a Wompi para completar el pago en línea.</p>}

                {/* Error banner (invalid code / server error) */}
                {bookingError && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{bookingError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmBooking(null)}
                    disabled={enrolling === confirmBooking.key}
                    style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: enrolling === confirmBooking.key ? 'not-allowed' : 'pointer', opacity: enrolling === confirmBooking.key ? 0.6 : 1, fontFamily: FONT_INTER }}>
                    Cancelar
                  </button>
                  <button
                    disabled={enrolling === confirmBooking.key}
                    onClick={async () => {
                      const b = confirmBooking
                      const ok = await handleEnroll(b.ids, b.key, { paymentMethod: payMethod, discountCode })
                      if (ok) { setConfirmBooking(null); setDiscountCode('') }
                    }}
                    style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: enrolling === confirmBooking.key ? 'not-allowed' : 'pointer', opacity: enrolling === confirmBooking.key ? 0.7 : 1, fontFamily: FONT_INTER }}>
                    {enrolling === confirmBooking.key ? 'Enviando…' : payMethod === 'wompi' ? '💳 Pagar con Wompi' : '✓ Confirmar inscripción'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#16A34A' : '#DC2626', color: C.white, padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', fontFamily: FONT_INTER }}>
            {toast.ok ? '✓ ' : '✗ '}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}


