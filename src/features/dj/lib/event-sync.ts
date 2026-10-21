export type EventSyncMode = 'realtime' | 'polling';

type SyncOptions = {
  refresh: () => Promise<boolean | void>;
  onError: (error: unknown) => void;
  onMode: (mode: EventSyncMode) => void;
  schedule?: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
};

/** Serialize reads, coalesce bursts and recover missed messages on reconnection. */
export function startEventSync({
  refresh,
  onError,
  onMode,
  schedule = setTimeout,
  cancel = clearTimeout,
}: SyncOptions) {
  let stopped = false;
  let live = false;
  let readFailed = false;
  let serverAvailable = true;
  let running = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let mode: EventSyncMode = 'polling';

  function arm() {
    if (timer !== undefined) cancel(timer);
    if (stopped) return;
    const next =
      live && serverAvailable && !readFailed ? 'realtime' : 'polling';
    if (mode !== next) {
      mode = next;
      onMode(mode);
    }
    // An infrequent safety read also recovers a failed server-side publication.
    timer = schedule(
      () => {
        void update();
      },
      mode === 'realtime' ? 15000 : 3000,
    );
  }

  async function update() {
    if (stopped) return;
    if (running) {
      pending = true;
      return;
    }
    running = true;
    do {
      pending = false;
      try {
        serverAvailable = (await refresh()) !== false;
        readFailed = false;
      } catch (error) {
        readFailed = true;
        if (!stopped) onError(error);
      }
    } while (pending && !stopped);
    running = false;
    arm();
  }

  onMode(mode);
  arm();
  void update();
  return {
    changed: () => {
      void update();
    },
    connected(value: boolean) {
      if (stopped) return;
      live = value;
      arm();
      // Fetch after attach/resume so the handshake cannot leave a gap.
      if (value) void update();
    },
    stop() {
      stopped = true;
      if (timer !== undefined) cancel(timer);
    },
  };
}
