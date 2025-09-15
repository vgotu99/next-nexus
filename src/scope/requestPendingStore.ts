import { AsyncLocalStorage } from 'async_hooks';

interface PendingState {
  count: number;
  reservations: number;
  started: boolean;
  renderSettled: boolean;
  waiters: Array<() => void>;
  startedWaiters: Array<() => void>;
  renderSettledWaiters: Array<() => void>;
}

const storage = new AsyncLocalStorage<PendingState>();

const ensureState = (): PendingState => {
  const store = storage.getStore();

  if (store) return store;

  const initialState: PendingState = {
    count: 0,
    reservations: 0,
    started: false,
    renderSettled: false,
    waiters: [],
    startedWaiters: [],
    renderSettledWaiters: [],
  };

  storage.enterWith(initialState);

  return initialState;
};

const flush = (list: Array<() => void>): void => {
  if (list.length === 0) return;

  const copy = list.slice();

  list.length = 0;

  copy.forEach(fn => fn());
};

const signalStarted = (store: PendingState): void => {
  if (store.started) return;

  store.started = true;

  flush(store.startedWaiters);
};

const signalRenderSettled = (store: PendingState): void => {
  if (store.renderSettled) return;

  store.renderSettled = true;

  flush(store.renderSettledWaiters);

  if (store.count === 0 && store.reservations === 0) {
    flush(store.waiters);
  }
};

export const markRenderSettled = (): void => {
  const store = ensureState();

  signalRenderSettled(store);
};

const signalMaybeAllClear = (store: PendingState): void => {
  if (store.count !== 0 || store.reservations !== 0) return;

  if (!store.renderSettled) return;

  flush(store.waiters);
};

export const enterPendingStore = (): void => {
  ensureState();
};

export const reservePending = (): void => {
  const store = ensureState();

  const wasZero = store.reservations === 0;
  store.reservations += 1;

  if (!store.started && wasZero) {
    flush(store.startedWaiters);
  }
};

export const releaseReservation = (): void => {
  const store = storage.getStore();

  if (!store) return;

  store.reservations = Math.max(0, store.reservations - 1);

  signalMaybeAllClear(store);
};

export const incPending = (): void => {
  const store = ensureState();

  signalStarted(store);

  store.count += 1;

  if (store.reservations > 0) store.reservations -= 1;
};

export const decPending = (): void => {
  const store = storage.getStore();

  if (!store) return;

  store.count = Math.max(0, store.count - 1);

  signalMaybeAllClear(store);
};

const waitForStartOrSettled = async (store: PendingState): Promise<void> => {
  if (store.started || store.reservations > 0 || store.renderSettled) return;

  await new Promise<void>(resolve => {
    let called = false;

    const once = () => {
      if (called) return;

      called = true;

      resolve();
    };

    store.startedWaiters.push(once);
    store.renderSettledWaiters.push(once);
  });
};

export const waitForAll = async (): Promise<void> => {
  const store = storage.getStore();

  if (!store) return;

  await waitForStartOrSettled(store);

  if (store.renderSettled && store.count === 0 && store.reservations === 0)
    return;

  await new Promise<void>(resolve => {
    store.waiters.push(resolve);
  });
};
