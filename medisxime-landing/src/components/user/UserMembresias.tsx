import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Clock,
  Loader2, ChevronRight, ChevronLeft, X, ShieldCheck,
} from 'lucide-react'
import { DoctorPlansAnim } from './DoctorPlansAnim'

const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  white: '#FFFFFF', bg: '#F5F3F1',
  text: '#3D2B1F', textBrown: '#7A6452',
  textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
  pink: '#5C3A28', pinkLight: '#9C4A2E',
}
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif'
const FONT_INTER  = '"Inter", Inter, system-ui, sans-serif'

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface Plan {
  id: string; name: string; description: string; type: string
  price: number; durationDays: number
  isActive: boolean
}

interface ActiveMembership {
  id: string; membershipId: string; paymentStatus: string
  expiresAt: string | null; startedAt: string
  membership: { name: string; price: number; durationDays: number | null }
}

const CONFIRM_STEPS = ['Resumen', 'Pago']

interface Props { userId?: string }

export const UserMembresias: React.FC<Props> = () => {
  const [plans, setPlans]                 = useState<Plan[]>([])
  const [active, setActive]               = useState<ActiveMembership | null>(null)
  const [loading, setLoading]             = useState(true)
  const [confirmPlan, setConfirmPlan]     = useState<Plan | null>(null)
  const [step, setStep]                   = useState(0)
  const [direction, setDirection]         = useState(1)
  const [payMethod, setPayMethod]         = useState<'cash' | 'wompi' | null>(null)
  const [purchasing, setPurchasing]       = useState(false)
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    Promise.all([
      fetch('/api/memberships/active', { headers: authH() }).then(r => r.json()),
      fetch('/api/user-memberships/me', { headers: authH() }).then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([plansData, activeData]) => {
      if (plansData.success) setPlans((plansData.data.memberships || []).filter((p: Plan) => p.isActive))
      if (activeData.success && activeData.data?.membership) setActive(activeData.data.membership)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const regularPlans     = plans.filter(p => p.type !== 'inscription')

  const openConfirm = (plan: Plan) => {
    setConfirmPlan(plan); setStep(0); setDirection(1); setPayMethod(null)
  }

  const goTo = (next: number) => { setDirection(next > step ? 1 : -1); setStep(next) }

  const handlePurchase = async () => {
    if (!confirmPlan || !payMethod) return
    setPurchasing(true)
    try {
      const res  = await fetch('/api/user-memberships', {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ membershipId: confirmPlan.id, paymentMethod: payMethod }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al adquirir')
      showToast(payMethod === 'cash'
        ? '✓ Solicitud enviada. El admin confirmará tu pago en efectivo.'
        : '✓ Redirigiendo a Wompi para completar el pago…', true)
      setConfirmPlan(null)
    } catch (e: any) {
      showToast(e.message, false)
    } finally { setPurchasing(false) }
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  }

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 28px' }}>

        {/* Banner */}
        <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 28, background: `linear-gradient(135deg, ${C.gold}15, ${C.goldLight}10)`, border: `1px solid ${C.gold}30`, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT_INTER }}>MedisXime Consultorio</p>
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Planes</h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0, fontStyle: 'italic', fontFamily: FONT_BODONI }}>Accede a nuestros servicios médicos sin límites.</p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <DoctorPlansAnim size={160} color={C.goldLight} />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.textMuted }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando…</span>
          </div>
        ) : (
          <>
            {/* ── PLAN ACTIVO ── */}
            {active && (
              <div style={{ marginBottom: 36, borderRadius: 20, overflow: 'hidden', border: `1.5px solid ${C.gold}40`, boxShadow: '0 8px 32px rgba(92,58,40,0.1)' }}>
                <div style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CreditCard size={16} color="rgba(255,255,255,0.85)" />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Tu plan activo</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.2)', color: C.white }}>✓ Activa</span>
                  </div>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.white, margin: '0 0 10px', lineHeight: 1.1 }}>
                    {active.membership.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Desde: <strong>{fmtDate(active.startedAt)}</strong></span>
                    {active.expiresAt && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Vence: <strong>{fmtDate(active.expiresAt)}</strong></span>}
                  </div>
                </div>
              </div>
            )}

            {/* ── PLANES DISPONIBLES ── */}
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, color: C.text, margin: '0 0 18px' }}>Planes disponibles</h2>

            {regularPlans.filter(p => p.id !== active?.membershipId).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
                <p style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.textMuted, margin: 0 }}>Sin planes disponibles por ahora.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                {regularPlans.filter(p => p.id !== active?.membershipId).map((plan, i) => {
                  return (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      style={{ background: C.white, borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${C.borderLight}`, boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ height: 4, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` }} />
                      <div style={{ padding: '20px 22px', flex: 1 }}>
                        <h3 style={{ fontFamily: FONT_BODONI, fontSize: 19, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>{plan.name}</h3>
                        {plan.description && <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 14px', lineHeight: 1.5 }}>{plan.description}</p>}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                          {plan.durationDays && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, background: 'rgba(94,94,94,0.07)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Clock size={11} /> {plan.durationDays}d
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: '0 22px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 800, color: C.gold }}>{fmtPrice(plan.price)}</span>
                        </div>
                        <button onClick={() => openConfirm(plan)}
                          style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                          Adquirir plan
                        </button>
                      </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Bottom decoration */}
        <div style={{ marginTop: 48, borderRadius: 20, overflow: 'hidden', background: `linear-gradient(135deg, ${C.text} 0%, #2D2B29 100%)`, padding: '32px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: FONT_BODONI, fontSize: 22, color: C.goldLight, margin: '0 0 8px', fontStyle: 'italic' }}>"Tu bienestar es nuestra prioridad."</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>Cada consulta es un paso más hacia tu salud integral. — MedisXime Consultorio</p>
          </div>
        </div>
      </div>

      {/* ── CONFIRM MODAL ── */}
      <AnimatePresence>
        {confirmPlan && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmPlan(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(6px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 22, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.16)', pointerEvents: 'all', overflow: 'hidden' }}>

                {/* Step bar */}
                {(() => {
                  const isInscription = confirmPlan.type === 'inscription'
                  const barColor = isInscription ? C.pink : C.gold
                  const barColorLight = isInscription ? C.pinkLight : C.goldLight
                  return (
                    <>
                      <div style={{ background: `linear-gradient(90deg, ${barColor}, ${barColorLight})`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {CONFIRM_STEPS.map((s, idx) => (
                            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: step >= idx ? C.white : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: step >= idx ? barColor : C.white }}>{idx + 1}</span>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: step >= idx ? C.white : 'rgba(255,255,255,0.6)' }}>{s}</span>
                              {idx < CONFIRM_STEPS.length - 1 && <ChevronRight size={12} color="rgba(255,255,255,0.5)" />}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setConfirmPlan(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.white }}>
                          <X size={14} />
                        </button>
                      </div>

                      {/* Step content */}
                      <div style={{ padding: '24px', minHeight: 200, overflow: 'hidden' }}>
                        <AnimatePresence custom={direction} mode="wait">
                          {step === 0 && (
                            <motion.div key="s0" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
                              {isInscription && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: `${C.pink}10`, marginBottom: 14 }}>
                                  <ShieldCheck size={14} color={C.pink} />
                                  <span style={{ fontSize: 12, color: C.pink, fontWeight: 600 }}>Pago único · sin renovación automática</span>
                                </div>
                              )}
                              <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.4rem', color: C.text, margin: '0 0 6px' }}>{confirmPlan.name}</h3>
                              {confirmPlan.description && <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>{confirmPlan.description}</p>}
                              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                {confirmPlan.durationDays && (
                                  <div style={{ flex: 1, minWidth: 80, padding: '12px 8px', background: `${barColor}08`, borderRadius: 12, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Clock size={16} color={barColor} /></div>
                                    <p style={{ fontFamily: FONT_BODONI, fontSize: 20, color: barColor, margin: '0 0 3px', lineHeight: 1 }}>{confirmPlan.durationDays}</p>
                                    <p style={{ fontSize: 9, color: C.textMuted, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.3 }}>días de vigencia</p>
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 80, padding: '12px 8px', background: `${barColor}08`, borderRadius: 12, textAlign: 'center' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><CreditCard size={16} color={barColor} /></div>
                                  <p style={{ fontFamily: FONT_BODONI, fontSize: 16, color: barColor, margin: '0 0 3px', lineHeight: 1 }}>{fmtPrice(confirmPlan.price)}</p>
                                  <p style={{ fontSize: 9, color: C.textMuted, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>COP</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                          {step === 1 && (
                            <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
                              <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.text, margin: '0 0 14px' }}>Método de pago</h3>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                {([['cash','💵','Efectivo','Paga en el estudio'],['wompi','💳','Wompi','Pago en línea']] as const).map(([v,emoji,label,desc]) => (
                                  <button key={v} onClick={() => setPayMethod(v)}
                                    style={{ padding: '14px', borderRadius: 12, border: `2px solid ${payMethod === v ? barColor : C.borderLight}`, background: payMethod === v ? `${barColor}10` : 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s', fontFamily: FONT_INTER }}>
                                    <div style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: payMethod === v ? barColor : C.text }}>{label}</div>
                                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{desc}</div>
                                  </button>
                                ))}
                              </div>
                              {payMethod && (
                                <div style={{ padding: '10px 14px', borderRadius: 10, background: payMethod === 'cash' ? 'rgba(234,179,8,0.08)' : 'rgba(124,58,237,0.08)', fontSize: 12, color: C.textBrown }}>
                                  {payMethod === 'cash'
                                    ? '🔔 El admin recibirá una notificación. Tu plan quedará activo cuando confirme el pago.'
                                    : '🔗 Serás redirigido a Wompi para completar el pago de forma segura.'}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Footer */}
                      <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
                        <button onClick={() => step === 0 ? setConfirmPlan(null) : goTo(step - 1)}
                          style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <ChevronLeft size={14} /> {step === 0 ? 'Cancelar' : 'Atrás'}
                        </button>
                        {step < CONFIRM_STEPS.length - 1 ? (
                          <button onClick={() => goTo(step + 1)}
                            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${barColor}, ${barColorLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            Continuar <ChevronRight size={14} />
                          </button>
                        ) : (
                          <button onClick={handlePurchase} disabled={!payMethod || purchasing}
                            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: payMethod ? `linear-gradient(135deg, ${barColor}, ${barColorLight})` : C.borderLight, color: payMethod ? C.white : C.textMuted, fontSize: 13, fontWeight: 700, cursor: payMethod && !purchasing ? 'pointer' : 'not-allowed', fontFamily: FONT_INTER, opacity: purchasing ? 0.7 : 1 }}>
                            {purchasing ? 'Procesando…' : `Confirmar · ${fmtPrice(confirmPlan.price)}`}
                          </button>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#16A34A' : '#DC2626', color: C.white, padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', fontFamily: FONT_INTER }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

