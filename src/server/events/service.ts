import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { events, requests } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import type { RequestStatus } from '@/types/music';

export function listEvents(owner: string) {
  return getDb()
    .select()
    .from(events)
    .where(eq(events.owner, owner))
    .orderBy(desc(events.created));
}

export async function createEvent(
  owner: string,
  body: Record<string, unknown>,
) {
  const name = String(body.name || '')
    .trim()
    .slice(0, 80);
  if (!name) throw new HttpError(400, 'Escribe el nombre del evento.');
  const event = {
    id: crypto.randomUUID(),
    owner,
    name,
    open: 1,
    created: new Date().toISOString(),
  };
  await getDb().insert(events).values(event);
  return event;
}

async function findEvent(id: string) {
  const [event] = await getDb().select().from(events).where(eq(events.id, id));
  return event;
}

export async function getEvent(id: string, userId?: string) {
  const event = await findEvent(id);
  if (!event) throw new HttpError(404, 'Evento no encontrado');
  const owner = userId === event.owner;
  const rows = owner
    ? await getDb()
        .select()
        .from(requests)
        .where(eq(requests.event, id))
        .orderBy(desc(requests.created))
    : [];
  return {
    id: event.id,
    name: event.name,
    open: event.open,
    owner,
    requests: rows,
  };
}

const requestStatuses: RequestStatus[] = [
  'pending',
  'accepted',
  'played',
  'rejected',
];
function isStatus(value: unknown): value is RequestStatus {
  return (
    typeof value === 'string' &&
    requestStatuses.includes(value as RequestStatus)
  );
}

export async function updateEvent(
  id: string,
  userId: string | undefined,
  body: Record<string, unknown>,
) {
  const event = await findEvent(id);
  if (!event || userId !== event.owner) throw new HttpError(403, 'Sin acceso');
  const db = getDb();
  if (typeof body.open === 'boolean') {
    await db
      .update(events)
      .set({ open: body.open ? 1 : 0 })
      .where(eq(events.id, id));
  } else if (typeof body.requestId === 'string' && isStatus(body.status)) {
    await db
      .update(requests)
      .set({ status: body.status })
      .where(and(eq(requests.event, id), eq(requests.id, body.requestId)));
  } else {
    throw new HttpError(400, 'Cambio inválido');
  }
  return { ok: true };
}

export async function createSongRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const event = await findEvent(id);
  if (!event || !event.open)
    throw new HttpError(400, 'Este evento no acepta peticiones.');
  const title = String(body.title || '')
    .trim()
    .slice(0, 120);
  const artist = String(body.artist || '')
    .trim()
    .slice(0, 120);
  const guest = String(body.guest || 'Anónimo')
    .trim()
    .slice(0, 60);
  const client = String(body.client || '').slice(0, 80);
  if (!title || !artist || !client)
    throw new HttpError(400, 'Escribe la canción y el artista.');
  const db = getDb();
  const [recent] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.event, id), eq(requests.client, client)))
    .orderBy(desc(requests.created))
    .limit(1);
  if (recent && Date.now() - Date.parse(recent.created) < 30_000)
    throw new HttpError(429, 'Espera 30 segundos entre peticiones.');
  const spotify =
    typeof body.spotify === 'string' &&
    /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(body.spotify)
      ? body.spotify
      : '';
  await db.insert(requests).values({
    id: crypto.randomUUID(),
    event: id,
    title,
    artist,
    guest: guest || 'Anónimo',
    client,
    message: String(body.message || '').slice(0, 240),
    spotify,
    status: 'pending',
    created: new Date().toISOString(),
  });
  return { ok: true };
}
