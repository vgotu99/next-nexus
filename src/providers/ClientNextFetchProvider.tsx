import CacheHydrator from '@/cache/CacheHydrator';
import NextFetchClientInitializer from '@/core/NextFetchClientInitializer';
import type { NextFetchProviderProps } from '@/providers/NextFetchProvider';

const ClientNextFetchProvider = ({ children }: NextFetchProviderProps) => {
  return (
    <NextFetchClientInitializer>
      <CacheHydrator />
      {children}
    </NextFetchClientInitializer>
  );
};

export default ClientNextFetchProvider;
