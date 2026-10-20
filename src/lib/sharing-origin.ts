export function getSharingOrigin(origin: string, localHosts: string[]) {
  const url = new URL(origin);
  const loopback =
    ['localhost', '0.0.0.0', '[::1]'].includes(url.hostname) ||
    /^127\./.test(url.hostname);
  if (loopback && localHosts[0]) url.hostname = localHosts[0];
  return url.origin;
}
