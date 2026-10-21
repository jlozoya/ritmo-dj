type DeliveryOptions = {
  readRetryAfter: () => Promise<number>;
  saveRetryAfter: (until: number) => Promise<void>;
  publish: () => Promise<void>;
  now?: () => number;
};

/** Persistent cooldown is shared by all Worker instances serving this event. */
export async function deliverEventChange({
  readRetryAfter,
  saveRetryAfter,
  publish,
  now = Date.now,
}: DeliveryOptions) {
  if ((await readRetryAfter()) > now()) return 'paused';
  try {
    await publish();
    return 'delivered';
  } catch {
    await saveRetryAfter(now() + 60000);
    return 'failed';
  }
}
