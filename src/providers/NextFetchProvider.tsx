import type { ReactNode } from 'react';

import { requestCache } from '@/cache/requestCache';
import type { CacheEntry, HydrationData } from '@/types/cache';
import { getCurrentTimestamp, isServerEnvironment } from '@/utils';

import CacheHydrator from './CacheHydrator';

interface NextFetchProviderProps {
  children: ReactNode;
}

const generateHydrationScript = (data: HydrationData): string => {
  const serializedData = JSON.stringify(data);

  return `<script id="__NEXT_FETCH_HYDRATION__">
    window.__NEXT_FETCH_HYDRATION__ = ${serializedData};
  </script>`;
};

const collectCacheData = async (): Promise<HydrationData> => {
  try {
    const keys = await requestCache.keys();

    const hydrationEntries = await Promise.all(
      keys.map(async key => {
        const cachedEntry = await requestCache.get<CacheEntry>(key);

        const entry = cachedEntry;

        if (!entry) {
          return null;
        }

        return [
          key,
          {
            data: entry.data,
            timestamp: getCurrentTimestamp(),
            clientRevalidate: entry.clientRevalidate,
            clientTags: entry.clientTags,
            serverTags: entry.serverTags,
          },
        ] as const;
      })
    );

    const validEntries = hydrationEntries.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null
    );

    return Object.fromEntries(validEntries);
  } catch (error) {
    console.warn('Failed to collect cache data:', error);
    return {};
  }
};

const createHydrationScript = (
  hydrationData: HydrationData
): ReactNode => {
  const hasData = Object.keys(hydrationData).length > 0;

  return hasData ? (
    <div
      dangerouslySetInnerHTML={{
        __html: generateHydrationScript(hydrationData),
      }}
    />
  ) : null;
};

const ServerNextFetchProvider = async ({
  children,
}: NextFetchProviderProps) => {
  const content = await requestCache.runWith(async () => {
    const renderedChildren = children;

    const hydrationData = await collectCacheData();
    const hydrationScript = createHydrationScript(hydrationData);

    return (
      <>
        {renderedChildren}
        {hydrationScript}
      </>
    );
  });

  return content;
};

const ClientNextFetchProvider = ({ children }: NextFetchProviderProps) => (
  <>
    <CacheHydrator />
    {children}
  </>
);

export const NextFetchProvider = ({ children }: NextFetchProviderProps) =>
  isServerEnvironment() ? (
    <ServerNextFetchProvider>{children}</ServerNextFetchProvider>
  ) : (
    <ClientNextFetchProvider>{children}</ClientNextFetchProvider>
  );
