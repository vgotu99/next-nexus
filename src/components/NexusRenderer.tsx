import type { ComponentType, ReactElement } from 'react';

import {
  extractClientCacheMetadataFromCookies,
  findExactClientCacheMetadata,
} from '@/cache/serverCacheStateProcessor';
import {
  SingleDefinitionClientRenderer,
  GroupDefinitionsClientRenderer,
} from '@/components/ClientRenderer';
import {
  SingleDefinitionServerRenderer,
  GroupDefinitionsServerRenderer,
} from '@/components/ServerRenderer';
import { nexus } from '@/core/nexus';
import {
  reservePending,
  releaseReservation,
} from '@/scope/requestPendingStore';
import type { NexusDefinition } from '@/types/definition';
import { generateCacheKeyFromDefinition } from '@/utils/cacheUtils';
import { isGetDefinition } from '@/utils/definitionUtils';

type ComponentSingleProps<
  D,
  P extends object = Record<string, unknown>,
> = ComponentType<P & { data: D }>;

type ComponentGroupProps<
  D,
  P extends object = Record<string, unknown>,
> = ComponentType<P & { data: Record<string, D> }>;

export interface NexusRendererSingleProps<
  D,
  P extends object = Record<string, unknown>,
> {
  definition: NexusDefinition<D>;
  serverComponent: ComponentSingleProps<D, P>;
  clientComponent: ComponentSingleProps<D, P>;
  componentProps?: Omit<P, 'data'>;
}

export interface NexusRendererGroupProps<
  D,
  P extends object = Record<string, unknown>,
> {
  definitions: Record<string, NexusDefinition<D>>;
  serverComponent: ComponentGroupProps<D, P>;
  clientComponent: ComponentGroupProps<D, P>;
  componentProps?: Omit<P, 'data'>;
}

const getCacheKey = <D,>(definition: NexusDefinition<D>): string | null =>
  isGetDefinition(definition)
    ? generateCacheKeyFromDefinition(definition)
    : null;

const SingleDefinitionRenderer = async <
  D,
  P extends object = Record<string, unknown>,
>(
  props: NexusRendererSingleProps<D, P>
): Promise<ReactElement> => {
  const cacheKey = getCacheKey(props.definition);

  if (!cacheKey) {
    return (
      <SingleDefinitionServerRenderer
        definition={props.definition}
        serverComponent={props.serverComponent}
        componentProps={props.componentProps}
      />
    );
  }

  const clientCacheMetadataArr = await extractClientCacheMetadataFromCookies();
  const meta =
    clientCacheMetadataArr &&
    findExactClientCacheMetadata(clientCacheMetadataArr, cacheKey);
  const shouldClientRender = meta !== null && (meta?.ttl ?? 0) > 0;

  if (!shouldClientRender) {
    return (
      <SingleDefinitionServerRenderer
        definition={props.definition}
        serverComponent={props.serverComponent}
        componentProps={props.componentProps}
      />
    );
  }

  releaseReservation();

  return (
    <SingleDefinitionClientRenderer
      definition={props.definition}
      clientComponent={props.clientComponent}
      componentProps={props.componentProps}
    />
  );
};

const GroupDefinitionsRenderer = async <
  D,
  P extends object = Record<string, unknown>,
>(
  props: NexusRendererGroupProps<D, P>
): Promise<ReactElement> => {
  const definitions = Object.values(props.definitions);
  const cacheKeys = definitions.map(getCacheKey);
  const hasAnyGet = cacheKeys.some(k => k !== null);

  if (!hasAnyGet) {
    return (
      <GroupDefinitionsServerRenderer
        definitions={props.definitions}
        serverComponent={props.serverComponent}
        componentProps={props.componentProps}
      />
    );
  }

  const clientCacheMetadataArr = await extractClientCacheMetadataFromCookies();
  const metas = cacheKeys.map(key =>
    key && clientCacheMetadataArr
      ? findExactClientCacheMetadata(clientCacheMetadataArr, key)
      : null
  );

  const freshCount = metas.filter(m => m !== null && (m?.ttl ?? 0) > 0).length;

  if (freshCount === 0) {
    return (
      <GroupDefinitionsServerRenderer
        definitions={props.definitions}
        serverComponent={props.serverComponent}
        componentProps={props.componentProps}
      />
    );
  }

  const staleGetDefinitions = definitions.filter((definition, i) => {
    if (!isGetDefinition(definition)) return false;
    const meta = metas[i];
    return !meta || (meta?.ttl ?? 0) <= 0;
  });

  if (staleGetDefinitions.length > 0) {
    try {
      await Promise.all(staleGetDefinitions.map(def => nexus(def)));
    } catch (e) {
      console.warn('[NexusRenderer] Prefetch failed', e);
    }
  }

  releaseReservation();

  return (
    <GroupDefinitionsClientRenderer
      definitions={props.definitions}
      clientComponent={props.clientComponent}
      componentProps={props.componentProps}
    />
  );
};

export const NexusRenderer = <D, P extends object = Record<string, unknown>>(
  props: NexusRendererSingleProps<D, P> | NexusRendererGroupProps<D, P>
): ReactElement => {
  const isGroup = 'definitions' in props;

  reservePending();

  if (isGroup) {
    return (
      <GroupDefinitionsRenderer
        definitions={props.definitions}
        serverComponent={props.serverComponent}
        clientComponent={props.clientComponent}
        componentProps={props.componentProps}
      />
    );
  }

  return (
    <SingleDefinitionRenderer
      definition={props.definition}
      serverComponent={props.serverComponent}
      clientComponent={props.clientComponent}
      componentProps={props.componentProps}
    />
  );
};
