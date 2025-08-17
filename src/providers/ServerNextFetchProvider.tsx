import type { ReactNode } from 'react';

import { requestCache } from '@/cache/requestCache';
import type { NextFetchProviderProps } from '@/providers/NextFetchProvider';
import type { ClientCacheEntry, HydrationData } from '@/types/cache';

type ServerNextFetchProviderProps = Omit<NextFetchProviderProps, 'instance'>;

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
        const entry = await requestCache.get<ClientCacheEntry>(key);

        if (!entry) {
          return null;
        }

        return [
          key,
          {
            data: entry.data,
            clientRevalidate: entry.clientRevalidate,
            clientTags: entry.clientTags,
            serverTags: entry.serverTags,
            etag: entry.etag,
          },
        ] as const;
      })
    );

    const validEntries = hydrationEntries.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null
    );

    return Object.fromEntries(validEntries);
  } catch (error) {
    console.warn(
      '[next-fetch] Failed to collect cache data for hydration:',
      error
    );
    return {};
  }
};

const createHydrationScript = (hydrationData: HydrationData): ReactNode => {
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
}: ServerNextFetchProviderProps) => {
  const content = await requestCache.runWith(async () => {
    const renderedChildren = <>{children}</>;

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

export default ServerNextFetchProvider;
