import type { ReactNode } from 'react';

import { requestCache } from '@/cache/requestCache';
import type { NextFetchProviderProps } from '@/providers/NextFetchProvider';
import type {
  ClientCacheEntry,
  ExtendTTLData,
  HydrationData,
} from '@/types/cache';

type ServerNextFetchProviderProps = Omit<NextFetchProviderProps, 'instance'>;

const generateHydrationScript = (data: HydrationData): string => {
  const serializedData = JSON.stringify(data);

  return `<script id="__NEXT_FETCH_HYDRATION__">
    window.__NEXT_FETCH_HYDRATION__ = ${serializedData};
  </script>`;
};

const generateExtendTTLScript = (data: ExtendTTLData): string => {
  const serializedData = JSON.stringify(data);

  return `<script id="__NEXT_FETCH_EXTEND_TTL__">
    window.__NEXT_FETCH_EXTEND_TTL__ = ${serializedData};
  </script>`;
};

const collectHydrationData = async (): Promise<HydrationData> => {
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
            headers: entry.headers,
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

export const collectExtendTTLData = async (): Promise<ExtendTTLData> => {
  const extendTTLData = await requestCache.get<ExtendTTLData>(
    '__NEXT_FETCH_EXTEND_TTL__'
  );

  return extendTTLData || {};
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

const createExtendTTLScript = (extendData: ExtendTTLData): ReactNode => {
  const hasData = Object.keys(extendData).length > 0;

  return hasData ? (
    <div
      dangerouslySetInnerHTML={{
        __html: generateExtendTTLScript(extendData),
      }}
    />
  ) : null;
};

const ServerNextFetchProvider = async ({
  children,
}: ServerNextFetchProviderProps) => {
  const content = await requestCache.runWith(async () => {
    const renderedChildren = <>{children}</>;

    const hydrationData = await collectHydrationData();
    const extendTTLData = await collectExtendTTLData();
    const hydrationScript = createHydrationScript(hydrationData);
    const extendTTLScript = createExtendTTLScript(extendTTLData);

    return (
      <>
        {renderedChildren}
        {hydrationScript}
        {extendTTLScript}
      </>
    );
  });

  return content;
};

export default ServerNextFetchProvider;
