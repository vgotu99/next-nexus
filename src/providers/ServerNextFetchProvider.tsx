import type { NextFetchProviderProps } from '@/providers/NextFetchProvider';
import {
  getNotModifiedKeys,
  runWithNotModifiedContext,
} from '@/scope/notModifiedContext';
import { requestScopeStore } from '@/scope/requestScopeStore';
import type { ClientCacheEntry } from '@/types/cache';
import { NextFetchPayload } from '@/types/payload';
import { logger } from '@/utils/logger';

type ServerNextFetchProviderProps = Omit<NextFetchProviderProps, 'maxSize'>;

const collectHydrationData = async (notModifiedKeys: readonly string[]) => {
  const allCacheKeys = await requestScopeStore.keys();
  const notModifiedSet = new Set(notModifiedKeys);

  const hydrationCandidateKeys = allCacheKeys.filter(
    key => !notModifiedSet.has(key) && !key.startsWith('__NEXT_FETCH_')
  );

  const hydrationEntries = await Promise.all(
    hydrationCandidateKeys.map(async key => {
      const entry = await requestScopeStore.get<ClientCacheEntry>(key);

      if (!entry) return null;

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
};

const hasPayloadContent = (payload: NextFetchPayload): boolean => {
  return (
    Object.keys(payload.hydrationData).length > 0 ||
    payload.notModifiedKeys.length > 0
  );
};

export const HydrationScript = async () => {
  try {
    const notModifiedKeys = getNotModifiedKeys();

    const hydrationData = await collectHydrationData(notModifiedKeys);

    const payload: NextFetchPayload = {
      hydrationData,
      notModifiedKeys,
    };

    if (!hasPayloadContent(payload)) {
      return null;
    }

    const serializedPayload = JSON.stringify(payload);

    return (
      <script
        id='__NEXT_FETCH_SCRIPT__'
        dangerouslySetInnerHTML={{
          __html: `window.__NEXT_FETCH_PAYLOAD__ = ${serializedPayload};`,
        }}
      />
    );
  } catch (error) {
    logger.warn('[Provider] Failed to generate hydration script', error);
    return null;
  }
};

const ServerNextFetchProvider = ({
  children,
}: ServerNextFetchProviderProps) => {
  return requestScopeStore.runWith(() =>
    runWithNotModifiedContext(() => (
      <>
        {children}
        <HydrationScript />
      </>
    ))
  );
};

export default ServerNextFetchProvider;
