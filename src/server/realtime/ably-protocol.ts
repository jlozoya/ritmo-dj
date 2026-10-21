/** Only invalidations leave Ritmo; request contents stay behind its own API. */
export function eventChannel(eventId: string) {
  return `ritmo:event:${encodeURIComponent(eventId).replaceAll('*', '%2A')}`;
}

function keyParts(apiKey: string) {
  const [name, secret, extra] = apiKey.trim().split(':');
  if (!name || !secret || extra !== undefined)
    throw new Error('Invalid Ably key');
  return { name, secret };
}

function base64url(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export async function createEventToken(
  apiKey: string,
  eventId: string,
  now = Date.now(),
) {
  const { name, secret } = keyParts(apiKey);
  const encoder = new TextEncoder();
  const issuedAt = Math.floor(now / 1000);
  const header = base64url(
    encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'HS256', kid: name })),
  );
  const claims = base64url(
    encoder.encode(
      JSON.stringify({
        iat: issuedAt,
        exp: issuedAt + 300,
        'x-ably-capability': JSON.stringify({
          [eventChannel(eventId)]: ['subscribe'],
        }),
      }),
    ),
  );
  const input = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(input),
  );
  return `${input}.${base64url(new Uint8Array(signature))}`;
}

export async function publishEventChange(
  apiKey: string,
  eventId: string,
  send: typeof fetch = fetch,
) {
  keyParts(apiKey);
  // Retry a transient delivery failure without delaying or undoing the saved mutation.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await send(
        `https://rest.ably.io/channels/${encodeURIComponent(eventChannel(eventId))}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(apiKey.trim())}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'changed', data: {} }),
          signal: AbortSignal.timeout(2500),
        },
      );
      if (response.ok) return;
      await response.body?.cancel();
      if (response.status < 500) break;
    } catch {
      // Do not log provider responses or credentials.
    }
  }
  throw new Error('Realtime delivery unavailable');
}
