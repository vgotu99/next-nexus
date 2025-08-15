import type {
  NextFetchDefinition,
  CreateNextFetchDefinitionConfig,
  GetNextFetchDefinition,
  PostNextFetchDefinition,
  PutNextFetchDefinition,
  PatchNextFetchDefinition,
  DeleteNextFetchDefinition,
  DefinitionCreator,
} from '@/types/definition';
import type { NextFetchRequestConfig } from '@/types/request';

const validateConfig = (definition: NextFetchDefinition): void => {
  const { method, endpoint } = definition;
  if (!method) {
    throw new Error('Method is required');
  }
  if (!endpoint) {
    throw new Error('Endpoint is required');
  }
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }
};

export const createNextFetchDefinition = (
  defaultConfig: NextFetchRequestConfig
): DefinitionCreator => {
  return <TResponse = unknown>(config: CreateNextFetchDefinitionConfig) => {
    const { headers: defaultConfigHeaders, ...restDefaultConfig } =
      defaultConfig;
    const { headers: configHeaders, ...restConfig } = config;

    const definition: NextFetchDefinition<TResponse> = {
      ...restDefaultConfig,
      ...restConfig,
      headers: {
        ...defaultConfigHeaders,
        ...configHeaders,
      },
    } as NextFetchDefinition<TResponse>;

    validateConfig(definition);

    return definition;
  };
};

export const isGetDefinition = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): definition is GetNextFetchDefinition<TResponse> => {
  return definition.method === 'GET';
};

export const isMutationDefinition = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): definition is
  | PostNextFetchDefinition<TResponse>
  | PutNextFetchDefinition<TResponse>
  | PatchNextFetchDefinition<TResponse>
  | DeleteNextFetchDefinition<TResponse> => {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(definition.method);
};
