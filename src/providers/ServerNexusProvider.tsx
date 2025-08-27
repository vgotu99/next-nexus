import type { NexusProviderProps } from '@/providers/NexusProvider';
import {
  getNotModifiedKeys,
  runWithNotModifiedContext,
} from '@/scope/notModifiedContext';
import { requestScopeStore } from '@/scope/requestScopeStore';
import type { ClientCacheEntry } from '@/types/cache';
import { NexusPayload } from '@/types/payload';
import { logger } from '@/utils/logger';

type ServerNexusProviderProps = Omit<NexusProviderProps, 'maxSize'>;

const collectHydrationData = async () => {
  const allCacheKeys = await requestScopeStore.keys();

  const hydrationEntries = await Promise.all(
    allCacheKeys.map(async key => {
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

const hasPayloadContent = (payload: NexusPayload): boolean => {
  return (
    Object.keys(payload.hydrationData).length > 0 ||
    payload.notModifiedKeys.length > 0
  );
};

const HydrationScript = async () => {
  try {
    const notModifiedKeys = getNotModifiedKeys();

    const hydrationData = await collectHydrationData();

    const payload: NexusPayload = {
      hydrationData,
      notModifiedKeys,
    };

    if (!hasPayloadContent(payload)) {
      return null;
    }

    const serializedPayload = JSON.stringify(payload);

    return (
      <script
        id='__NEXUS_SCRIPT__'
        dangerouslySetInnerHTML={{
          __html: `window.__NEXUS_PAYLOAD__ = ${serializedPayload};`,
        }}
      />
    );
  } catch (error) {
    logger.warn('[Provider] Failed to generate hydration script', error);
    return null;
  }
};

const ServerNexusProvider = ({ children }: ServerNexusProviderProps) => {
  return requestScopeStore.runWith(() =>
    runWithNotModifiedContext(() => (
      <>
        {children}
        <HydrationScript />
      </>
    ))
  );
};

export default ServerNexusProvider;
