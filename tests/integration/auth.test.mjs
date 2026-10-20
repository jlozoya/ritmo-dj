import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getLocalNetworkHosts } from '../../scripts/local-network.mjs';

// This test creates disposable accounts in the local D1 database and removes them.
const root = fileURLToPath(new URL('../../', import.meta.url));
const base = new URL(
  process.env.RITMO_TEST_BASE_URL || 'http://127.0.0.1:5184',
);
assert.ok(
  ['localhost', '127.0.0.1', ...getLocalNetworkHosts()].includes(base.hostname),
  'Auth tests only run against this computer.',
);
const prefix = `ritmo-test-${randomUUID()}`;
const password = randomUUID().slice(0, 8);
const emails = [`${prefix}-a@example.test`, `${prefix}-b@example.test`];
const eventIds = [];
const ipSuffix = 1 + Math.floor(Math.random() * 230);
const testIP = (offset) => `192.0.2.${ipSuffix + offset}`;
let assertions = 0;

async function request(
  path,
  {
    method = 'GET',
    body,
    cookie,
    origin = base.origin,
    ip = testIP(0),
    headers = {},
  } = {},
) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      origin,
      'cf-connecting-ip': ip,
      ...headers,
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { error: text };
  }
  return {
    status: response.status,
    body: result,
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; '),
    cookies: response.headers.getSetCookie(),
  };
}

function check(condition, message) {
  assert.ok(condition, message);
  assertions++;
}

try {
  check(
    (await request('/api/events')).status === 401,
    'Anonymous DJ access must be rejected.',
  );
  check(
    (
      await request('/api/events', {
        cookie: '__sites_local_auth=1',
        headers: {
          'oai-authenticated-user-id': 'local_seedy',
          'oai-authenticated-user-email': 'seedy@sites.test',
        },
      })
    ).status === 401,
    'Legacy Sites headers/cookies must not grant DJ access.',
  );
  check(
    (
      await request('/api/auth/sign-up/email', {
        method: 'POST',
        ip: testIP(1),
        body: {
          email: emails[0],
          password: password.slice(0, 7),
          name: 'Test DJ',
        },
      })
    ).status === 400,
    'Seven-character passwords must be rejected by the server.',
  );
  check(
    (
      await request('/api/auth/sign-up/email', {
        method: 'POST',
        origin: 'https://untrusted.example',
        body: {
          email: emails[0],
          password,
          name: 'Test DJ',
        },
      })
    ).status === 403,
    'Cross-origin registration must be rejected.',
  );

  const first = await request('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: emails[0], password, name: 'Test DJ A' },
  });
  check(
    first.status === 200 && Boolean(first.cookie),
    'Registration with eight characters must create a session.',
  );
  check(
    first.cookies.some(
      (cookie) => /httponly/i.test(cookie) && /samesite=lax/i.test(cookie),
    ),
    'Session cookie must be HttpOnly and SameSite.',
  );
  const current = await request('/api/auth/get-session', {
    cookie: first.cookie,
  });
  check(
    current.body?.user?.email === emails[0],
    'Session must identify the registered DJ.',
  );
  check(
    (
      await request('/api/auth/sign-up/email', {
        method: 'POST',
        body: { email: emails[0], password, name: 'Duplicate' },
      })
    ).status >= 400,
    'Duplicate emails must not create another account.',
  );

  const event = await request('/api/events', {
    method: 'POST',
    cookie: first.cookie,
    body: { name: prefix },
  });
  if (event.body?.id) eventIds.push(event.body.id);
  check(
    event.status === 200 && Boolean(event.body.id),
    'A registered DJ must be able to create an event.',
  );
  check(
    (
      await request('/api/events', {
        method: 'POST',
        cookie: first.cookie,
        origin: 'https://untrusted.example',
        body: { name: 'Blocked' },
      })
    ).status === 403,
    'Cross-origin event mutations must be rejected.',
  );
  const eventPath = `/api/event/${event.body.id}`;
  check(
    (await request(eventPath)).body.owner === false,
    'The public QR endpoint must remain accessible without a session.',
  );
  check(
    (
      await request(eventPath, {
        method: 'POST',
        body: { title: 'Test song', artist: 'Test artist', client: prefix },
      })
    ).status === 200,
    'Guests must be able to request a song without an account.',
  );
  check(
    (await request(eventPath, { cookie: first.cookie })).body.requests
      .length === 1,
    'The owner must see incoming requests.',
  );

  const second = await request('/api/auth/sign-up/email', {
    method: 'POST',
    ip: testIP(2),
    body: { email: emails[1], password, name: 'Test DJ B' },
  });
  check(
    second.status === 200,
    'A second DJ must be able to register independently.',
  );
  check(
    (await request('/api/events', { cookie: second.cookie })).body.every(
      (row) => row.id !== event.body.id,
    ),
    'DJs must not see another account’s events.',
  );
  const otherView = await request(eventPath, { cookie: second.cookie });
  check(
    otherView.body.owner === false && otherView.body.requests.length === 0,
    'Another DJ must not see private requests.',
  );
  check(
    (
      await request(eventPath, {
        method: 'PATCH',
        cookie: second.cookie,
        body: { open: false },
      })
    ).status === 403,
    'Another DJ must not modify the event.',
  );
  check(
    (
      await request(eventPath, {
        method: 'PATCH',
        cookie: first.cookie,
        body: { open: false },
      })
    ).status === 200,
    'The owner must be able to pause requests.',
  );

  check(
    (
      await request('/api/auth/sign-out', {
        method: 'POST',
        cookie: first.cookie,
        body: {},
      })
    ).status === 200,
    'Sign out must succeed.',
  );
  check(
    (await request('/api/events', { cookie: first.cookie })).status === 401,
    'Sign out must invalidate the server session.',
  );
  check(
    (
      await request('/api/auth/sign-in/email', {
        method: 'POST',
        body: { email: emails[0], password: `${password}-wrong` },
      })
    ).status === 401,
    'An incorrect password must be rejected.',
  );
  const login = await request('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email: emails[0], password },
  });
  check(
    login.status === 200 && Boolean(login.cookie),
    'The DJ must be able to sign in again.',
  );
  check(
    (await request('/api/events', { cookie: login.cookie })).body.some(
      (row) => row.id === event.body.id,
    ),
    'Events must remain associated with the account after signing in again.',
  );

  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await request('/api/auth/sign-in/email', {
      method: 'POST',
      ip: testIP(3),
      body: { email: emails[1], password: 'incorrect-password' },
    });
    if (attempt === 5)
      check(
        result.status === 429,
        'Repeated login attempts must be rate limited.',
      );
  }
  console.log(`Auth integration: ${assertions} checks passed.`);
} finally {
  const sqlPath = new URL(
    '../../.wrangler/auth-test-cleanup.sql',
    import.meta.url,
  );
  const quote = (value) => `'${value.replaceAll("'", "''")}'`;
  const sql = [
    ...eventIds.flatMap((id) => [
      `DELETE FROM requests WHERE event = ${quote(id)};`,
      `DELETE FROM events WHERE id = ${quote(id)};`,
    ]),
    `DELETE FROM auth_user WHERE email IN (${emails.map(quote).join(',')});`,
  ].join('\n');
  writeFileSync(sqlPath, sql);
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      './scripts/sites-env.mjs',
      './node_modules/wrangler/bin/wrangler.js',
      'd1',
      'execute',
      'DB',
      '--local',
      '--config',
      'wrangler.local.json',
      '--persist-to',
      '.wrangler/state',
      '--file',
      fileURLToPath(sqlPath),
    ],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    console.error(
      'Could not clean up local auth test data. Cleanup SQL remains in .wrangler/auth-test-cleanup.sql.',
    );
    process.exitCode = 1;
  } else {
    unlinkSync(sqlPath);
    console.log('Disposable auth test accounts and event removed.');
  }
}
