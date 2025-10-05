import type {
  NexusRendererSingleProps,
  NexusRendererGroupProps,
} from '@/components/NexusRenderer';
import { nexus } from '@/core/nexus';
import type { NexusDefinition } from '@/types/definition';

export const SingleDefinitionServerRenderer = async <
  D,
  P extends object = Record<string, unknown>,
>({
  definition,
  serverComponent: ServerComponent,
  componentProps,
}: Omit<NexusRendererSingleProps<D, P>, 'clientComponent'>) => {
  const { data } = await nexus(definition);

  const props = {
    ...componentProps,
    data,
  } as P & { data: D };

  return <ServerComponent {...props} />;
};

export const GroupDefinitionsServerRenderer = async <
  D,
  P extends object = Record<string, unknown>,
>({
  definitions,
  serverComponent: ServerComponent,
  componentProps,
}: Omit<NexusRendererGroupProps<D, P>, 'clientComponent'>) => {
  const entries = Object.entries(definitions) as [string, NexusDefinition<D>][];
  const promisedEntries = entries.map(async ([key, def]) => {
    const { data } = await nexus(def);
    return [key, data] as const;
  });

  const resolved = await Promise.all(promisedEntries);
  const data: Record<string, D> = Object.fromEntries(resolved);

  const props = {
    ...componentProps,
    data,
  } as P & { data: Record<string, D> };

  return <ServerComponent {...props} />;
};
