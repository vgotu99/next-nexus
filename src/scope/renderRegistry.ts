import { AsyncLocalStorage } from 'async_hooks';

const registryStorage = new AsyncLocalStorage<boolean>();

export const runWithDelegationEnabled = <T>(callback: () => T): T => {
  return registryStorage.run(true, callback);
};

export const isDelegationEnabled = (): boolean => {
  return registryStorage.getStore() ?? false;
};
