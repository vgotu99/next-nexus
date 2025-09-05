import { AsyncLocalStorage } from 'async_hooks';

const registryStorage = new AsyncLocalStorage<boolean>();

export const enterDelegationEnabled = (): void => {
  registryStorage.enterWith(true);
};

export const isDelegationEnabled = (): boolean => {
  return registryStorage.getStore() ?? false;
};
