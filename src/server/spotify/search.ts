import { env } from 'cloudflare:workers';
import type { SpotifyTrack } from '@/types/music';

/** Spotify Client Credentials: only metadata, never playback or user data. */
type SpotifyImage = { url: string; width: number | null };
type SpotifyItem = {
  id: string;
  name: string;
  artists: { name: string }[];
  album?: { name?: string; images?: SpotifyImage[] };
  external_urls?: { spotify?: string };
  duration_ms: number;
};
type TokenResponse = { access_token: string; expires_in: number };

let cachedToken: { value: string; expiresAt: number } | null = null;

function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function getToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now())
    return cachedToken.value;
  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 400
        ? 'SPOTIFY_BAD_CREDENTIALS'
        : 'SPOTIFY_TOKEN_ERROR',
    );
  const token = (await response.json()) as TokenResponse;
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + Math.max(0, token.expires_in - 60) * 1000,
  };
  return token.access_token;
}

export async function GET(request: Request) {
  const secrets = env as unknown as Record<string, string | undefined>;
  const clientId = secrets.SPOTIFY_CLIENT_ID;
  const clientSecret = secrets.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    return reply({ configured: false, tracks: [] });

  const query = (new URL(request.url).searchParams.get('q') || '')
    .trim()
    .slice(0, 100);
  if (query.length < 2) return reply({ configured: true, tracks: [] });

  try {
    const token = await getToken(clientId, clientSecret);
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      market: 'MX',
      limit: '10',
    });
    const response = await fetch(
      `https://api.spotify.com/v1/search?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) {
      if (response.status === 429) {
        const data = (await response.json().catch(() => ({}))) as {
          reason?: string;
        };
        return reply(
          {
            configured: true,
            tracks: [],
            error:
              data.reason === 'QUOTA_EXCEEDED'
                ? 'Se agotó temporalmente la cuota de Spotify.'
                : 'Spotify está limitando las búsquedas; inténtalo más tarde.',
          },
          429,
        );
      }
      if (response.status === 403)
        return reply(
          {
            configured: true,
            tracks: [],
            error: 'Spotify no autorizó la búsqueda para esta aplicación.',
          },
          503,
        );
      if (response.status === 401) cachedToken = null;
      throw new Error('SPOTIFY_SEARCH_ERROR');
    }
    const data = (await response.json()) as {
      tracks?: { items?: SpotifyItem[] };
    };
    const tracks: SpotifyTrack[] = (data.tracks?.items || [])
      .filter((item) =>
        Boolean(item.id && item.name && item.external_urls?.spotify),
      )
      .map((item) => ({
        id: item.id,
        title: item.name,
        artist: item.artists.map((artist) => artist.name).join(', '),
        album: item.album?.name || '',
        image:
          item.album?.images?.find((image) => (image.width || 9999) <= 300)
            ?.url ||
          item.album?.images?.[0]?.url ||
          null,
        spotify: item.external_urls!.spotify!,
        durationMs: item.duration_ms,
      }));
    return reply({ configured: true, tracks });
  } catch (error) {
    const message =
      (error as Error).message === 'SPOTIFY_BAD_CREDENTIALS'
        ? 'Las credenciales de Spotify no son válidas.'
        : 'Spotify no está disponible. Puedes escribir la canción manualmente.';
    return reply({ configured: true, tracks: [], error: message }, 503);
  }
}
