import { cookies } from 'next/headers';
import { Suspense } from 'react';

import { NexusHydrationDispatcher } from '@/client/NexusHydrationDispatcher';
import { COOKIES } from '@/constants/cache';
import {
  enterNotModifiedContext,
  getNotModifiedKeys,
} from '@/scope/notModifiedContext';
import {
  waitForAll,
  enterPendingStore,
  markRenderSettled,
} from '@/scope/requestPendingStore';
import { requestScopeStore } from '@/scope/requestScopeStore';
import type { ClientCacheEntry } from '@/types/cache';
import type { NexusPayload } from '@/types/payload';
import { logger } from '@/utils/logger';

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
    await waitForAll();

    const hydrationData = await collectHydrationData();
    const notModifiedKeys = getNotModifiedKeys();

    const requestCookies = await cookies();
    const pathname = requestCookies.get(COOKIES.NEXUS_PATHNAME)?.value || '';

    const payload: NexusPayload = {
      hydrationData,
      notModifiedKeys,
      pathname,
    };

    if (!hasPayloadContent(payload)) {
      return null;
    }

    return (
      <NexusHydrationDispatcher key={payload.pathname} payload={payload} />
    );
  } catch (error) {
    logger.warn('[Provider] Failed to generate hydration script', error);

    return null;
  }
};

const NexusRenderSettled = () => {
  markRenderSettled();

  return null;
};

export const NexusHydrationBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  enterPendingStore();
  requestScopeStore.enter();
  enterNotModifiedContext();

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <NexusRenderSettled />
        <HydrationScript />
      </Suspense>
    </>
  );
};
