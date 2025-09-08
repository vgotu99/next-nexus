import { AsyncLocalStorage } from 'async_hooks';

interface PendingState {
  count: number;
  started: boolean;
  waiters: Array<() => void>;
  startedWaiters: Array<() => void>;
}

const storage = new AsyncLocalStorage<PendingState>();

const ensureState = (): PendingState => {
  const store = storage.getStore();

  if (store) return store;

  const initialState: PendingState = {
    count: 0,
    started: false,
    waiters: [],
    startedWaiters: [],
  };

  storage.enterWith(initialState);

  return initialState;
};

const signalStarted = (store: PendingState): void => {
  if (store.started) return;

  store.started = true;

  if (store.startedWaiters.length === 0) return;

  const list = store.startedWaiters;

  store.startedWaiters = [];

  list.forEach(fn => {
    fn();
  });
};

const signalAllDone = (store: PendingState): void => {
  if (store.count !== 0 || store.waiters.length === 0) return;

  const list = store.waiters;

  store.waiters = [];

  list.forEach(fn => {
    fn();
  });
};

const waitForStart = async (store: PendingState): Promise<void> => {
  if (store.started) return;

  const MICRO_YIELD_LIMIT = 2 as const;
  const MACRO_YIELD_LIMIT = 1 as const;

  const raceStartOrMicro = () => {
    return Promise.race([
      new Promise<void>(resolve => {
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(resolve);
        } else {
          Promise.resolve().then(resolve);
        }
      }),
      new Promise<void>(resolve => store.startedWaiters.push(resolve)),
    ]);
  };

  const raceStartOrMacro = () => {
    return Promise.race([
      new Promise<void>(resolve => setTimeout(resolve, 0)),
      new Promise<void>(resolve => store.startedWaiters.push(resolve)),
    ]);
  };

  const spinMicro = async (remaining: number): Promise<void> => {
    if (store.started || remaining <= 0) return;

    await raceStartOrMicro();

    if (store.started) return;

    return spinMicro(remaining - 1);
  };

  await spinMicro(MICRO_YIELD_LIMIT);

  if (store.started) return;

  const spinMacro = async (remaining: number): Promise<void> => {
    if (store.started || remaining <= 0) return;

    await raceStartOrMacro();
  };

  await spinMacro(MACRO_YIELD_LIMIT);
};

export const enterPendingStore = (): void => {
  ensureState();
};

export const runWithPendingStore = async <T>(
  callback: () => Promise<T> | T
): Promise<T> => {
  ensureState();

  return callback();
};

export const incPending = (): void => {
  const store = ensureState();

  signalStarted(store);

  store.count += 1;
};

export const decPending = (): void => {
  const store = storage.getStore();

  if (!store) return;

  store.count = Math.max(0, store.count - 1);

  signalAllDone(store);
};

export const waitForAll = async (): Promise<void> => {
  const store = storage.getStore();

  if (!store) return;

  await waitForStart(store);

  if (!store.started) return;
  if (store.count === 0) return;

  await new Promise<void>(resolve => {
    store.waiters.push(resolve);
  });
};
