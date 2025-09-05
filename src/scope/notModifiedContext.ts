import { AsyncLocalStorage } from 'async_hooks';

const notModifiedKeyStorage = new AsyncLocalStorage<Set<string>>();

export const enterNotModifiedContext = (): void => {
  notModifiedKeyStorage.enterWith(new Set<string>());
};

export const registerNotModifiedKey = (cacheKey: string): void => {
  notModifiedKeyStorage.getStore()?.add(cacheKey);
};

export const getNotModifiedKeys = (): string[] => {
  const store = notModifiedKeyStorage.getStore();
  return store ? Array.from(store) : [];
};
