import { env } from 'cloudflare:workers';
import { createArtworkResolver } from '@/server/spotify/artwork-resolver';
import { clearSpotifyToken, getSpotifyToken } from '@/server/spotify/token';

export const spotifyArtwork = createArtworkResolver(async (id) => {
  const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret } =
    env as unknown as Record<string, string | undefined>;
  if (!clientId || !clientSecret) return null;
  const signal = AbortSignal.timeout(2500);
  const token = await getSpotifyToken(clientId, clientSecret, signal);
  const response = await fetch(
    `https://api.spotify.com/v1/tracks/${id}?market=MX`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  if (response.status === 401) clearSpotifyToken();
  if (!response.ok) return null;
  const track = (await response.json()) as {
    id: string;
    linked_from?: { id: string };
    album?: { images?: { url: string; width: number | null }[] };
  };
  if (track.id !== id && track.linked_from?.id !== id) return null;
  const images = track.album?.images || [];
  return (
    images.find((image) => (image.width || 9999) <= 300)?.url ||
    images[0]?.url ||
    null
  );
});
