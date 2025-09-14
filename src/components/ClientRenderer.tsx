'use client';

import { nexusCache } from '@/client';
import type {
  NexusRendererGroupProps,
  NexusRendererSingleProps,
} from '@/components/NexusRenderer';
import type { NexusDefinition } from '@/types/definition';

export const SingleDefinitionClientRenderer = <
  D,
  P extends object = Record<string, unknown>,
>({
  definition,
  clientComponent: ClientComponent,
  componentProps,
}: Omit<NexusRendererSingleProps<D, P>, 'serverComponent'>) => {
  const data = nexusCache(definition).get();
  if (!data) return null;

  const props = {
    ...componentProps,
    data,
  } as P & { data: D };

  return <ClientComponent {...props} />;
};

export const GroupDefinitionsClientRenderer = <
  D,
  P extends object = Record<string, unknown>,
>({
  definitions,
  clientComponent: ClientComponent,
  componentProps,
}: Omit<NexusRendererGroupProps<D, P>, 'serverComponent'>) => {
  const entries = Object.entries(definitions) as [string, NexusDefinition<D>][];
  const dataEntries = entries
    .map(([key, definition]) => {
      const value = nexusCache(definition).get();
      return [key, value] as const;
    })
    .filter(([, value]) => value !== null && value !== undefined) as [
    string,
    D,
  ][];

  const data: Record<string, D> = Object.fromEntries(dataEntries);

  const props = {
    ...componentProps,
    data,
  } as P & { data: Record<string, D> };

  return <ClientComponent {...props} />;
};
