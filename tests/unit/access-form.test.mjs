import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAccessForm } from '../../src/features/auth/lib/access-form.ts';

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test('registration explains why a short password cannot create an account', () => {
  const result = parseAccessForm(
    form({
      name: 'DJ Test',
      email: 'test@example.test',
      password: 'seven77',
      'password-confirmation': 'seven77',
    }),
    'register',
  );
  assert.equal(result.data, null);
  assert.equal(result.errors.password, 'Usa al menos 8 caracteres.');
});

test('registration accepts a password of exactly eight characters', () => {
  const result = parseAccessForm(
    form({
      name: 'DJ Test',
      email: 'test@example.test',
      password: 'eight888',
      'password-confirmation': 'eight888',
    }),
    'register',
  );
  assert.deepEqual(result.errors, {});
  assert.equal(result.data.password, 'eight888');
});

test('submitted fields normalize email and preserve the exact password', () => {
  const password = '  A-long-test-password!  ';
  const result = parseAccessForm(
    form({
      name: '  Test  ',
      email: '  DJ@EXAMPLE.TEST ',
      password,
      'password-confirmation': password,
    }),
    'register',
  );
  assert.deepEqual(result.errors, {});
  assert.equal(result.data.email, 'dj@example.test');
  assert.equal(result.data.password, password);
  assert.equal(result.data.name, 'Test');
});

test('confirmation errors belong to the confirmation field', () => {
  const result = parseAccessForm(
    form({
      name: 'Test',
      email: 'test@example.test',
      password: 'long-test-password',
      'password-confirmation': 'different-password',
    }),
    'register',
  );
  assert.equal(result.data, null);
  assert.equal(result.errors.confirmation, 'Las contraseñas no coinciden.');
});

test('sign in does not apply new account password rules', () => {
  const result = parseAccessForm(
    form({ email: 'dj@example.test', password: 'old-password' }),
    'sign-in',
  );
  assert.equal(result.data.password, 'old-password');
  assert.deepEqual(result.errors, {});
});

test('missing required fields produce actionable errors', () => {
  const result = parseAccessForm(new FormData(), 'register');
  assert.equal(result.data, null);
  assert.ok(result.errors.name);
  assert.equal(result.errors.email, 'Escribe un correo válido.');
  assert.equal(result.errors.password, 'Escribe tu contraseña.');
});
