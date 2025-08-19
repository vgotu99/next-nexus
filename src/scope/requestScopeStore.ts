import { AsyncLocalStorage } from 'async_hooks';

type Store = Map<string, unknown>;

const requsetScopeStorage = new AsyncLocalStorage<Store>();

const getCurrentStore = (): Store | null =>
  requsetScopeStorage.getStore() ?? null;

const isValidKey = (key: string): boolean =>
  typeof key === 'string' && key.length > 0 && !key.includes('\n');

const get = async <T = unknown>(key: string): Promise<T | null> => {
  if (!isValidKey(key)) return null;

  const store = getCurrentStore();

  return store ? ((store.get(key) as T) ?? null) : null;
};

const set = async <T = unknown>(key: string, value: T): Promise<void> => {
  if (!isValidKey(key)) return;

  const store = getCurrentStore();
  if (store) store.set(key, value);
};

const clear = async (): Promise<void> => {
  const store = getCurrentStore();
  if (store) store.clear();
};

const keys = async (): Promise<string[]> => {
  const store = getCurrentStore();
  return store ? Array.from(store.keys()) : [];
};

const runWith = async <T = unknown>(
  callback: () => Promise<T> | T
): Promise<T> => {
  return requsetScopeStorage.run(new Map<string, unknown>(), callback);
};

export const requestScopeStore = {
  get,
  set,
  clear,
  keys,
  runWith,
};
