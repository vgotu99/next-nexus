export const normalizeHttpMethod = (method?: string): string => {
  return (method || 'GET').toUpperCase();
};

export const createCacheKey = (url: string, method?: string): string => {
  return `${normalizeHttpMethod(method)}:${url}`;
};

export const isCacheApiSupported = (): boolean => {
  return typeof window !== 'undefined' && 'caches' in window;
};
