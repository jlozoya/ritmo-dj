import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createArtworkResolver } from '../../src/server/spotify/artwork-resolver.ts';

const id = '2cGxRwrMyEAp8dEbuZaVv6';
const url = `https://open.spotify.com/track/${id}`;
const image =
  'https://i.scdn.co/image/ab67616d00001e029b9b36b0e22870b9f542d937';

test('concurrent requests for the same Spotify track share its exact artwork lookup', async () => {
  let calls = 0;
  const resolver = createArtworkResolver(async (trackId) => {
    assert.equal(trackId, id);
    calls++;
    return image;
  });
  assert.deepEqual(
    await Promise.all([
      resolver.resolve(url),
      resolver.resolve(`${url}?si=test`),
    ]),
    [image, image],
  );
  assert.equal(await resolver.resolve(url), image);
  assert.equal(calls, 1);
});

test('untrusted URLs cannot cause arbitrary remote artwork lookups', async () => {
  const resolver = createArtworkResolver(async () =>
    assert.fail('Unexpected lookup'),
  );
  for (const invalid of [
    `https://example.test/track/${id}`,
    `https://open.spotify.com.evil.test/track/${id}`,
    `https://open.spotify.com/album/${id}`,
    'https://open.spotify.com/track/short',
    '',
  ]) {
    assert.equal(resolver.canResolve(invalid), false);
    assert.equal(await resolver.resolve(invalid), null);
  }
});

test('a Spotify outage does not throw and postpones retries without starving other tracks', async () => {
  let now = 0;
  let calls = 0;
  const resolver = createArtworkResolver(
    async () => {
      calls++;
      if (calls === 1) throw new Error('Spotify unavailable');
      return image;
    },
    () => now,
  );
  assert.equal(await resolver.resolve(url), null);
  assert.equal(resolver.canResolve(url), false);
  assert.equal(
    resolver.canResolve(
      'https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV',
    ),
    true,
  );
  assert.equal(await resolver.resolve(url), null);
  assert.equal(calls, 1);
  now = 5 * 60 * 1000;
  assert.equal(resolver.canResolve(url), true);
  assert.equal(await resolver.resolve(url), image);
  assert.equal(calls, 2);
});

test('only Spotify artwork URLs are accepted', async () => {
  for (const unsafe of [
    'http://i.scdn.co/image/test',
    'https://example.test/cover.jpg',
    null,
  ]) {
    const resolver = createArtworkResolver(async () => unsafe);
    assert.equal(await resolver.resolve(url), null);
    assert.equal(resolver.canResolve(url), false);
  }
});
