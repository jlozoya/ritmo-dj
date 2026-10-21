import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startEventSync } from '../../src/features/dj/lib/event-sync.ts';

const settle = () => new Promise(setImmediate);
function setup(refresh = async () => true) {
  const timers = new Map(),
    modes = [],
    errors = [];
  let next = 0,
    reads = 0;
  const sync = startEventSync({
    refresh: () => {
      reads++;
      return refresh();
    },
    onMode: (mode) => modes.push(mode),
    onError: (e) => errors.push(e),
    schedule: (fn, delay) => {
      const id = ++next;
      timers.set(id, { fn, delay });
      return id;
    },
    cancel: (id) => timers.delete(id),
  });
  return {
    sync,
    timers,
    modes,
    errors,
    reads: () => reads,
    tick() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      timer.fn();
    },
  };
}

test('polls every three seconds until socket attachment and resumes polling on quota/disconnection', async () => {
  const state = setup();
  await settle();
  assert.equal([...state.timers.values()][0].delay, 3000);
  state.sync.connected(true);
  await settle();
  assert.equal(state.modes.at(-1), 'realtime');
  assert.equal([...state.timers.values()][0].delay, 15000);
  state.sync.connected(false); // Includes failed connection/channel quota states.
  assert.equal(state.modes.at(-1), 'polling');
  assert.equal([...state.timers.values()][0].delay, 3000);
  state.tick();
  await settle();
  assert.ok(state.reads() >= 3);
  state.sync.connected(true);
  await settle();
  assert.equal(state.modes.at(-1), 'realtime');
  state.sync.stop();
});

test('a server-side publish quota activates polling even when the WebSocket remains connected', async () => {
  let available = true;
  const state = setup(async () => available);
  await settle();
  state.sync.connected(true);
  await settle();
  available = false;
  state.tick();
  await settle();
  assert.equal(state.modes.at(-1), 'polling');
  assert.equal([...state.timers.values()][0].delay, 3000);
  available = true;
  state.tick();
  await settle();
  assert.equal(state.modes.at(-1), 'realtime');
  state.sync.stop();
});

test('request failures keep fallback alive and recover after the API returns', async () => {
  let fail = true;
  const state = setup(async () => {
    if (fail) throw new Error('Offline');
    return true;
  });
  await settle();
  state.sync.connected(true);
  await settle();
  assert.equal(state.modes.at(-1), 'polling');
  assert.ok(state.errors.length);
  fail = false;
  state.tick();
  await settle();
  assert.equal(state.modes.at(-1), 'realtime');
  state.sync.stop();
});

test('bursts serialize reads and cleanup prevents late messages or reads from restarting timers', async () => {
  const resolvers = [];
  const state = setup(() => new Promise((resolve) => resolvers.push(resolve)));
  state.sync.changed();
  state.sync.changed();
  state.sync.changed();
  assert.equal(state.reads(), 1);
  resolvers.shift()(true);
  await settle();
  assert.equal(state.reads(), 2);
  state.sync.stop();
  state.sync.changed();
  state.sync.connected(true);
  resolvers.shift()(true);
  await settle();
  assert.equal(state.reads(), 2);
  assert.equal(state.timers.size, 0);
});
