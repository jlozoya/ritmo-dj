import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLocalNetworkHosts } from '../../scripts/local-network.mjs';
import { getSharingOrigin } from '../../src/lib/sharing-origin.ts';

test('LAN detection prefers Wi-Fi over virtual adapters and skips loopback/IPv6', () => {
  assert.deepEqual(
    getLocalNetworkHosts({
      'vEthernet (WSL)': [
        { family: 'IPv4', internal: false, address: '172.19.80.1' },
      ],
      Loopback: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
      'Wi-Fi': [
        { family: 'IPv6', internal: false, address: 'fe80::1' },
        { family: 'IPv4', internal: false, address: '192.168.0.198' },
      ],
    }),
    ['192.168.0.198', '172.19.80.1'],
  );
});

test('local links use the LAN IP and preserve the running server port', () => {
  for (const host of ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']) {
    assert.equal(
      getSharingOrigin(`http://${host}:5184`, ['192.168.0.198']),
      'http://192.168.0.198:5184',
    );
  }
});

test('LAN and published origins are kept as visited', () => {
  for (const origin of ['http://192.168.0.50:5173', 'https://ritmo.example']) {
    assert.equal(getSharingOrigin(origin, ['192.168.0.198']), origin);
  }
});

test('no network address leaves the origin unchanged, including production builds', () => {
  assert.equal(
    getSharingOrigin('http://localhost:5173', []),
    'http://localhost:5173',
  );
});
