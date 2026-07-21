# Ximena Booking Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `DianaBookingCalendar.tsx` into `medisxime-landing` as `XimenaBookingCalendar.tsx`, re-themed to Ximena's café/crema/terracota palette, and wire it into the existing `/agenda` route.

**Architecture:** Single self-contained React component, no new dependencies, no backend changes (CuidameDoc's booking API is already generic per `professional_id`). One config constant (`PROFESSIONAL_ID = 2`) and a palette/font object at the top of the file drive the whole re-theme — nearly all colors in the component already flow through references to that object, so most of the retheming is a small, localized edit, not a line-by-line rewrite.

**Tech Stack:** React 18 + TypeScript, Vite, Framer Motion (already a dependency, same as `medisdiana-landing`).

## Global Constraints

- `medisxime-landing/tsconfig.app.json` has `noUnusedLocals: true` and `noUnusedParameters: true` — any unused import/variable is a hard build failure.
- No changes to CuidameDoc (backend or frontend) — Dirección A is already generic per `professional_id`, confirmed working for `professional_id=12` (Diana) in production.
- Do not replicate the source file's hardcoded "Diana doesn't work Sundays" assumption (see Task 1, Step 4) — Ximena's real schedule is unknown, and the backend's `/slots/:date` endpoint already correctly reflects whatever schedule is configured for her, with no need to special-case any day of the week client-side.
- Palette tokens (verified against `medisXime/docs/convenciones.md` and `medisxime-landing/src/index.css`): primary `#5C3A28`, secondary/accent `#9C4A2E`, accent-light `#D4B896`, bg-main `#FFFBF5`, bg-secondary `#F5EDE1`, text-primary `#3D2B1F`, text-secondary `#7A6452`, text-muted `#B0A08C`, border `#E6D9C7`. Fonts: Cormorant Garamond (headings), Inter (body).

---

### Task 1: `XimenaBookingCalendar.tsx` component

**Files:**
- Create: `medisxime-landing/src/components/XimenaBookingCalendar.tsx`
- Reference (read-only, do not modify): `C:\Users\julia\Downloads\Opieka\diana\medis\medisdiana-landing\src\components\DianaBookingCalendar.tsx`

**Interfaces:**
- Produces: `export default function XimenaBookingCalendar({ onBackToHome }: { onBackToHome?: () => void })` — same single-prop contract as the original, consumed by Task 2.

- [ ] **Step 1: Copy the reference file verbatim**

Copy `C:\Users\julia\Downloads\Opieka\diana\medis\medisdiana-landing\src\components\DianaBookingCalendar.tsx` to `medisxime-landing/src/components/XimenaBookingCalendar.tsx` byte-for-byte (964 lines). Do not alter anything in this step — the following steps make every intended change as a separate, exact edit.

- [ ] **Step 2: Rename the component and its config constant**

Replace:
```ts
// ─── Config ────────────────────────────────────────────────────────────────
const DOC_API = 'https://doc-api.cuidame.tech/api'
const DIANA_PROFESSIONAL_ID = 12
```
with:
```ts
// ─── Config ────────────────────────────────────────────────────────────────
const DOC_API = 'https://doc-api.cuidame.tech/api'
const PROFESSIONAL_ID = 2
```

Replace (component definition, near the bottom of the "Component" section):
```ts
// ─── Component ─────────────────────────────────────────────────────────────
interface DianaBookingCalendarProps {
  onBackToHome?: () => void
}

export default function DianaBookingCalendar({ onBackToHome }: DianaBookingCalendarProps) {
```
with:
```ts
// ─── Component ─────────────────────────────────────────────────────────────
interface XimenaBookingCalendarProps {
  onBackToHome?: () => void
}

export default function XimenaBookingCalendar({ onBackToHome }: XimenaBookingCalendarProps) {
```

Then replace every remaining occurrence of `DIANA_PROFESSIONAL_ID` with `PROFESSIONAL_ID` (5 more usages — search for the literal string `DIANA_PROFESSIONAL_ID` in the file after the two edits above and replace each remaining hit):
- In the "Load professional services once" `useEffect`: `` `${DOC_API}/booking/professionals/${DIANA_PROFESSIONAL_ID}/services` ``
- In `preloadMonth`: `` `${DOC_API}/booking/professionals/${DIANA_PROFESSIONAL_ID}/slots/${dateStr}` ``
- In `loadSlots`: `` `${DOC_API}/booking/professionals/${DIANA_PROFESSIONAL_ID}/slots/${dateStr}` ``
- In `handleSubmit`'s new-patient branch: `professional_id: DIANA_PROFESSIONAL_ID,`
- In `handleSubmit`'s existing-patient branch: `professional_id: DIANA_PROFESSIONAL_ID,`

After this step, grep the file for `DIANA_PROFESSIONAL_ID` and `DianaBookingCalendar` — both must return zero matches.

- [ ] **Step 3: Re-theme the palette and font**

Replace:
```ts
// ─── Palette ───────────────────────────────────────────────────────────────
const C = {
  primary: '#1D4ED8',
  primaryLight: '#2563EB',
  primaryMuted: '#EFF6FF',
  accent: '#0EA5E9',
  text: '#0F172A',
  textMuted: '#475569',
  textFaint: '#94A3B8',
  border: '#E2E8F0',
  white: '#FFFFFF',
  bg: '#F5F7FA',
  success: '#16A34A',
  successBg: '#F0FDF4',
  danger: '#DC2626',
}
const FONT = '"Hanken Grotesk", Inter, system-ui, sans-serif'
```
with:
```ts
// ─── Palette ───────────────────────────────────────────────────────────────
const C = {
  primary: '#5C3A28',
  primaryLight: '#9C4A2E',
  primaryMuted: '#F5EDE1',
  accent: '#D4B896',
  text: '#3D2B1F',
  textMuted: '#7A6452',
  textFaint: '#B0A08C',
  border: '#E6D9C7',
  white: '#FFFFFF',
  bg: '#FFFBF5',
  success: '#16A34A',
  successBg: '#F0FDF4',
  danger: '#DC2626',
}
const FONT = 'Inter, system-ui, sans-serif'
const HEADING_FONT = "'Cormorant Garamond', serif"
```

(`success`/`successBg`/`danger` are intentionally unchanged — green/red status colors are universal, not brand-specific, and `#16A34A`/`#DC2626` don't clash with the warm café palette.)

Every other reference to `C.primary`, `C.text`, `C.textMuted`, etc. throughout the file automatically picks up the new values — do not hunt for and edit those individually, they're already indirected through this one object.

- [ ] **Step 4: Remove the hardcoded "no Sundays" assumption**

This appears in two places — a data-preload optimization and the calendar day-cell rendering. Both must be removed; leaving either one would still incorrectly greyed-out/skip Sundays regardless of Ximena's real configured schedule.

Replace (inside `preloadMonth`):
```ts
    for (let d = 1; d <= daysCount; d++) {
      const date = new Date(year, month, d)
      // Skip past days and Sundays (Diana doesn't work Sundays — adjust if needed)
      if (date < today || date.getDay() === 0) continue
```
with:
```ts
    for (let d = 1; d <= daysCount; d++) {
      const date = new Date(year, month, d)
      // Skip past days only — which days are workable is entirely decided by
      // the real schedule the backend returns, never assumed client-side.
      if (date < today) continue
```

Replace (inside the calendar-grid day-cell render, `Array.from({ length: daysInMonth }).map(...)`):
```ts
                    const day = i + 1
                    const dateStr = toLocalDateStr(new Date(viewYear, viewMonth, day))
                    const past = isPast(day)
                    const isToday = dateStr === todayStr
                    const isSunday = new Date(viewYear, viewMonth, day).getDay() === 0
                    const hasSlots = availability[dateStr] === true
                    const noSlots = availability[dateStr] === false
                    const isSelected = dateStr === selectedDate

                    return (
                      <button
                        key={day}
                        onClick={() => !past && !isSunday && handleDayClick(day)}
                        disabled={past || isSunday}
                        style={{
                          aspectRatio: '1',
                          borderRadius: 10,
                          border: isSelected ? `2px solid ${C.primary}` : isToday ? `2px solid ${C.accent}` : '2px solid transparent',
                          background: isSelected ? C.primary : hasSlots ? C.primaryMuted : C.white,
                          cursor: past || isSunday ? 'default' : 'pointer',
                          opacity: past || isSunday ? 0.25 : 1,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                          fontSize: '0.88rem', fontWeight: isToday || isSelected ? 700 : 500,
                          color: isSelected ? C.white : isToday ? C.primary : past ? C.textFaint : C.text,
                          transition: 'all 0.15s',
                          padding: '4px 2px',
                          minHeight: 44,
                        }}
                      >
                        {day}
                        {hasSlots && !isSelected && (
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: C.primary, display: 'block',
                          }} />
                        )}
                        {noSlots && !past && !isSunday && (
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: C.border, display: 'block',
                          }} />
                        )}
                      </button>
                    )
```
with:
```ts
                    const day = i + 1
                    const dateStr = toLocalDateStr(new Date(viewYear, viewMonth, day))
                    const past = isPast(day)
                    const isToday = dateStr === todayStr
                    const hasSlots = availability[dateStr] === true
                    const noSlots = availability[dateStr] === false
                    const isSelected = dateStr === selectedDate

                    return (
                      <button
                        key={day}
                        onClick={() => !past && handleDayClick(day)}
                        disabled={past}
                        style={{
                          aspectRatio: '1',
                          borderRadius: 10,
                          border: isSelected ? `2px solid ${C.primary}` : isToday ? `2px solid ${C.accent}` : '2px solid transparent',
                          background: isSelected ? C.primary : hasSlots ? C.primaryMuted : C.white,
                          cursor: past ? 'default' : 'pointer',
                          opacity: past ? 0.25 : 1,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                          fontSize: '0.88rem', fontWeight: isToday || isSelected ? 700 : 500,
                          color: isSelected ? C.white : isToday ? C.primary : past ? C.textFaint : C.text,
                          transition: 'all 0.15s',
                          padding: '4px 2px',
                          minHeight: 44,
                        }}
                      >
                        {day}
                        {hasSlots && !isSelected && (
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: C.primary, display: 'block',
                          }} />
                        )}
                        {noSlots && !past && (
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: C.border, display: 'block',
                          }} />
                        )}
                      </button>
                    )
```

(A day with no real availability still renders disabled-looking via `noSlots`/`hasSlots` — driven by the real `availability` map from the backend — so Sundays with no configured schedule will still look unavailable; they just aren't hardcoded that way regardless of what the backend actually says.)

- [ ] **Step 5: Update doctor name and specialty copy**

Replace each of the following exact occurrences (search for the old text, it appears once per location):

1. Header, doctor name under "Agendar cita con":
   Replace `Dra. Diana Cristina Medina Camargo` (inside the `<p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: C.text }}>` in the header) with `Dra. Ximena Correa`. Also add `fontFamily: HEADING_FONT` to that `<p>`'s style object (alongside `color: C.text`).

2. Service-selection subtitle:
   Replace `Selecciona el servicio con el que deseas agendar tu cita con la Dra. Diana.` with `Selecciona el servicio con el que deseas agendar tu cita con la Dra. Ximena.`

3. Booking summary card, "Médico" field (in the form step):
   Replace:
   ```tsx
                  <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 600, color: C.text }}>
                    Dra. Diana Cristina Medina Camargo
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: C.textMuted }}>Especialista en Medicina Familiar</p>
   ```
   with:
   ```tsx
                  <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 600, color: C.text }}>
                    Dra. Ximena Correa
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: C.textMuted }}>Especialista en Salud Ocupacional</p>
   ```

4. Existing-patient document hint:
   Replace `Ingresa el número de cédula con el que te registraste con la Dra. Diana.` with `Ingresa el número de cédula con el que te registraste con la Dra. Ximena.`

5. Success message:
   Replace `Tu solicitud fue enviada a la Dra. Diana Cristina Medina Camargo. Queda pendiente de confirmación.` with `Tu solicitud fue enviada a la Dra. Ximena Correa. Queda pendiente de confirmación.`

6. Success summary card, "Médico" row:
   Replace `<Row label="Médico" value="Dra. Diana Cristina Medina Camargo" />` with `<Row label="Médico" value="Dra. Ximena Correa" />`

After this step, grep the file for `Diana` and `Medina` — both must return zero matches.

- [ ] **Step 6: Apply the heading font and fix the remaining hardcoded hex values outside `C`**

Add `fontFamily: HEADING_FONT` to every `<h1>` and `<h2>` element's style object in the file (there are 6: the service-selection title, the calendar title, the calendar month/year `<h2>`, the slots-step title, the form-step title, and the success title) — each currently has a style object starting with `fontSize: 'clamp(...)', fontWeight: 700, color: C.text, margin: ...` (or `margin: 0` for the `<h2>`); add `fontFamily: HEADING_FONT,` as the first property in each of those style objects.

Replace the unavailable-slot background (inside the time-slot buttons in the "slots" step):
```ts
                        background: slot.available ? C.primaryMuted : '#F8FAFC',
```
with:
```ts
                        background: slot.available ? C.primaryMuted : C.border + '20',
```

Replace the module-level `labelStyle` constant:
```ts
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569',
  letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
}
```
with:
```ts
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#7A6452',
  letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
}
```

Replace the module-level `inputStyle` constant:
```ts
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem',
  borderRadius: 10, border: '1.5px solid #E2E8F0',
  fontFamily: '"Hanken Grotesk", Inter, system-ui, sans-serif',
  fontSize: '0.9rem', color: '#0F172A', outline: 'none', transition: 'border-color 0.15s',
  background: '#fff',
}
```
with:
```ts
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem',
  borderRadius: 10, border: '1.5px solid #E6D9C7',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '0.9rem', color: '#3D2B1F', outline: 'none', transition: 'border-color 0.15s',
  background: '#fff',
}
```

Replace the two remaining hardcoded hex values inside the `Row` helper component at the bottom of the file:
```ts
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, paddingTop: 2 }}>
        {label}
      </span>
```
with:
```ts
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#B0A08C', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, paddingTop: 2 }}>
        {label}
      </span>
```
and:
```ts
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', textAlign: 'right', textTransform: capitalize ? 'capitalize' : 'none' }}>
          {value}
        </span>
```
with:
```ts
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#3D2B1F', textAlign: 'right', textTransform: capitalize ? 'capitalize' : 'none' }}>
          {value}
        </span>
```

Leave unchanged (semantic status colors, not brand colors, confirmed in Global Constraints): the error boxes' `'#FEF2F2'`/`'#FCA5A5'`, the success circle's `#22C55E`, and the "pending" badge's `'#FEF9C3'`/`'#854D0E'`/`'#FDE047'`.

- [ ] **Step 7: Verify**

Run: `cd medisxime-landing && npx tsc -b --noEmit`
Expected: no errors. In particular, this catches any leftover unused import or variable given `noUnusedLocals`/`noUnusedParameters: true` — if `XimenaBookingCalendar.tsx` isn't imported anywhere yet (Task 2 hasn't run), `tsc -b` still type-checks the file on its own merits since it's part of the project's `include` glob; it does not need to be imported to be checked.

Run:
```bash
grep -n "DIANA_PROFESSIONAL_ID\|DianaBookingCalendar\|Diana\|Medina\|Hanken Grotesk\|#1D4ED8\|#2563EB\|#EFF6FF\|#0EA5E9\|#0F172A\|#475569\|#94A3B8\|#E2E8F0\|#F5F7FA\|#F8FAFC" medisxime-landing/src/components/XimenaBookingCalendar.tsx
```
Expected: no output (zero matches) — confirms every Diana-specific name/color/font was actually replaced, not just the ones explicitly called out above (this is a safety net in case an occurrence was missed).

- [ ] **Step 8: Commit**

```bash
git add medisxime-landing/src/components/XimenaBookingCalendar.tsx
git commit -m "feat(booking): add Ximena's booking calendar component"
```

---

### Task 2: Wire the component into the `/agenda` route

**Files:**
- Modify: `medisxime-landing/src/App.tsx`

**Interfaces:**
- Consumes: `XimenaBookingCalendar` default export from Task 1, prop `onBackToHome?: () => void`.

- [ ] **Step 1: Replace the placeholder `AgendaPage` with the real component**

Replace the import block at the top of the file — add the new import right after the last existing component import (`import { ProfessionalDashboard } from './components/professional/ProfessionalDashboard'`):
```ts
import { ProfessionalDashboard } from './components/professional/ProfessionalDashboard'
```
with:
```ts
import { ProfessionalDashboard } from './components/professional/ProfessionalDashboard'
import XimenaBookingCalendar from './components/XimenaBookingCalendar'
```

Replace the entire placeholder function:
```ts
// ── Agenda Page (Placeholder) ───────────────────────────────────────────────────
function AgendaPage() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF5', color: '#5C3A28', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: 'Cormorant Garamond, serif' }}>Agenda Disponible</h1>
        <p style={{ fontSize: '1.2rem', color: '#7A6452' }}>Próximamente podrás agendar tus citas directamente desde aquí.</p>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: '2rem', padding: '0.8rem 2rem', background: '#5C3A28', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
```
with:
```ts
// ── Agenda Page ──────────────────────────────────────────────────────────────
function AgendaPage() {
  const navigate = useNavigate()
  return <XimenaBookingCalendar onBackToHome={() => navigate('/')} />
}
```

The route itself (`<Route path="/agenda" element={<AgendaPage />} />`) and every link that navigates to `/agenda` (`Hero.tsx`, `FinalCTA.tsx`, `Navbar.tsx`) are untouched — they already point at the right place.

- [ ] **Step 2: Verify**

Run: `cd medisxime-landing && npx tsc -b --noEmit`
Expected: no errors.

Run: `cd medisxime-landing && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add medisxime-landing/src/App.tsx
git commit -m "feat(booking): wire XimenaBookingCalendar into the /agenda route"
```

---

## Explicitly out of scope

- Configuring Ximena's real schedule/services in CuidameDoc (operational task, not code — done separately by the user).
- SEO/JSON-LD wrapping around the booking page (the pattern exists in `diana/medis`'s `BookingPage` via `Seo`/`MedicalClinicJsonLd` components that don't exist yet in `medisxime-landing` — a separate, unrelated project if wanted later).
- Direcciones B (Sedes/Espacios/Profesionales) and C (Inventario/Cotizaciones) for Ximena — separate projects.
