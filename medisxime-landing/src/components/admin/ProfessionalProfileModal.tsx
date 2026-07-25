    import React, { useEffect, useRef, useState } from 'react'
import {
  X, Edit2, Check, Phone, Mail, AtSign, Star,
  Calendar, ShieldCheck, AlertCircle, Trash2, Save, XCircle, Clock, Plus, Eye, EyeOff
} from 'lucide-react'

const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E', goldPale: '#D4B896',
  bg: '#FFFBF5', bgPanel: '#F5EDE1', bgSecondary: '#F5EDE1',
  white: '#FFFFFF', text: '#3D2B1F', textBrown: '#7A6452',
  textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
}
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif'
const FONT_INTER  = '"Inter", Inter, system-ui, sans-serif'

const DISCIPLINES = [
  'Medicina Bioreguladora', 'Salud Ocupacional', 'Medicina Laboral',
  'Consultoría en SG-SST', 'Salud en el Trabajo', 'Valoración Médica',
]

const ID_TYPES = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Cédula de Extranjería',
  'Pasaporte',
  'RUC',
  'Otro'
]

const DIAS = [
  { code: 1, label: 'L', name: 'Lunes' },
  { code: 2, label: 'M', name: 'Martes' },
  { code: 3, label: 'X', name: 'Miércoles' },
  { code: 4, label: 'J', name: 'Jueves' },
  { code: 5, label: 'V', name: 'Viernes' },
  { code: 6, label: 'S', name: 'Sábado' },
  { code: 0, label: 'D', name: 'Domingo' },
]

const STATUS_OPTIONS = [
  { value: 'available',  label: 'Disponible',    color: '#22c55e' },
  { value: 'in_session', label: 'En Sesión',     color: '#f97316' },
  { value: 'offline',    label: 'No Disponible', color: '#94a3b8' },
] as const

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=600'

export interface Professional {
  id: string
  email: string
  firstName: string
  secondName?: string | null
  lastName: string
  secondLastName?: string | null
  phone?: string
  bio?: string
  specialties: string[]
  instagramUrl?: string
  avatarUrl?: string
  status?: 'available' | 'in_session' | 'offline'
  isActive: boolean
  isVerified: boolean
  avgScore?: number
  totalReviews?: number
  createdAt: string
  role?: 'USER' | 'PROFESSIONAL' | 'COMPANY' | 'ADMIN'
  idType?: string
  idNumber?: string
  professionalLicense?: string | null
  professionalType?: 'dependiente' | 'independiente'
  schedule?: { dayOfWeek: number; startTime: string; endTime: string }[]
}

interface EditForm {
  firstName: string
  lastName: string
  secondName: string
  secondLastName: string
  companyName: string
  legalRepresentative: string
  idType: string
  idNumber: string
  email: string
  phone: string
  address: string
  bio: string
  specialties: string[]
  instagramUrl: string
  avatarUrl: string
  status: 'available' | 'in_session' | 'offline'
  isVerified: boolean
  isActive: boolean
  password: string
  confirmPassword: string
  professionalType: 'dependiente' | 'independiente'
  schedule: { dayOfWeek: number; startTime: string; endTime: string }[]
  professionalLicense: string
  sisproUser: string
  sisproPassword: string
}

interface Props {
  pro: Professional
  onClose: () => void
  onUpdated: (updated: Professional) => void
  onDeleted: (id: string) => void
  initialMode?: 'view' | 'edit'
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoItem({ icon: Icon, label, value, link }: { icon: React.ElementType, label: string, value: string, link?: string }) {
  return (
    <div style={{ background: C.bgPanel, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <Icon size={13} color={C.gold} strokeWidth={2} />
        <span style={{ fontFamily: FONT_INTER, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>{label}</span>
      </div>
      {link
        ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_INTER, fontSize: 13, color: C.gold, textDecoration: 'none', wordBreak: 'break-all' as const }}>{value}</a>
        : <p style={{ fontFamily: FONT_INTER, fontSize: 13, color: C.textBrown, margin: 0, wordBreak: 'break-all' as const }}>{value}</p>
      }
    </div>
  )
}

function ToggleBtn({ on, onChange, labelOn, labelOff }: { on: boolean, onChange: (v: boolean) => void, labelOn: string, labelOff: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: '100%', padding: '11px 14px',
        background: on ? 'rgba(92,58,40,0.09)' : C.bgPanel,
        border: `1.5px solid ${on ? C.gold : C.border}`,
        borderRadius: 10, cursor: 'pointer',
        fontFamily: FONT_INTER, fontSize: 13, fontWeight: 600,
        color: on ? C.gold : C.textMedium,
        display: 'flex', alignItems: 'center', gap: 7,
        transition: 'all 0.15s ease',
      }}
    >
      {on
        ? <Check size={14} color={C.gold} strokeWidth={2.5} />
        : <XCircle size={14} color={C.textMuted} strokeWidth={2} />
      }
      {on ? labelOn : labelOff}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfessionalProfileModal({ pro, onClose, onUpdated, onDeleted, initialMode = 'view' }: Props) {
  const [mode, setMode]               = useState<'view' | 'edit'>(initialMode)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const specialties = Array.isArray(pro.specialties) ? pro.specialties : []
  const isProfessional = pro.role === 'PROFESSIONAL'

  const isCompany = pro.role === 'COMPANY'

  const [form, setForm] = useState<EditForm>({
    firstName:   pro.firstName || '',
    lastName:    pro.lastName || '',
    secondName:  isCompany ? '' : pro.secondName ?? '',
    secondLastName: isCompany ? '' : pro.secondLastName ?? '',
    companyName: isCompany ? pro.firstName || '' : '',
    legalRepresentative: isCompany ? pro.lastName || '' : '',
    idType:      pro.idType || ID_TYPES[0],
    idNumber:    pro.idNumber || '',
    email:       pro.email,
    phone:       pro.phone ?? '',
    address:     '',
    bio:         pro.bio ?? '',
    specialties: [...specialties],
    instagramUrl: pro.instagramUrl ?? '',
    avatarUrl:   pro.avatarUrl ?? '',
    status:      pro.status ?? 'offline',
    isVerified:  pro.isVerified,
    isActive:    pro.isActive,
    password:    '',
    confirmPassword: '',
    professionalType: pro.professionalType ?? 'dependiente',
    schedule:    pro.schedule ? [...pro.schedule] : [],
    professionalLicense: pro.professionalLicense ?? '',
    sisproUser:  '',
    sisproPassword: '',
  })

  const [showSisproPassword, setShowSisproPassword] = useState(false)
  const canHaveAdminDetails = pro.role === 'PROFESSIONAL' || pro.role === 'ADMIN'

  useEffect(() => {
    if (!canHaveAdminDetails) return
    let cancelled = false
    fetch(`/api/professionals/${pro.id}/admin-details`, { headers: authHeaders() })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return
        const details = data.data?.details
        if (!details) return
        setForm(f => ({
          ...f,
          address:        details.address ?? '',
          sisproUser:     details.sisproUser ?? '',
          sisproPassword: details.sisproPassword ?? '',
        }))
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pro.id])

  useEffect(() => {
    if (!isProfessional) return
    let cancelled = false
    fetch(`/api/professionals/${pro.id}/schedule`, { headers: authHeaders() })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return
        const slots = data.data?.slots
        if (!Array.isArray(slots)) return
        setForm(f => ({ ...f, schedule: slots }))
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pro.id])

  const [customIdType, setCustomIdType] = useState(() => {
    if (pro.idType && !ID_TYPES.includes(pro.idType)) return pro.idType
    return ''
  })
  
  // Custom states for new schedule slots
  const [newSlotDay, setNewSlotDay]       = useState<number>(1)
  const [newSlotStart, setNewSlotStart]   = useState('')
  const [newSlotEnd, setNewSlotEnd]       = useState('')

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const clearErr = (k: string) =>
    setErrors(e => { const n = { ...e }; delete n[k]; return n })

  const handleAvatarFile = (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors(e => ({ ...e, avatarUrl: 'Selecciona una imagen válida' }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      set('avatarUrl', result)
      clearErr('avatarUrl')
    }
    reader.onerror = () => {
      setErrors(e => ({ ...e, avatarUrl: 'No se pudo leer la imagen' }))
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (isCompany) {
      if (!form.companyName.trim()) e.companyName = 'Requerido'
      if (!form.legalRepresentative.trim()) e.legalRepresentative = 'Requerido'
    } else {
      if (!form.firstName.trim()) e.firstName = 'Requerido'
      if (!form.lastName.trim())  e.lastName  = 'Requerido'
    }
    if (!form.idNumber.trim()) e.idNumber = 'Requerido'
    if (form.idType === 'Otro' && !customIdType.trim()) e.idType = 'Requerido'
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (form.password || form.confirmPassword) {
      if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
      if (form.password !== form.confirmPassword) e.confirmPassword = 'No coinciden'
    }
    return e
  }

  const save = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    setError(null)
    try {
      const { password, confirmPassword, companyName, legalRepresentative, address, sisproUser, sisproPassword, ...restForm } = form
      const basePayload = {
        email:        restForm.email.toLowerCase().trim(),
        firstName:    isCompany ? companyName.trim() : restForm.firstName.trim(),
        lastName:     isCompany ? legalRepresentative.trim() : restForm.lastName.trim(),
        secondName:      isCompany ? undefined : restForm.secondName.trim()     || undefined,
        secondLastName:  isCompany ? undefined : restForm.secondLastName.trim() || undefined,
        idType:       restForm.idType === 'Otro' ? customIdType.trim() : restForm.idType,
        idNumber:     restForm.idNumber.trim(),
        phone:        restForm.phone.trim()        || undefined,
        address:      address.trim()               || undefined,
        bio:          restForm.bio.trim()          || undefined,
        instagramUrl: restForm.instagramUrl.trim() || undefined,
        avatarUrl:    restForm.avatarUrl.trim() === '' ? '' : restForm.avatarUrl.trim(),
        isVerified:   restForm.isVerified,
        isActive:     restForm.isActive,
        password:     password ? password : undefined,
      }

      const res = await fetch(isProfessional ? `/api/professionals/${pro.id}` : `/api/users/${pro.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(isProfessional ? {
          ...basePayload,
          specialties: form.specialties.length ? form.specialties : undefined,
          professionalType: form.professionalType,
          professionalLicense: restForm.professionalLicense.trim() || undefined,
          sisproUser:          sisproUser.trim()     || undefined,
          sisproPassword:      sisproPassword.trim() || undefined,
        } : basePayload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar cambios')

      if (isProfessional && form.status !== pro.status) {
        const statusRes = await fetch(`/api/professionals/${pro.id}/status`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: form.status }),
        })
        if (!statusRes.ok) {
          const sd = await statusRes.json()
          throw new Error(sd.error ?? 'Error al actualizar estado')
        }
      }

      if (isProfessional) {
        const scheduleSlots = form.professionalType === 'independiente' ? form.schedule : []
        const scheduleRes = await fetch(`/api/professionals/${pro.id}/schedule`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ slots: scheduleSlots }),
        })
        if (!scheduleRes.ok) {
          const sd = await scheduleRes.json()
          throw new Error(sd.error ?? 'Error al actualizar el horario')
        }
      }

      const updated: Professional = {
        ...pro,
        ...restForm,
        firstName:    isCompany ? companyName.trim() : restForm.firstName.trim(),
        lastName:     isCompany ? legalRepresentative.trim() : restForm.lastName.trim(),
        secondName:      isCompany ? pro.secondName : (restForm.secondName.trim() || undefined),
        secondLastName:  isCompany ? pro.secondLastName : (restForm.secondLastName.trim() || undefined),
        idType:       restForm.idType === 'Otro' ? customIdType.trim() : restForm.idType,
        idNumber:     restForm.idNumber.trim(),
        phone:        restForm.phone.trim()        || undefined,
        bio:          restForm.bio.trim()          || undefined,
        instagramUrl: restForm.instagramUrl.trim() || undefined,
        avatarUrl:    restForm.avatarUrl.trim()    || undefined,
        professionalType: form.professionalType,
        schedule:     form.professionalType === 'independiente' ? form.schedule : [],
        professionalLicense: restForm.professionalLicense.trim() || undefined,
      }
      onUpdated(updated)
      setMode('view')
      setForm(f => ({ ...f, password: '', confirmPassword: '' }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteProf = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = isProfessional ? `/api/professionals/${pro.id}` : `/api/users/${pro.id}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al eliminar')
      }
      onDeleted(pro.id)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const cancelEdit = () => { setMode('view'); setErrors({}); setError(null) }

  const img         = mode === 'edit' ? (form.avatarUrl || PLACEHOLDER_IMG) : (pro.avatarUrl || PLACEHOLDER_IMG)
  const name        = `${pro.firstName} ${pro.lastName}`
  const statusInfo  = isProfessional ? (STATUS_OPTIONS.find(s => s.value === pro.status) ?? STATUS_OPTIONS[2]) : null
  const joinedDate  = new Date(pro.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Style helpers ──────────────────────────────────────────────────────────
  const INPUT = (err?: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: '#FAFAF9', border: `1.5px solid ${err ? '#ef4444' : C.border}`,
    borderRadius: 10, padding: '11px 14px',
    fontFamily: FONT_INTER, fontSize: 14, color: C.text, outline: 'none',
    transition: 'border-color 0.2s ease',
  })
  const LABEL: React.CSSProperties = {
    fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown,
    letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }
  const ERR: React.CSSProperties = { fontFamily: FONT_INTER, fontSize: 11, color: '#ef4444', marginTop: 5 }

  return (
    <>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,6,0.55)', backdropFilter: 'blur(5px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      >
        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: C.white, borderRadius: 22, width: '100%', maxWidth: 600, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.28)', animation: 'modalIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}
        >

          {/* ══════════════════════════════════════════ VIEW MODE ══ */}
          {mode === 'view' && (
            <>
              {/* Hero */}
              <div style={{ position: 'relative', height: 230, flexShrink: 0, overflow: 'hidden' }}>
                <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,8,6,0.88) 0%, rgba(10,8,6,0.18) 55%, transparent 100%)' }} />

                {/* Status badge */}
                {isProfessional && statusInfo && (
                  <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 9999, padding: '6px 13px' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusInfo.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.white }}>{statusInfo.label}</span>
                  </div>
                )}

                {/* Edit button */}
                <button
                  onClick={() => setMode('edit')}
                  style={{ position: 'absolute', top: 14, right: 54, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.white }}
                >
                  <Edit2 size={12} strokeWidth={2.5} /> Editar
                </button>

                {/* Close */}
                <button
                  onClick={onClose}
                  style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 9, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white }}
                >
                  <X size={15} />
                </button>

                {/* Name */}
                <div style={{ position: 'absolute', bottom: 18, left: 24, right: 24 }}>
                  <h2 style={{ fontFamily: FONT_BODONI, fontSize: 30, fontWeight: 700, color: C.white, margin: '0 0 5px', lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {pro.isVerified && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ShieldCheck size={13} color={C.goldPale} />
                        <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.goldPale, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Verificada</span>
                      </div>
                    )}
                    {!pro.isActive && (
                      <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: '#fca5a5', letterSpacing: '0.1em', textTransform: 'uppercase' }}>· Inactiva</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>

                {/* Rating */}
                {isProfessional && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={16} color={C.gold} fill={n <= Math.round(pro.avgScore ?? 0) ? C.gold : 'none'} strokeWidth={1.5} />
                      ))}
                      <span style={{ fontFamily: FONT_INTER, fontSize: 14, color: C.textBrown, marginLeft: 6, fontWeight: 600 }}>
                        {(pro.avgScore ?? 0) > 0 ? (pro.avgScore ?? 0).toFixed(1) : '—'}
                      </span>
                      <span style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textMuted }}>({pro.totalReviews ?? 0} reseñas)</span>
                    </div>
                  </div>
                )}

                {/* Specialties */}
                {isProfessional && specialties.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
                    {specialties.map(tag => (
                      <span key={tag} style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.gold, background: 'rgba(92,58,40,0.09)', border: `1px solid rgba(92,58,40,0.22)`, padding: '5px 14px', borderRadius: 9999, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bio */}
                {pro.bio && (
                  <div style={{ background: C.bgPanel, borderRadius: 12, padding: '16px 18px', marginBottom: 18, borderLeft: `3px solid ${C.goldLight}` }}>
                    <p style={{ fontFamily: FONT_INTER, fontSize: 13, color: C.textBrown, lineHeight: 1.75, margin: 0 }}>{pro.bio}</p>
                  </div>
                )}

                {/* Contact grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                  <InfoItem icon={Mail}     label="Correo"        value={pro.email} />
                  <InfoItem icon={Phone}    label="Teléfono"      value={pro.phone ?? 'No registrado'} />
                  <InfoItem icon={AtSign}   label="Instagram"     value={pro.instagramUrl ?? 'No registrado'} link={pro.instagramUrl} />
                  <InfoItem icon={Calendar} label="Miembro desde" value={joinedDate} />
                </div>

                {/* Account badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9999, background: pro.isVerified ? 'rgba(92,58,40,0.08)' : C.bgSecondary, border: `1px solid ${pro.isVerified ? 'rgba(92,58,40,0.25)' : C.border}` }}>
                    <ShieldCheck size={13} color={pro.isVerified ? C.gold : C.textMuted} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: pro.isVerified ? C.gold : C.textMuted }}>{pro.isVerified ? 'Certificada' : 'Sin certificar'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9999, background: pro.isActive ? 'rgba(34,197,94,0.08)' : '#FFF0F0', border: `1px solid ${pro.isActive ? 'rgba(34,197,94,0.30)' : '#FFCDD2'}` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: pro.isActive ? '#22c55e' : '#ef4444' }} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: pro.isActive ? '#16a34a' : '#D32F2F' }}>{pro.isActive ? 'Activa' : 'Inactiva'}</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{ marginTop: 16, background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', fontFamily: FONT_INTER, fontSize: 13, color: '#D32F2F', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} /> {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px 22px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 12 }}>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'transparent', border: '1.5px solid #FFCDD2', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: '#D32F2F', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12, color: '#D32F2F', fontWeight: 600 }}>¿Confirmar eliminación?</span>
                    <button onClick={deleteProf} disabled={loading} style={{ padding: '8px 14px', background: '#D32F2F', color: C.white, border: 'none', borderRadius: 7, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {loading ? '...' : 'Sí, eliminar'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: '8px 12px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 7, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, cursor: 'pointer' }}>
                      No
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setMode('edit')}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 4px 14px rgba(92,58,40,0.30)` }}
                >
                  <Edit2 size={14} strokeWidth={2.5} /> Editar Perfil
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════ EDIT MODE ══ */}
          {mode === 'edit' && (
            <>
              {/* Header */}
              <div style={{ padding: '22px 26px 18px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 4px' }}>Editando Perfil</p>
                  <h2 style={{ fontFamily: FONT_BODONI, fontSize: 21, fontWeight: 600, color: C.text, margin: 0 }}>{name}</h2>
                </div>
                <button onClick={cancelEdit} style={{ width: 33, height: 33, borderRadius: 9, background: C.bgSecondary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium }}>
                  <X size={15} />
                </button>
              </div>

              {/* Form */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Account Type */}
                  <div>
                    <label style={LABEL}>Tipo de cuenta</label>
                    <input
                      type="text" value={pro.role === 'USER' ? 'Paciente' : pro.role === 'COMPANY' ? 'Empresa' : pro.role === 'ADMIN' ? 'Administrador' : 'Médico Profesional'}
                      disabled
                      style={{ ...INPUT(), background: 'rgba(0,0,0,0.03)', cursor: 'not-allowed', color: C.textMedium }}
                    />
                  </div>

                  {/* Names / Company Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {isCompany ? (
                      <>
                        <div>
                          <label style={LABEL}>Razón Social <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="text" value={form.companyName}
                            onChange={e => { set('companyName', e.target.value); clearErr('companyName') }}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = errors.companyName ? '#ef4444' : C.border)}
                            style={INPUT(errors.companyName)}
                          />
                          {errors.companyName && <p style={ERR}>{errors.companyName}</p>}
                        </div>
                        <div>
                          <label style={LABEL}>Representante Legal <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="text" value={form.legalRepresentative}
                            onChange={e => { set('legalRepresentative', e.target.value); clearErr('legalRepresentative') }}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = errors.legalRepresentative ? '#ef4444' : C.border)}
                            style={INPUT(errors.legalRepresentative)}
                          />
                          {errors.legalRepresentative && <p style={ERR}>{errors.legalRepresentative}</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label style={LABEL}>Nombres <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="text" value={form.firstName}
                            onChange={e => { set('firstName', e.target.value); clearErr('firstName') }}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = errors.firstName ? '#ef4444' : C.border)}
                            style={INPUT(errors.firstName)}
                          />
                          {errors.firstName && <p style={ERR}>{errors.firstName}</p>}
                        </div>
                        <div>
                          <label style={LABEL}>Apellidos <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="text" value={form.lastName}
                            onChange={e => { set('lastName', e.target.value); clearErr('lastName') }}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = errors.lastName ? '#ef4444' : C.border)}
                            style={INPUT(errors.lastName)}
                          />
                          {errors.lastName && <p style={ERR}>{errors.lastName}</p>}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Second Names Grid */}
                  {!isCompany && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={LABEL}>Segundo Nombre</label>
                        <input
                          type="text" value={form.secondName} placeholder="Opcional"
                          onChange={e => set('secondName', e.target.value)}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = C.border)}
                          style={INPUT()}
                        />
                      </div>
                      <div>
                        <label style={LABEL}>Segundo Apellido</label>
                        <input
                          type="text" value={form.secondLastName} placeholder="Opcional"
                          onChange={e => set('secondLastName', e.target.value)}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = C.border)}
                          style={INPUT()}
                        />
                      </div>
                    </div>
                  )}

                  {/* Identity Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={LABEL}>Tipo de Identificación</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <select
                          value={isCompany ? 'NIT' : form.idType}
                          onChange={e => { set('idType', e.target.value); clearErr('idType') }}
                          disabled={isCompany}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = C.border)}
                          style={{
                            ...INPUT(), cursor: isCompany ? 'not-allowed' : 'pointer', appearance: 'none',
                            backgroundImage: isCompany ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: isCompany ? 14 : 36,
                            opacity: isCompany ? 0.7 : 1
                          }}
                        >
                          {isCompany ? <option value="NIT">NIT</option> : ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {form.idType === 'Otro' && !isCompany && (
                          <div>
                            <input
                              type="text" value={customIdType} placeholder="Ej. Registro Civil"
                              onChange={e => { setCustomIdType(e.target.value); clearErr('idType') }}
                              onFocus={e => (e.target.style.borderColor = C.gold)}
                              onBlur={e => (e.target.style.borderColor = errors.idType ? '#ef4444' : C.border)}
                              style={INPUT(errors.idType)}
                            />
                            {errors.idType && <p style={ERR}>{errors.idType}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={LABEL}>Número de Identificación <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text" value={form.idNumber}
                        onChange={e => { set('idNumber', e.target.value); clearErr('idNumber') }}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = errors.idNumber ? '#ef4444' : C.border)}
                        style={INPUT(errors.idNumber)}
                      />
                      {errors.idNumber && <p style={ERR}>{errors.idNumber}</p>}
                    </div>
                  </div>

                  {/* Avatar */}
                  <div>
                    <label style={LABEL}>Imagen de perfil</label>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: 74, height: 74, borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${C.border}`, background: C.bgPanel, flexShrink: 0 }}>
                        <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220, flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: '9px 14px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                          >
                            Subir imagen
                          </button>
                          <button
                            type="button"
                            onClick={() => { set('avatarUrl', ''); clearErr('avatarUrl') }}
                            style={{ padding: '9px 14px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                          >
                            Quitar foto
                          </button>
                        </div>
                        <p style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                          PNG, JPG o WEBP. Se guarda directamente en el perfil.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            handleAvatarFile(e.target.files?.[0])
                            e.currentTarget.value = ''
                          }}
                          style={{ display: 'none' }}
                        />
                      </div>
                    </div>
                    {errors.avatarUrl && <p style={ERR}>{errors.avatarUrl}</p>}
                  </div>

                  {/* Email + Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={LABEL}>Correo <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          type="email" value={form.email}
                          onChange={e => { set('email', e.target.value); clearErr('email') }}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = errors.email ? '#ef4444' : C.border)}
                          style={{ ...INPUT(errors.email), paddingLeft: 36 }}
                        />
                      </div>
                      {errors.email && <p style={ERR}>{errors.email}</p>}
                    </div>
                    <div>
                      <label style={LABEL}>Teléfono</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          type="tel" value={form.phone}
                          onChange={e => set('phone', e.target.value)}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = C.border)}
                          style={{ ...INPUT(), paddingLeft: 36 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dirección */}
                  {!isCompany && (
                    <div>
                      <label style={LABEL}>Dirección Personal</label>
                      <input
                        type="text" value={form.address} placeholder="Ej. Cra 15 # 82-30, Bogotá"
                        onChange={e => set('address', e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = C.border)}
                        style={INPUT()}
                      />
                    </div>
                  )}

                  {/* Bio */}
                  <div>
                    <label style={LABEL}>Biografía</label>
                    <textarea
                      value={form.bio} rows={3}
                      placeholder="Describe su experiencia y estilo de enseñanza..."
                      onChange={e => set('bio', e.target.value)}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = C.border)}
                      style={{ ...INPUT(), resize: 'none', lineHeight: 1.65 }}
                    />
                  </div>

                  {/* Professional Vinculacion & Schedule */}
                  {isProfessional && (
                    <>
                      <div>
                        <label style={LABEL}>Tipo de vinculación</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {(['dependiente', 'independiente'] as const).map(t => (
                            <button
                              key={t} type="button"
                              onClick={() => { set('professionalType', t); if (t === 'dependiente') set('schedule', []) }}
                              style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `2px solid ${form.professionalType === t ? C.gold : C.border}`, background: form.professionalType === t ? 'rgba(92,58,40,0.07)' : 'transparent', color: form.professionalType === t ? C.gold : C.textBrown, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.18s', fontFamily: FONT_INTER }}
                            >
                              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
                                {t === 'dependiente' ? '🏢 Dependiente' : '🕒 Independiente'}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 500, color: form.professionalType === t ? C.gold : C.textMuted, lineHeight: 1.4 }}>
                                {t === 'dependiente' ? 'Disponible cualquier día/hora' : 'Solo en su horario registrado'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {form.professionalType === 'independiente' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Clock size={14} color={C.gold} />
                            <label style={{ ...LABEL, margin: 0 }}>Horario disponible</label>
                          </div>
                          
                          <div style={{ background: 'rgba(92,58,40,0.04)', border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: '14px', marginBottom: 12 }}>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                              {DIAS.map(d => (
                                <button key={d.code} type="button" title={d.name}
                                  onClick={() => setNewSlotDay(d.code)}
                                  style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${newSlotDay === d.code ? C.gold : C.border}`, background: newSlotDay === d.code ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : 'transparent', color: newSlotDay === d.code ? '#fff' : C.textMuted, fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: FONT_INTER }}>
                                  {d.label}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                              <input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)}
                                style={{ ...INPUT(), padding: '10px 12px' }}
                                onFocus={e => (e.target.style.borderColor = C.gold)}
                                onBlur={e => (e.target.style.borderColor = C.border)}
                              />
                              <input type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)}
                                style={{ ...INPUT(), padding: '10px 12px' }}
                                onFocus={e => (e.target.style.borderColor = C.gold)}
                                onBlur={e => (e.target.style.borderColor = C.border)}
                              />
                              <button type="button"
                                onClick={() => {
                                  if (!newSlotStart || !newSlotEnd || newSlotEnd <= newSlotStart) return
                                  set('schedule', [...form.schedule, { dayOfWeek: newSlotDay, startTime: newSlotStart, endTime: newSlotEnd }])
                                  setNewSlotStart(''); setNewSlotEnd('')
                                }}
                                style={{ padding: '10px 14px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT_INTER, whiteSpace: 'nowrap' }}>
                                <Plus size={13} strokeWidth={3} /> Agregar
                              </button>
                            </div>
                          </div>
                          
                          {form.schedule.length === 0 ? (
                            <p style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic', margin: 0 }}>Sin horarios registrados. Agrega al menos un bloque.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {form.schedule
                                .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                                .map((s, i) => {
                                  const day = DIAS.find(d => d.code === s.dayOfWeek)
                                  return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 9, padding: '8px 12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: C.gold, background: 'rgba(92,58,40,0.08)', padding: '3px 8px', borderRadius: 6 }}>{day?.name}</span>
                                        <Clock size={12} color={C.textMuted} />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.startTime} – {s.endTime}</span>
                                      </div>
                                      <button type="button" onClick={() => set('schedule', form.schedule.filter((_, j) => j !== i))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  )
                                })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Specialties */}
                  {isProfessional && (
                    <div>
                      <label style={LABEL}>Especialidades</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {DISCIPLINES.map(d => {
                          const on = form.specialties.includes(d)
                          return (
                            <button
                              key={d}
                              onClick={() => setForm(f => ({ ...f, specialties: on ? f.specialties.filter(x => x !== d) : [...f.specialties, d] }))}
                              style={{ padding: '7px 14px', borderRadius: 9999, border: `1.5px solid ${on ? C.gold : C.border}`, background: on ? 'rgba(92,58,40,0.09)' : 'transparent', fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, color: on ? C.gold : C.textBrown, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                              {on && <Check size={11} strokeWidth={3} />}
                              {d}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Registro Médico + SISPRO */}
                  {isProfessional && (
                    <>
                      <div>
                        <label style={LABEL}>Registro Médico</label>
                        <input
                          type="text" value={form.professionalLicense} placeholder="Ej. RM-123456"
                          onChange={e => set('professionalLicense', e.target.value)}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = C.border)}
                          style={INPUT()}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={LABEL}>Usuario SISPRO</label>
                          <input
                            type="text" value={form.sisproUser} placeholder="Usuario del portal"
                            onChange={e => set('sisproUser', e.target.value)}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = C.border)}
                            style={INPUT()}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label style={LABEL}>Contraseña SISPRO</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showSisproPassword ? 'text' : 'password'} value={form.sisproPassword} placeholder="Clave del portal"
                              onChange={e => set('sisproPassword', e.target.value)}
                              onFocus={e => (e.target.style.borderColor = C.gold)}
                              onBlur={e => (e.target.style.borderColor = C.border)}
                              style={{ ...INPUT(), paddingRight: 42 }}
                              autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShowSisproPassword(v => !v)}
                              style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0 }}>
                              {showSisproPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Instagram */}
                  <div>
                    <label style={LABEL}>Instagram</label>
                    <div style={{ position: 'relative' }}>
                      <AtSign size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type="text" value={form.instagramUrl} placeholder="https://instagram.com/usuario"
                        onChange={e => set('instagramUrl', e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = C.border)}
                        style={{ ...INPUT(), paddingLeft: 36 }}
                      />
                    </div>
                  </div>

                  {/* Status + Toggles */}
                  <div style={{ display: 'grid', gridTemplateColumns: isProfessional ? '1fr 1fr 1fr' : '1fr 1fr', gap: 14 }}>
                    {isProfessional && (
                      <div>
                        <label style={LABEL}>Estado</label>
                        <select
                          value={form.status}
                          onChange={e => set('status', e.target.value as EditForm['status'])}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = C.border)}
                          style={{
                            ...INPUT(), cursor: 'pointer', appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
                          }}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label style={LABEL}>Verificada</label>
                      <ToggleBtn on={form.isVerified} onChange={v => set('isVerified', v)} labelOn="Sí" labelOff="No" />
                    </div>
                    <div>
                      <label style={LABEL}>Activa</label>
                      <ToggleBtn on={form.isActive} onChange={v => set('isActive', v)} labelOn="Sí" labelOff="No" />
                    </div>
                  </div>

                  {/* Password */}
                  {!isProfessional && (
                    <div>
                      <label style={LABEL}>Cambiar contraseña</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <input
                            type="password"
                            value={form.password}
                            placeholder="Nueva contraseña"
                            onChange={e => { set('password', e.target.value); clearErr('password') }}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = errors.password ? '#ef4444' : C.border)}
                            style={INPUT(errors.password)}
                            autoComplete="new-password"
                          />
                          {errors.password && <p style={ERR}>{errors.password}</p>}
                        </div>
                        <div>
                          <input
                            type="password"
                            value={form.confirmPassword}
                            placeholder="Confirmar contraseña"
                            onChange={e => { set('confirmPassword', e.target.value); clearErr('confirmPassword') }}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : C.border)}
                            style={INPUT(errors.confirmPassword)}
                            autoComplete="new-password"
                          />
                          {errors.confirmPassword && <p style={ERR}>{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', fontFamily: FONT_INTER, fontSize: 13, color: '#D32F2F', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={15} /> {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 26px 22px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <button
                  onClick={cancelEdit}
                  style={{ padding: '11px 18px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={save} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', background: loading ? C.border : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 4px 14px rgba(92,58,40,0.30)`, transition: 'all 0.2s ease', minWidth: 170 }}
                >
                  {loading
                    ? <><span style={{ width: 14, height: 14, border: `2px solid rgba(255,255,255,0.4)`, borderTopColor: C.white, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Guardando...</>
                    : <><Save size={14} strokeWidth={2.5} /> Guardar Cambios</>
                  }
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}

