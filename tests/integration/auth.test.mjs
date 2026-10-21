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
      await request('/api/auth/update-user', {
        method: 'POST',
        body: { name: 'Intruder' },
      })
    ).status === 401,
    'Profile changes require a session.',
  );
  check(
    (
      await request('/api/auth/update-user', {
        method: 'POST',
        cookie: first.cookie,
        origin: 'https://untrusted.example',
        body: { name: 'Intruder' },
      })
    ).status === 403,
    'Cross-origin profile changes must be rejected.',
  );
  check(
    (
      await request('/api/auth/update-user', {
        method: 'POST',
        cookie: first.cookie,
        body: { name: '   ' },
      })
    ).status === 400,
    'Blank DJ names must be rejected on the server.',
  );
  check(
    (
      await request('/api/auth/update-user', {
        method: 'POST',
        cookie: first.cookie,
        body: { name: '  DJ actualizado  ' },
      })
    ).status === 200,
    'A DJ can update their own profile.',
  );
  check(
    (await request('/api/auth/get-session', { cookie: first.cookie })).body.user
      ?.name === 'DJ actualizado',
    'The saved DJ name must be reflected in the session.',
  );
  check(
    (
      await request('/api/auth/update-user', {
        method: 'POST',
        cookie: first.cookie,
        body: { email: 'different@example.test' },
      })
    ).status === 400,
    'The profile endpoint must not silently replace the account email.',
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
    (await request(eventPath)).body.tipUrl === null,
    'New events must not advertise a payment recipient before configuration.',
  );
  check(
    (
      await request(eventPath, {
        method: 'PATCH',
        body: { tipUrl: 'https://paypal.me/TestDJ' },
      })
    ).status === 403,
    'Anonymous visitors cannot set a tip recipient.',
  );
  check(
    (
      await request(eventPath, {
        method: 'PATCH',
        cookie: first.cookie,
        origin: 'https://untrusted.example',
        body: { tipUrl: 'https://paypal.me/TestDJ' },
      })
    ).status === 403,
    'Cross-origin changes to payment recipients must be rejected.',
  );
  for (const tipUrl of [
    'javascript:alert(1)',
    'https://paypal.me.evil.test/dj',
    123,
  ]) {
    check(
      (
        await request(eventPath, {
          method: 'PATCH',
          cookie: first.cookie,
          body: { tipUrl },
        })
      ).status === 400,
      'Invalid payment links must be rejected by the server.',
    );
  }
  check(
    (
      await request(eventPath, {
        method: 'PATCH',
        cookie: first.cookie,
        body: { tipUrl: 'https://www.paypal.me/TestDJ/?source=share' },
      })
    ).status === 200,
    'An event owner can enable PayPal tips.',
  );
  check(
    (await request(eventPath)).body.tipUrl === 'https://paypal.me/TestDJ',
    'The public event must expose the validated payment link without authentication.',
  );
  check(
    (await request(eventPath)).body.owner === false,
    'The public QR endpoint must remain accessible without a session.',
  );
  check(
    (
      await request(eventPath, {
        method: 'POST',
        body: { title: 'Manual song', artist: 'Manual artist', client: prefix },
      })
    ).status === 400,
    'Manual song requests without a Spotify selection must be rejected.',
  );
  check(
    (
      await request(eventPath, {
        method: 'POST',
        body: {
          title: 'Invalid selection',
          artist: 'Test artist',
          client: prefix,
          spotify: 'https://example.test/track/2cGxRwrMyEAp8dEbuZaVv6',
        },
      })
    ).status === 400,
    'A non-Spotify link must not count as a selected song.',
  );
  check(
    (
      await request(eventPath, {
        method: 'POST',
        body: {
          title: 'Test song',
          artist: 'Test artist',
          client: prefix,
          spotify: 'https://open.spotify.com/track/2cGxRwrMyEAp8dEbuZaVv6',
          image:
            'https://i.scdn.co/image/ab67616d00001e029b9b36b0e22870b9f542d937',
        },
      })
    ).status === 200,
    'Guests must be able to request a song without an account.',
  );
  check(
    (await request(eventPath, { cookie: first.cookie })).body.requests
      .length === 1,
    'The owner must see incoming requests.',
  );
  check(
    (await request(eventPath, { cookie: first.cookie })).body.requests[0]
      .image ===
      'https://i.scdn.co/image/ab67616d00001e029b9b36b0e22870b9f542d937',
    'The DJ must receive the selected Spotify artwork with the request.',
  );

  const tipPath = `${eventPath}/tip-click`;
  check(
    (await request(eventPath, { cookie: first.cookie })).body.tipOpenCount ===
      0,
    'Events start with no tip-link openings.',
  );
  check(
    (await request(eventPath, { cookie: first.cookie })).body.requests[0]
      .tipOpened === false,
    'Requests must not imply a tip-link click before one is recorded.',
  );
  check(
    (
      await request(tipPath, {
        method: 'POST',
        origin: 'https://untrusted.example',
        body: { client: prefix },
      })
    ).status === 403,
    'Cross-origin tip tracking must be rejected.',
  );
  for (const client of [null, '', '   ', 'x'.repeat(81), { invalid: true }])
    check(
      (await request(tipPath, { method: 'POST', body: { client } })).status ===
        400,
      'Tip tracking requires a valid visitor identifier.',
    );
  const duplicateClicks = await Promise.all(
    Array.from({ length: 3 }, () =>
      request(tipPath, { method: 'POST', body: { client: prefix } }),
    ),
  );
  check(
    duplicateClicks.every((result) => result.status === 200),
    'Repeated concurrent clicks must be idempotent.',
  );
  const clicked = (await request(eventPath, { cookie: first.cookie })).body;
  check(
    clicked.tipOpenCount === 1 && clicked.requests[0].tipOpened === true,
    'A click marks existing requests and counts the browser only once.',
  );
  const publicTips = (await request(eventPath)).body;
  check(
    !Object.hasOwn(publicTips, 'tipOpenCount') &&
      publicTips.requests.length === 0,
    'Tip counts and request indicators remain private to the DJ.',
  );
  const beforeClient = `${prefix}-before`;
  check(
    (await request(tipPath, { method: 'POST', body: { client: beforeClient } }))
      .status === 200,
    'Guests can open tips before sending a song.',
  );
  for (const client of [beforeClient, `${prefix}-unclicked`])
    check(
      (
        await request(eventPath, {
          method: 'POST',
          body: {
            title:
              client === beforeClient ? 'After opening tips' : 'No tip opening',
            artist: 'Test artist',
            guest: 'Same guest name',
            client,
            spotify: 'https://open.spotify.com/track/2cGxRwrMyEAp8dEbuZaVv6',
            image:
              'https://i.scdn.co/image/ab67616d00001e029b9b36b0e22870b9f542d937',
          },
        })
      ).status === 200,
      'Guests can send requests after tip tracking.',
    );
  const afterClick = (await request(eventPath, { cookie: first.cookie })).body;
  check(
    afterClick.tipOpenCount === 2 &&
      afterClick.requests.find((song) => song.title === 'After opening tips')
        ?.tipOpened === true,
    'Future requests inherit this browser’s event-specific opening.',
  );
  check(
    afterClick.requests.find((song) => song.title === 'No tip opening')
      ?.tipOpened === false,
    'Identical guest names must not share tip indicators.',
  );

  // Optional live-catalog check for requests saved before artwork was stored.
  if (process.env.RITMO_TEST_SPOTIFY === '1') {
    check(
      (
        await request(eventPath, {
          method: 'POST',
          body: {
            title: 'Legacy artwork test',
            artist: 'Test artist',
            client: `${prefix}-legacy`,
            spotify: 'https://open.spotify.com/track/2cGxRwrMyEAp8dEbuZaVv6',
          },
        })
      ).status === 200,
      'Requests without saved artwork must remain valid.',
    );
    const legacy = (
      await request(eventPath, { cookie: first.cookie })
    ).body.requests.find((row) => row.title === 'Legacy artwork test');
    check(
      /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(legacy?.image),
      'The DJ must receive recovered artwork for an older request.',
    );
    check(
      (await request(eventPath, { cookie: first.cookie })).body.requests.find(
        (row) => row.id === legacy.id,
      )?.image === legacy.image,
      'Recovered artwork must remain available on subsequent queue refreshes.',
    );
  }

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
    !Object.hasOwn(otherView.body, 'tipOpenCount'),
    'Another DJ cannot read tip-link totals.',
  );
  check(
    otherView.body.owner === false && otherView.body.requests.length === 0,
    'Another DJ must not see private requests.',
  );
  check(
    (
      await request(eventPath, {
        method: 'PATCH',
        cookie: second.cookie,
        body: { tipUrl: 'https://mpago.la/2WTWRHT' },
      })
    ).status === 403,
    'Another DJ cannot replace the event payment recipient.',
  );
  check(
    (await request(eventPath)).body.tipUrl === 'https://paypal.me/TestDJ',
    'Rejected changes must preserve the original recipient.',
  );
  check(
    (
      await request(eventPath, {
        method: 'PATCH',
        cookie: first.cookie,
        body: { tipUrl: 'https://mpago.la/2WTWRHT' },
      })
    ).status === 200,
    'The owner can switch to Mercado Pago.',
  );
  check(
    (await request(eventPath)).body.tipUrl === 'https://mpago.la/2WTWRHT',
    'The guest payment link must reflect the newly saved provider.',
  );
  check(
    (
      await request(eventPath, {
        method: 'PATCH',
        cookie: first.cookie,
        body: { tipUrl: null },
      })
    ).status === 200,
    'The owner can disable tips.',
  );
  check(
    (await request(eventPath)).body.tipUrl === null,
    'Disabled tips must remove the public payment link.',
  );
  check(
    (
      await request(tipPath, {
        method: 'POST',
        body: { client: `${prefix}-disabled` },
      })
    ).status === 400,
    'Disabled tips reject new opening records.',
  );
  check(
    (await request(eventPath, { cookie: first.cookie })).body.tipOpenCount ===
      2,
    'Disabling tips preserves the recorded history.',
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

  const lifecycleName = `${prefix}-lifecycle`;
  const lifecycle = await request('/api/events', {
    method: 'POST',
    cookie: first.cookie,
    body: { name: lifecycleName },
  });
  if (lifecycle.body?.id) eventIds.push(lifecycle.body.id);
  check(
    lifecycle.status === 200 && lifecycle.body.archived === 0,
    'New events must start unarchived.',
  );
  const lifecyclePath = `/api/event/${lifecycle.body.id}`;
  const testSong = {
    title: 'Preserved song',
    artist: 'Test artist',
    client: `${prefix}-archive`,
    spotify: 'https://open.spotify.com/track/2cGxRwrMyEAp8dEbuZaVv6',
    image: 'https://i.scdn.co/image/ab67616d00001e029b9b36b0e22870b9f542d937',
  };
  check(
    (await request(lifecyclePath, { method: 'POST', body: testSong }))
      .status === 200,
    'Lifecycle tests require a stored request.',
  );
  check(
    (
      await request(lifecyclePath, {
        method: 'PATCH',
        cookie: first.cookie,
        body: { tipUrl: 'https://paypal.me/TestDJ' },
      })
    ).status === 200,
    'Lifecycle tests require a configured tip link.',
  );
  check(
    (await request('/api/events?archived=1')).status === 401,
    'Archived event lists require authentication.',
  );
  check(
    (await request(lifecyclePath, { cookie: first.cookie })).body
      .tipOpenCount === 0,
    'Tip counts must be isolated per event.',
  );
  check(
    (
      await request(`${lifecyclePath}/tip-click`, {
        method: 'POST',
        body: { client: testSong.client },
      })
    ).status === 200,
    'Lifecycle test records a tip-link opening.',
  );
  for (const cookie of [undefined, second.cookie]) {
    check(
      (
        await request(lifecyclePath, {
          method: 'PATCH',
          cookie,
          body: { archived: true },
        })
      ).status === 403,
      'Only the owner can archive an event.',
    );
    check(
      (
        await request(lifecyclePath, {
          method: 'DELETE',
          cookie,
          body: { confirmationName: lifecycleName },
        })
      ).status === 403,
      'Only the owner can delete an event.',
    );
  }
  check(
    (
      await request(lifecyclePath, {
        method: 'PATCH',
        cookie: first.cookie,
        origin: 'https://untrusted.example',
        body: { archived: true },
      })
    ).status === 403,
    'Cross-origin archives must be rejected.',
  );
  check(
    (
      await request(lifecyclePath, {
        method: 'DELETE',
        cookie: first.cookie,
        origin: 'https://untrusted.example',
        body: { confirmationName: lifecycleName },
      })
    ).status === 403,
    'Cross-origin deletion must be rejected.',
  );
  for (const body of [{}, { confirmationName: 'wrong name' }])
    check(
      (
        await request(lifecyclePath, {
          method: 'DELETE',
          cookie: first.cookie,
          body,
        })
      ).status === 400,
      'Deletion requires the exact event name.',
    );
  check(
    (
      await request(lifecyclePath, {
        method: 'PATCH',
        cookie: first.cookie,
        body: { archived: true },
      })
    ).status === 200,
    'The owner can archive an event.',
  );
  check(
    !(await request('/api/events', { cookie: first.cookie })).body.some(
      (row) => row.id === lifecycle.body.id,
    ),
    'Archived events must leave the active list.',
  );
  check(
    (
      await request('/api/events?archived=1', { cookie: first.cookie })
    ).body.some((row) => row.id === lifecycle.body.id),
    'The owner can find archived events.',
  );
  check(
    !(
      await request('/api/events?archived=1', { cookie: second.cookie })
    ).body.some((row) => row.id === lifecycle.body.id),
    'Archived events remain isolated by owner.',
  );
  const archivedPublic = await request(lifecyclePath);
  check(
    archivedPublic.body.archived === 1 &&
      archivedPublic.body.open === 0 &&
      archivedPublic.body.tipUrl === null,
    'Public archived events must be closed and hide the payment link.',
  );
  check(
    (
      await request(lifecyclePath, {
        method: 'POST',
        body: { ...testSong, client: `${prefix}-blocked` },
      })
    ).status === 400,
    'Archived events must reject new song requests.',
  );
  check(
    (
      await request(lifecyclePath, {
        method: 'PATCH',
        cookie: first.cookie,
        body: { open: true },
      })
    ).status === 409,
    'Archived events cannot be reopened until restored.',
  );
  const archivedOwner = await request(lifecyclePath, { cookie: first.cookie });
  check(
    archivedOwner.body.tipOpenCount === 1 &&
      archivedOwner.body.requests[0].tipOpened === true,
    'Archived events preserve tip indicators and totals.',
  );
  check(
    (
      await request(`${lifecyclePath}/tip-click`, {
        method: 'POST',
        body: { client: `${prefix}-archived` },
      })
    ).status === 400,
    'Archived events reject new tip clicks.',
  );
  check(
    archivedOwner.body.requests.length === 1 &&
      archivedOwner.body.requests[0].title === testSong.title,
    'Archiving must preserve requests.',
  );
  check(
    (
      await request(lifecyclePath, {
        method: 'PATCH',
        cookie: first.cookie,
        body: { archived: false },
      })
    ).status === 200,
    'The owner can restore an archived event.',
  );
  const restored = await request(lifecyclePath, { cookie: first.cookie });
  check(
    restored.body.archived === 0 &&
      restored.body.open === 0 &&
      restored.body.tipUrl === 'https://paypal.me/TestDJ',
    'Restoring preserves the tip link and keeps requests paused.',
  );
  check(
    restored.body.requests.length === 1 &&
      restored.body.requests[0].image === testSong.image,
    'Restoring must preserve song data and artwork.',
  );
  check(
    (await request('/api/events', { cookie: first.cookie })).body.some(
      (row) => row.id === lifecycle.body.id,
    ),
    'Restored events must return to the active list.',
  );
  check(
    !(
      await request('/api/events?archived=1', { cookie: first.cookie })
    ).body.some((row) => row.id === lifecycle.body.id),
    'Restored events must leave the archive.',
  );
  check(
    (
      await request(lifecyclePath, {
        method: 'DELETE',
        cookie: first.cookie,
        body: { confirmationName: lifecycleName },
      })
    ).status === 200,
    'The owner can delete an event after exact-name confirmation.',
  );
  check(
    (await request(lifecyclePath)).status === 404,
    'Deleted event links must stop resolving.',
  );
  check(
    !(await request('/api/events', { cookie: first.cookie })).body.some(
      (row) => row.id === lifecycle.body.id,
    ),
    'Deleted events must disappear from the active list.',
  );
  check(
    (await request(eventPath, { cookie: first.cookie })).body.requests.length >=
      1,
    'Deleting one event must not affect another event.',
  );
  const orphanCheck = spawnSync(
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
      '--json',
      '--command',
      `SELECT (SELECT COUNT(*) FROM requests WHERE event = '${String(lifecycle.body.id).replaceAll("'", "''")}') + (SELECT COUNT(*) FROM tip_clicks WHERE event = '${String(lifecycle.body.id).replaceAll("'", "''")}') AS total;`,
    ],
    { cwd: root, encoding: 'utf8' },
  );
  check(
    orphanCheck.status === 0 &&
      JSON.parse(orphanCheck.stdout)[0].results[0].total === 0,
    'Deleting an event must leave no orphaned requests or tip clicks in D1.',
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
  const newPassword = `${password}-updated`;
  const otherSession = await request('/api/auth/sign-in/email', {
    method: 'POST',
    ip: testIP(5),
    body: { email: emails[0], password },
  });
  check(
    otherSession.status === 200 && Boolean(otherSession.cookie),
    'Password tests require a second session.',
  );
  check(
    (
      await request('/api/auth/change-password', {
        method: 'POST',
        cookie: login.cookie,
        body: {
          currentPassword: 'wrong-password',
          newPassword,
          revokeOtherSessions: true,
        },
      })
    ).status === 400,
    'Changing the password must verify the current password.',
  );
  check(
    (
      await request('/api/auth/change-password', {
        method: 'POST',
        cookie: login.cookie,
        body: {
          currentPassword: password,
          newPassword: 'short',
          revokeOtherSessions: true,
        },
      })
    ).status === 400,
    'Password updates must enforce the eight-character minimum on the server.',
  );
  const changed = await request('/api/auth/change-password', {
    method: 'POST',
    cookie: login.cookie,
    body: { currentPassword: password, newPassword, revokeOtherSessions: true },
  });
  check(
    changed.status === 200 && Boolean(changed.cookie),
    'A successful password change must preserve the current device session.',
  );
  check(
    (await request('/api/events', { cookie: changed.cookie })).status === 200,
    'The current device must still have access after the password change.',
  );
  check(
    (await request('/api/events', { cookie: otherSession.cookie })).status ===
      401,
    'Other device sessions must be revoked.',
  );
  check(
    (
      await request('/api/auth/sign-in/email', {
        method: 'POST',
        ip: testIP(6),
        body: { email: emails[0], password },
      })
    ).status === 401,
    'The old password must no longer work.',
  );
  check(
    (
      await request('/api/auth/sign-in/email', {
        method: 'POST',
        ip: testIP(6),
        body: { email: emails[0], password: newPassword },
      })
    ).status === 200,
    'The new password must allow sign-in.',
  );
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
