import type { GetNexusDefinition, NexusDefinition } from '@/types/definition';
import { isGetDefinition } from '@/utils/definitionUtils';

export const validateQueryDefinition = <T>(
  definition: NexusDefinition<T>,
  hookName: string
): GetNexusDefinition<T> => {
  if (!definition) {
    throw new Error(`${hookName}: definition is required`);
  }
  if (!isGetDefinition(definition)) {
    throw new Error(`${hookName} only accepts GET definitions`);
  }
  if (typeof definition.endpoint !== 'string' || !definition.endpoint) {
    throw new Error(
      `${hookName}: definition.endpoint must be a non-empty string`
    );
  }

  return definition;
};
