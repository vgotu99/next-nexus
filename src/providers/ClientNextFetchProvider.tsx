import CacheHydrator from '@/cache/CacheHydrator';
import { NextFetchContext } from '@/context/NextFetchContext';
import nextFetch from '@/core';
import NextFetchClientInitializer from '@/core/NextFetchClientInitializer';
import type { NextFetchProviderProps } from '@/providers/NextFetchProvider';

const ClientNextFetchProvider = ({
  children,
  instance,
}: NextFetchProviderProps) => {
  const defaultNextFetchInstance = instance || nextFetch.create();

  return (
    <NextFetchContext.Provider value={{ instance: defaultNextFetchInstance }}>
      <NextFetchClientInitializer>
        <CacheHydrator />
        {children}
      </NextFetchClientInitializer>
    </NextFetchContext.Provider>
  );
};

export default ClientNextFetchProvider;
