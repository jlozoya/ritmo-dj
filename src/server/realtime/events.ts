import { env, waitUntil } from 'cloudflare:workers';
import {
  createEventToken,
  eventChannel,
  publishEventChange,
} from './ably-protocol';
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { events } from '@/server/db/schema';
import { deliverEventChange } from './delivery';

export function realtimeAvailable(retryAfter: number) {
  return Boolean(env.ABLY_API_KEY?.trim()) && retryAfter <= Date.now();
}

export async function eventSubscription(eventId: string, retryAfter: number) {
  const apiKey = env.ABLY_API_KEY?.trim();
  if (!apiKey || !realtimeAvailable(retryAfter)) return { enabled: false };
  return {
    enabled: true,
    channel: eventChannel(eventId),
    token: await createEventToken(apiKey, eventId),
  };
}

export function notifyEventChange(eventId: string) {
  const apiKey = env.ABLY_API_KEY?.trim();
  if (!apiKey) return;
  waitUntil(
    (async () => {
      const db = getDb();
      const result = await deliverEventChange({
        async readRetryAfter() {
          const [event] = await db
            .select({ retryAfter: events.realtimeRetryAfter })
            .from(events)
            .where(eq(events.id, eventId));
          return event?.retryAfter || 0;
        },
        async saveRetryAfter(until) {
          await db
            .update(events)
            .set({ realtimeRetryAfter: until })
            .where(eq(events.id, eventId));
        },
        publish: () => publishEventChange(apiKey, eventId),
      });
      if (result === 'failed') {
        console.warn(
          '[realtime] Delivery unavailable; polling will recover saved changes.',
        );
      }
    })().catch(() => {
      console.warn(
        '[realtime] Delivery unavailable; safety reads remain active.',
      );
    }),
  );
}
