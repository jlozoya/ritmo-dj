type TokenResponse = { access_token: string; expires_in: number };

let cachedToken: { value: string; expiresAt: number } | null = null;

export function clearSpotifyToken() {
  cachedToken = null;
}

export async function getSpotifyToken(
  clientId: string,
  clientSecret: string,
  signal?: AbortSignal,
): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now())
    return cachedToken.value;
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    signal,
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
