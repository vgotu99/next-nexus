'use client';

import { useEffect } from 'react';

import CacheHydrator from '@/cache/CacheHydrator';
import { clientCacheStore } from '@/cache/clientCacheStore';
import NextFetchClientInitializer from '@/core/NextFetchClientInitializer';
import type { NextFetchProviderProps } from '@/providers/NextFetchProvider';

const ClientNextFetchProvider = ({
  children,
  maxSize,
}: NextFetchProviderProps) => {
  useEffect(() => {
    if (maxSize) {
      clientCacheStore.setMaxSize(maxSize);
    }
  }, [maxSize]);

  return (
    <NextFetchClientInitializer>
      <CacheHydrator />
      {children}
    </NextFetchClientInitializer>
  );
};

export default ClientNextFetchProvider;
