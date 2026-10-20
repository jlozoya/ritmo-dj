import { headers } from 'next/headers';
import { getAuth } from '@/server/auth/auth';

export async function getDJUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session
    ? { userId: session.user.id, displayName: session.user.name }
    : null;
}

export function isSameOrigin(request: Request) {
  return (
    request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  );
}
