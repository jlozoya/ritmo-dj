import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  isNull,
  sql,
} from 'drizzle-orm';
import { getDb } from '@/server/db';
import { events, requests, tipClicks } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { spotifyArtwork } from '@/server/spotify/artwork';
import { parseTipLink } from '@/features/tips/lib/tip-link';
import type { RequestStatus } from '@/types/music';

export function listEvents(owner: string, archived = false) {
  return getDb()
    .select()
    .from(events)
    .where(and(eq(events.owner, owner), eq(events.archived, Number(archived))))
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
    archived: 0,
    tipUrl: null,
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
        .select({
          ...getTableColumns(requests),
          tipOpened: sql<boolean>`${tipClicks.client} is not null`.mapWith(
            Boolean,
          ),
        })
        .from(requests)
        .leftJoin(
          tipClicks,
          and(
            eq(tipClicks.event, requests.event),
            eq(tipClicks.client, requests.client),
          ),
        )
        .where(eq(requests.event, id))
        .orderBy(desc(requests.created))
    : [];
  const [tipTotal] = owner
    ? await getDb()
        .select({ total: count() })
        .from(tipClicks)
        .where(eq(tipClicks.event, id))
    : [];
  // Backfill older requests in small batches; Spotify outages leave the queue usable.
  await Promise.all(
    rows
      .filter((row) => !row.image && spotifyArtwork.canResolve(row.spotify))
      .slice(0, 4)
      .map(async (row) => {
        const image = await spotifyArtwork.resolve(row.spotify);
        if (!image) return;
        row.image = image;
        await getDb()
          .update(requests)
          .set({ image })
          .where(and(eq(requests.id, row.id), isNull(requests.image)))
          .catch(() => {
            // A transient write failure must not hide the requests or artwork.
          });
      }),
  );
  return {
    id: event.id,
    name: event.name,
    open: event.open,
    archived: event.archived,
    tipUrl: event.archived && !owner ? null : event.tipUrl,
    owner,
    ...(owner ? { tipOpenCount: tipTotal?.total || 0 } : {}),
    requests: rows,
  };
}

export async function recordTipClick(
  id: string,
  body: Record<string, unknown>,
) {
  const event = await findEvent(id);
  if (!event || event.archived || !event.tipUrl)
    throw new HttpError(
      400,
      'Las propinas no están disponibles para este evento.',
    );
  if (
    typeof body.client !== 'string' ||
    !body.client.trim() ||
    body.client.length > 80
  )
    throw new HttpError(400, 'El identificador del visitante no es válido.');
  // One opening per browser and event, including clicks before a song is requested.
  await getDb()
    .insert(tipClicks)
    .values({
      event: id,
      client: body.client,
      created: new Date().toISOString(),
    })
    .onConflictDoNothing();
  return { ok: true };
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
  if (typeof body.archived === 'boolean') {
    await db
      .update(events)
      .set({ archived: Number(body.archived), open: 0 })
      .where(eq(events.id, id));
    return { ok: true };
  }
  if (event.archived)
    throw new HttpError(409, 'Restaura el evento antes de modificarlo.');
  if (Object.hasOwn(body, 'tipUrl')) {
    if (body.tipUrl !== null && typeof body.tipUrl !== 'string')
      throw new HttpError(400, 'El enlace de propinas no es válido.');
    const value = typeof body.tipUrl === 'string' ? body.tipUrl.trim() : '';
    const link = value ? parseTipLink(value) : null;
    if (value && !link)
      throw new HttpError(
        400,
        'Usa un enlace HTTPS de PayPal.Me o Mercado Pago.',
      );
    await db
      .update(events)
      .set({ tipUrl: link?.url || null })
      .where(eq(events.id, id));
  } else if (typeof body.open === 'boolean') {
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

export async function deleteEvent(
  id: string,
  userId: string | undefined,
  body: Record<string, unknown>,
) {
  const event = await findEvent(id);
  if (!event || userId !== event.owner) throw new HttpError(403, 'Sin acceso');
  if (body.confirmationName !== event.name)
    throw new HttpError(
      400,
      'Escribe el nombre exacto del evento para eliminarlo.',
    );
  const db = getDb();
  await db.batch([
    db.delete(requests).where(eq(requests.event, id)),
    db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.owner, event.owner))),
  ]);
  return { ok: true };
}

export async function createSongRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const event = await findEvent(id);
  if (!event || !event.open || event.archived)
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
  const spotify =
    typeof body.spotify === 'string' &&
    /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(body.spotify)
      ? body.spotify
      : '';
  if (!title || !artist || !spotify)
    throw new HttpError(400, 'Selecciona una canción de Spotify.');
  if (!client)
    throw new HttpError(400, 'Recarga la página e intenta enviar la petición.');
  const db = getDb();
  const [recent] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.event, id), eq(requests.client, client)))
    .orderBy(desc(requests.created))
    .limit(1);
  if (recent && Date.now() - Date.parse(recent.created) < 30_000)
    throw new HttpError(429, 'Espera 30 segundos entre peticiones.');
  await db.insert(requests).values({
    id: crypto.randomUUID(),
    event: id,
    title,
    artist,
    guest: guest || 'Anónimo',
    client,
    message: String(body.message || '').slice(0, 240),
    spotify,
    image:
      typeof body.image === 'string' &&
      /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(body.image) &&
      body.image.length <= 2048
        ? body.image
        : null,
    status: 'pending',
    created: new Date().toISOString(),
  });
  return { ok: true };
}
