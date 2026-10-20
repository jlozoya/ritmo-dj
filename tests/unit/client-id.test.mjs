import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import { createClientId } from '../../src/features/requests/lib/client-id.ts';

test('secure origins use native randomUUID', () => {
  const source = {
    randomUUID: () => 'native-client-id',
    getRandomValues: () => assert.fail('Fallback should not be called.'),
  };
  assert.equal(createClientId(source), 'native-client-id');
});

test('LAN HTTP origins generate a UUID v4 without randomUUID', () => {
  const source = {
    getRandomValues(bytes) {
      assert.equal(this, source);
      return bytes.fill(255);
    },
  };
  assert.equal(createClientId(source), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
});

test('fallback identifiers use fresh random bytes', () => {
  const source = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
  const ids = Array.from({ length: 100 }, () => createClientId(source));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(
      id,
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
  }
});
