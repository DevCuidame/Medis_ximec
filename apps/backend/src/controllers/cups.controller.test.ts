import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba'

const {
  lookupCups, updateCupsCatalogEntry, deleteCupsCatalogEntry,
  updateCupsMapping, deleteCupsMapping, listCupsAuditLog,
} = await import('./cups.controller.js')
const { CupsRepository } = await import('../repositories/cups.repository.js')

function fakeRes() {
  const res: any = { statusCode: 200, body: null }
  res.status = (c: number) => { res.statusCode = c; return res }
  res.json = (b: unknown) => { res.body = b; return res }
  return res
}

function req(query: Record<string, string>) {
  return { query, user: { id: 'admin1', email: 'admin@medisxime.com', role: 'ADMIN' } } as any
}

function reqWith(opts: { params?: Record<string, string>; body?: Record<string, unknown> }) {
  return { params: opts.params ?? {}, body: opts.body ?? {}, user: { id: 'admin1', email: 'admin@medisxime.com', role: 'ADMIN' } } as any
}

const fullQuery = { specialty: 'Otros', serviceGroup: '01', serviceSubgroup: '0101', serviceCategory: '010101', serviceSubcategory: '01010101' }

beforeEach(() => {
  (CupsRepository as any).findByClassification = async () => []
  ;(CupsRepository as any).logAudit = async () => {}
})

test('parámetros incompletos → 400', async () => {
  const res = fakeRes()
  await lookupCups(req({ serviceGroup: '01' }), res)
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(res.body.success, false)
})

test('falta serviceSubcategory → 400', async () => {
  const res = fakeRes()
  const { serviceSubcategory, ...withoutSubcategory } = fullQuery
  await lookupCups(req(withoutSubcategory), res)
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(res.body.success, false)
})

test('specialty ausente no bloquea la búsqueda (el CUPS ya no depende de la especialidad)', async () => {
  (CupsRepository as any).findByClassification = async () => [
    { cupsCode: '890201', procedureName: 'Consulta de primera vez por medicina general' },
  ]
  const res = fakeRes()
  const { specialty, ...withoutSpecialty } = fullQuery
  await lookupCups(req(withoutSpecialty), res)
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.body.data.match, 'unique')
})

test('sin candidatos → 404 con mensaje de configuración pendiente', async () => {
  (CupsRepository as any).findByClassification = async () => []
  const res = fakeRes()
  await lookupCups(req(fullQuery), res)
  assert.strictEqual(res.statusCode, 404)
  assert.strictEqual(res.body.success, false)
  assert.match(res.body.error, /revisa las opciones/i)
})

test('un solo candidato → 200 match=unique con cupsCode y procedureName', async () => {
  (CupsRepository as any).findByClassification = async () => [
    { cupsCode: '890201', procedureName: 'Consulta de primera vez por medicina general' },
  ]
  const res = fakeRes()
  await lookupCups(req(fullQuery), res)
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.body.success, true)
  assert.strictEqual(res.body.data.match, 'unique')
  assert.strictEqual(res.body.data.cupsCode, '890201')
  assert.strictEqual(res.body.data.procedureName, 'Consulta de primera vez por medicina general')
})

test('varios candidatos → 200 match=ambiguous con lista de candidatos', async () => {
  (CupsRepository as any).findByClassification = async () => [
    { cupsCode: '890208', procedureName: 'Consulta de primera vez por psicología' },
    { cupsCode: '890308', procedureName: 'Consulta de control o de seguimiento por psicología' },
  ]
  const res = fakeRes()
  await lookupCups(req(fullQuery), res)
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.body.success, true)
  assert.strictEqual(res.body.data.match, 'ambiguous')
  assert.strictEqual(res.body.data.candidates.length, 2)
})

// ─── Integridad referencial y auditoría ──────────────────────────────────────

test('PATCH catálogo: desactivar registra auditoría "deactivate"', async () => {
  let logged: any = null;
  (CupsRepository as any).updateCatalogEntry = async (code: string, changes: any) => ({ cupsCode: code, procedureName: 'X', isActive: changes.isActive, createdAt: 'now' });
  (CupsRepository as any).logAudit = async (entry: any) => { logged = entry };
  const res = fakeRes()
  await updateCupsCatalogEntry(reqWith({ params: { cupsCode: '890201' }, body: { isActive: false } }), res)
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(logged.action, 'deactivate')
  assert.strictEqual(logged.entityType, 'catalog')
  assert.strictEqual(logged.performedByEmail, 'admin@medisxime.com')
})

test('DELETE catálogo en uso por un mapeo → 409 y sugiere desactivar, sin registrar auditoría de borrado', async () => {
  let auditCalls = 0;
  (CupsRepository as any).deleteCatalogEntry = async () => { const e: any = new Error('FK'); e.code = '23503'; throw e };
  (CupsRepository as any).logAudit = async () => { auditCalls++ };
  const res = fakeRes()
  await deleteCupsCatalogEntry(reqWith({ params: { cupsCode: '890201' } }), res)
  assert.strictEqual(res.statusCode, 409)
  assert.match(res.body.error, /mapeo/i)
  assert.match(res.body.error, /inactivo/i)
  assert.strictEqual(auditCalls, 0)
})

test('DELETE catálogo sin uso → 200 y registra auditoría "delete"', async () => {
  let logged: any = null;
  (CupsRepository as any).deleteCatalogEntry = async () => true;
  (CupsRepository as any).logAudit = async (entry: any) => { logged = entry };
  const res = fakeRes()
  await deleteCupsCatalogEntry(reqWith({ params: { cupsCode: '999999' } }), res)
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.body.success, true)
  assert.strictEqual(logged.action, 'delete')
})

test('PATCH mapeo: reactivar registra auditoría "reactivate"', async () => {
  let logged: any = null;
  (CupsRepository as any).updateMappingActive = async (id: string, isActive: boolean) => ({ id, specialty: 'Otros', serviceGroup: '01', serviceSubgroup: '0101', serviceCategory: '010101', serviceSubcategory: '01010101', cupsCode: '890201', procedureName: 'X', isActive });
  (CupsRepository as any).logAudit = async (entry: any) => { logged = entry };
  const res = fakeRes()
  await updateCupsMapping(reqWith({ params: { id: '5' }, body: { isActive: true } }), res)
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(logged.action, 'reactivate')
  assert.strictEqual(logged.entityType, 'mapping')
})

test('DELETE mapeo asociado a servicios existentes → 409 y sugiere desactivar', async () => {
  (CupsRepository as any).findMappingById = async (id: string) => ({ id, specialty: 'Ginecología', serviceGroup: '01', serviceSubgroup: '0102', serviceCategory: '010203', serviceSubcategory: '01020301', cupsCode: '890250', procedureName: 'X', isActive: true });
  (CupsRepository as any).countServicesUsingMapping = async () => 3;
  let deleteCalled = false;
  (CupsRepository as any).deleteMapping = async () => { deleteCalled = true; return true };
  const res = fakeRes()
  await deleteCupsMapping(reqWith({ params: { id: '9' } }), res)
  assert.strictEqual(res.statusCode, 409)
  assert.match(res.body.error, /3 servicio/i)
  assert.match(res.body.error, /inactivo/i)
  assert.strictEqual(deleteCalled, false)
})

test('DELETE mapeo sin servicios asociados → 200 y registra auditoría "delete"', async () => {
  (CupsRepository as any).findMappingById = async (id: string) => ({ id, specialty: 'Ginecología', serviceGroup: '01', serviceSubgroup: '0102', serviceCategory: '010203', serviceSubcategory: '01020301', cupsCode: '890250', procedureName: 'X', isActive: true });
  (CupsRepository as any).countServicesUsingMapping = async () => 0;
  (CupsRepository as any).deleteMapping = async () => true;
  let logged: any = null;
  (CupsRepository as any).logAudit = async (entry: any) => { logged = entry };
  const res = fakeRes()
  await deleteCupsMapping(reqWith({ params: { id: '9' } }), res)
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(logged.action, 'delete')
  assert.strictEqual(logged.entityType, 'mapping')
})

test('GET audit log devuelve la lista del repositorio', async () => {
  (CupsRepository as any).listAuditLog = async () => [{ id: '1', entityType: 'catalog', entityRef: '890201', action: 'create', performedByEmail: 'a@b.co', details: null, createdAt: 'now' }];
  const res = fakeRes()
  await listCupsAuditLog(reqWith({}), res)
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.body.data.log.length, 1)
})
