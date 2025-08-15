import { MAX_CACHE_KEY_LENGTH } from '@/constants/cache';
import { isServerEnvironment } from '@/utils/environmentUtils';

interface AsyncLocalStorageInterface<T> {
  getStore(): T | undefined;
  run<R>(store: T, callback: () => R): R;
  enterWith(store: T): void;
}

declare const AsyncLocalStorage:
  | {
      new <T>(): AsyncLocalStorageInterface<T>;
    }
  | undefined;

type CacheStore = Map<string, unknown>;
type AsyncLocalStorageInstance = AsyncLocalStorageInterface<CacheStore> | null;

const createAsyncLocalStorage = (): AsyncLocalStorageInstance =>
  isServerEnvironment() && typeof AsyncLocalStorage !== 'undefined'
    ? new AsyncLocalStorage<CacheStore>()
    : null;

const getAsyncLocalStorage = (() => {
  const instance = createAsyncLocalStorage();
  return () => instance;
})();

const getStore = (): CacheStore | null => {
  const asyncLocalStorage = getAsyncLocalStorage();
  return asyncLocalStorage ? asyncLocalStorage.getStore() || null : null;
};

const validateCacheKey = (key: string): boolean => {
  if (typeof key !== 'string' || !key) return false;
  return key.length <= MAX_CACHE_KEY_LENGTH && !key.includes('\n');
};

const createCacheOperationResult = <T>(
  store: CacheStore | null,
  operation: (store: CacheStore) => T,
  fallback: T
): T => (store ? operation(store) : fallback);

const get = async <T = unknown>(key: string): Promise<T | null> => {
  if (!validateCacheKey(key)) {
    return null;
  }

  return createCacheOperationResult(
    getStore(),
    store => (store.get(key) as T) || null,
    null
  );
};

const set = async <T = unknown>(key: string, value: T): Promise<void> => {
  if (!validateCacheKey(key)) {
    return;
  }

  const store = getStore();
  if (store) {
    store.set(key, value);
  }
};

const clear = async (): Promise<void> => {
  const store = getStore();
  if (store) {
    store.clear();
  }
};

const keys = async (): Promise<string[]> => {
  return createCacheOperationResult(
    getStore(),
    store => Array.from(store.keys()),
    []
  );
};

const runWith = async <T = unknown>(
  callback: () => Promise<T> | T
): Promise<T> => {
  const asyncLocalStorage = getAsyncLocalStorage();

  return asyncLocalStorage
    ? asyncLocalStorage.run(new Map<string, unknown>(), callback)
    : await callback();
};

export const requestCache = {
  get,
  set,
  clear,
  keys,
  runWith,
};
