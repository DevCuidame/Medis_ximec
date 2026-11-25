import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { provisionDocProfessional } from './docProfessionalProvision.service.js';

function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

const baseParams = {
  email: 'ximena@example.com', password: 'Segura123',
  firstName: 'Ximena', lastName: 'Pérez',
  idType: 'CC', idNumber: '123456', phone: '3000000000',
  address: 'Calle 1', medicalRegistrationNumber: 'RM-999',
};

test('provisionDocProfessional: éxito → devuelve ok y el professional_id de CuidameDoc', async (t) => {
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { professional_id: 99, user_id: 501 } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional(baseParams);

  assert.equal(result.ok, true);
  assert.equal(result.docProfessionalId, 99);
});

test('provisionDocProfessional: CuidameDoc responde error (ej. email duplicado) → ok:false con el mensaje', async (t) => {
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Este correo ya está registrado.' }), { status: 409 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional(baseParams);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Este correo ya está registrado.');
});

test('provisionDocProfessional: success:true pero data sin professional_id → ok:false, no reporta éxito falso', async (t) => {
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional(baseParams);

  assert.equal(result.ok, false);
  assert.equal(result.docProfessionalId, undefined);
  assert.ok(result.error);
});

test('provisionDocProfessional: fallo de red → ok:false, nunca lanza', async (t) => {
  fetchMock(t, (url) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    throw new TypeError('fetch failed: network error');
  });

  await assert.doesNotReject(async () => {
    const result = await provisionDocProfessional(baseParams);
    assert.equal(result.ok, false);
    assert.ok(result.error);
  });
});

test('provisionDocProfessional: sin medicalRegistrationNumber → ok:false sin llamar a fetch', async (t) => {
  const calls: string[] = [];
  fetchMock(t, (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional({ ...baseParams, medicalRegistrationNumber: '' });

  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /registro médico/i);
  assert.equal(calls.length, 0);
});

// ---- syncDocLicense: el registro médico de Medis es la fuente; Doc lo imprime en sus documentos ----
import { syncDocLicense } from './docProfessionalProvision.service.js';

const loginOk = () => new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });

test('syncDocLicense: PUT /professionals/:id con license_number → ok', async (t) => {
  const calls: Array<{ url: string; method?: string; body?: string }> = [];
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) return loginOk();
    calls.push({ url, method: init?.method, body: init?.body });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  });

  const result = await syncDocLicense(12, ' RM-269108 ');

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith('/professionals/12'));
  assert.equal(calls[0].method, 'PUT');
  assert.deepEqual(JSON.parse(calls[0].body!), { license_number: 'RM-269108' });
});

test('syncDocLicense: número vacío → ok:false y NO llama a Doc (nunca se borra una licencia)', async (t) => {
  const f = fetchMock(t, () => loginOk());

  const result = await syncDocLicense(12, '   ');

  assert.equal(result.ok, false);
  assert.equal(f.mock.callCount(), 0);
});

test('syncDocLicense: Doc responde error → ok:false con el mensaje; no lanza', async (t) => {
  fetchMock(t, (url) => {
    if (url.endsWith('/auth/login')) return loginOk();
    return new Response(JSON.stringify({ success: false, message: 'Error updating professional' }), { status: 500 });
  });

  const result = await syncDocLicense(12, 'RM-269108');

  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /Error updating professional/);
});

test('syncDocLicense: error de red → ok:false; no lanza', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('red caída'); });

  const result = await syncDocLicense(12, 'RM-269108');

  assert.equal(result.ok, false);
});
