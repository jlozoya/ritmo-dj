import { api } from '@/lib/http';

type Subscription =
  { enabled: false } | { enabled: true; channel: string; token: string };

export function subscribeToEvent(
  eventId: string,
  onChange: () => void,
  onLive: (live: boolean) => void,
) {
  let stopped = false;
  let close: (() => void) | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  const controller = new AbortController();
  const authorize = () =>
    api<Subscription>(
      `/api/event/${encodeURIComponent(eventId)}/realtime`,
      {},
      'POST',
      controller.signal,
    );

  function retry() {
    if (stopped || retryTimer !== undefined) return;
    generation++;
    onLive(false);
    const stopClient = close;
    close = undefined;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void connect().catch(retry);
    }, 30000);
    stopClient?.();
  }

  async function connect() {
    const attempt = ++generation;
    const initial = await authorize();
    if (stopped || attempt !== generation) return;
    if (!initial.enabled) {
      retry();
      return;
    }
    const { Realtime } = await import('ably');
    if (stopped || attempt !== generation) return;
    const client = new Realtime({
      token: initial.token,
      transports: ['web_socket'],
      authCallback: (_params, callback) => {
        void authorize()
          .then((subscription) => {
            if (!subscription.enabled) throw new Error('Realtime unavailable');
            callback(null, subscription.token);
          })
          .catch(() => callback('No fue posible renovar la conexión.', null));
      },
      logLevel: 0,
      autoConnect: false,
    });
    close = () => client.close();
    const channel = client.channels.get(initial.channel);
    const status = () => {
      if (!stopped && attempt === generation)
        onLive(
          client.connection.state === 'connected' &&
            channel.state === 'attached',
        );
    };
    client.connection.on(() => {
      if (stopped || attempt !== generation) return;
      status();
      if (client.connection.state === 'failed') retry();
    });
    channel.on((change) => {
      if (stopped || attempt !== generation) return;
      status();
      if (change.reason) onChange();
      if (channel.state === 'failed' || change.reason?.statusCode === 429)
        retry();
    });
    client.connect();
    await channel.subscribe('changed', () => {
      if (!stopped && attempt === generation) onChange();
    });
    status();
  }
  void connect().catch(retry);

  return () => {
    stopped = true;
    generation++;
    controller.abort();
    if (retryTimer !== undefined) clearTimeout(retryTimer);
    close?.();
  };
}
