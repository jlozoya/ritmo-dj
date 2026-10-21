import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTipLink } from '../../src/features/tips/lib/tip-link.ts';

test('PayPal.Me links are normalized to a direct recipient link', () => {
  for (const url of [
    ' https://paypal.me/ExampleDJ ',
    'https://www.paypal.me/ExampleDJ/',
    'https://www.paypal.com/paypalme/ExampleDJ?locale.x=es_XC#share',
  ]) {
    assert.deepEqual(parseTipLink(url), {
      url: 'https://paypal.me/ExampleDJ',
      provider: 'paypal',
      label: 'PayPal',
    });
  }
});

test('Mercado Pago supports payment links and Mexican recipient pages', () => {
  for (const url of [
    'https://mpago.la/2WTWRHT',
    'https://link.mercadopago.com.mx/example-dj',
  ]) {
    assert.deepEqual(parseTipLink(`${url}/?source=share`), {
      url,
      provider: 'mercado-pago',
      label: 'Mercado Pago',
    });
  }
});

test('payment URLs reject lookalike hosts, credentials, redirects and executable schemes', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://paypal.me/ExampleDJ',
    'https://paypal.me.evil.test/ExampleDJ',
    'https://evil.test/paypal.me/ExampleDJ',
    'https://paypal.me@evil.test/ExampleDJ',
    'https://user:password@paypal.me/ExampleDJ',
    'https://paypal.me:8443/ExampleDJ',
    'https://paypal.com/redirect?url=https://evil.test',
    'https://mpago.la/a/redirect',
    'https://link.mercadopago.com.mx.evil.test/dj',
    'https://paypal.me/ExampleDJ/100',
    'https://mpago.la/%2f%2fevil.test',
    'https://example.test/payment',
    '',
    'not a URL',
    `https://paypal.me/${'a'.repeat(501)}`,
  ])
    assert.equal(parseTipLink(url), null, url);
});
