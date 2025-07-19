export const isClientEnvironment = (): boolean => {
  return typeof window !== 'undefined';
};

export const isServerEnvironment = (): boolean => {
  return typeof window === 'undefined';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

export const isCacheApiSupported = (): boolean => {
  return isClientEnvironment() && 'caches' in window;
};

export const isLocalStorageSupported = (): boolean => {
  if (!isClientEnvironment()) {
    return false;
  }

  try {
    const testKey = '__next_fetch_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const isSessionStorageSupported = (): boolean => {
  if (!isClientEnvironment()) {
    return false;
  }

  try {
    const testKey = '__next_fetch_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const isIndexedDBSupported = (): boolean => {
  return isClientEnvironment() && 'indexedDB' in window;
};

export const isNextJsEnvironment = (): boolean => {
  return (
    typeof process !== 'undefined' &&
    (process.env.NEXT_RUNTIME !== undefined ||
      process.env.__NEXT_ROUTER_BASEPATH !== undefined ||
      (typeof window !== 'undefined' && '__NEXT_DATA__' in window))
  );
};

export const getEnvironmentName = (): string => {
  if (isDevelopment()) return 'development';
  if (isProduction()) return 'production';
  if (isTest()) return 'test';
  return 'unknown';
};

export const isSSR = (): boolean => {
  return isServerEnvironment() && isNextJsEnvironment();
};

export const isHydrating = (): boolean => {
  return (
    isClientEnvironment() &&
    isNextJsEnvironment() &&
    !document.querySelector('[data-reactroot]')
  );
};
