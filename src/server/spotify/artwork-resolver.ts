type Lookup = (trackId: string) => Promise<string | null>;

function trackId(url: string) {
  return /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})(?:\?[^#]*)?$/.exec(
    url,
  )?.[1];
}

/** Deduplicate concurrent lookups and defer retries after Spotify failures. */
export function createArtworkResolver(lookup: Lookup, now = Date.now) {
  const cache = new Map<
    string,
    { result: Promise<string | null>; expiresAt: number; failed: boolean }
  >();

  return {
    canResolve(url: string) {
      const id = trackId(url);
      if (!id) return false;
      const entry = cache.get(id);
      return !entry || !entry.failed || entry.expiresAt <= now();
    },
    resolve(url: string): Promise<string | null> {
      const id = trackId(url);
      if (!id) return Promise.resolve(null);
      const cached = cache.get(id);
      if (cached && cached.expiresAt > now()) return cached.result;
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      const entry = {
        result: Promise.resolve<string | null>(null),
        expiresAt: now() + 60 * 60 * 1000,
        failed: false,
      };
      entry.result = Promise.resolve()
        .then(() => lookup(id))
        .then((image) =>
          image && /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(image)
            ? image
            : null,
        )
        .catch(() => null)
        .then((image) => {
          if (!image) {
            entry.failed = true;
            entry.expiresAt = now() + 5 * 60 * 1000;
          }
          return image;
        });
      cache.set(id, entry);
      return entry.result;
    },
  };
}
