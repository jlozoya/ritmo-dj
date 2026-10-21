import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import {
  createEventToken,
  eventChannel,
  publishEventChange,
} from '../../src/server/realtime/ably-protocol.ts';
import { deliverEventChange } from '../../src/server/realtime/delivery.ts';

const key = 'app.key:synthetic-test-secret';
test('tokens expire in five minutes, allow only subscribing to one event and are signed correctly', async () => {
  const token = await createEventToken(key, 'event-1', 1000000);
  const [header, payload, signature] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), {
    typ: 'JWT',
    alg: 'HS256',
    kid: 'app.key',
  });
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.iat, 1000);
  assert.equal(claims.exp, 1300);
  assert.deepEqual(JSON.parse(claims['x-ably-capability']), {
    'ritmo:event:event-1': ['subscribe'],
  });
  assert.equal(
    signature,
    createHmac('sha256', 'synthetic-test-secret')
      .update(`${header}.${payload}`)
      .digest('base64url'),
  );
});

test('publishes carry no guest, song, message or payment data', async () => {
  await publishEventChange(key, 'event-1', async (url, options) => {
    assert.equal(
      url,
      'https://rest.ably.io/channels/ritmo%3Aevent%3Aevent-1/messages',
    );
    assert.deepEqual(JSON.parse(options.body), { name: 'changed', data: {} });
    return new Response(null, { status: 201 });
  });
  assert.equal(eventChannel('*'), 'ritmo:event:%2A');
});

test('publish quota and invalid credentials fail without retry storms', async () => {
  for (const status of [429, 401, 403]) {
    let calls = 0;
    await assert.rejects(
      publishEventChange(key, 'event-1', async () => {
        calls++;
        return new Response('{}', { status });
      }),
    );
    assert.equal(calls, 1);
  }
});

test('transient provider failures get one bounded retry', async () => {
  let calls = 0;
  await publishEventChange(
    key,
    'event-1',
    async () => new Response(null, { status: ++calls === 1 ? 503 : 201 }),
  );
  assert.equal(calls, 2);
});

test('publish failure persists a cooldown across instances and retries after recovery', async () => {
  let now = 1000,
    retryAfter = 0,
    calls = 0,
    quota = true;
  const options = {
    now: () => now,
    readRetryAfter: async () => retryAfter,
    saveRetryAfter: async (value) => {
      retryAfter = value;
    },
    publish: async () => {
      calls++;
      if (quota) throw new Error('429');
    },
  };
  assert.equal(await deliverEventChange(options), 'failed');
  assert.equal(retryAfter, 61000);
  assert.equal(await deliverEventChange({ ...options }), 'paused');
  assert.equal(calls, 1);
  now = 61000;
  quota = false;
  assert.equal(await deliverEventChange(options), 'delivered');
  assert.equal(calls, 2);
});
