import type {
  NexusDefinition,
  CreateNexusDefinitionConfig,
  GetNexusDefinition,
  PostNexusDefinition,
  PutNexusDefinition,
  PatchNexusDefinition,
  DeleteNexusDefinition,
  DefinitionCreator,
} from '@/types/definition';
import type { NexusRequestConfig } from '@/types/request';

const validateConfig = (definition: NexusDefinition): void => {
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

export const createNexusDefinition = (
  defaultConfig: NexusRequestConfig
): DefinitionCreator => {
  return <TResponse = unknown>(config: CreateNexusDefinitionConfig) => {
    const { headers: defaultConfigHeaders, ...restDefaultConfig } =
      defaultConfig;
    const { headers: configHeaders, ...restConfig } = config;

    const definition: NexusDefinition<TResponse> = {
      ...restDefaultConfig,
      ...restConfig,
      headers: {
        ...defaultConfigHeaders,
        ...configHeaders,
      },
    } as NexusDefinition<TResponse>;

    validateConfig(definition);

    return definition;
  };
};

export const isGetDefinition = <TResponse>(
  definition: NexusDefinition<TResponse>
): definition is GetNexusDefinition<TResponse> => {
  return definition.method === 'GET';
};

export const isMutationDefinition = <TResponse>(
  definition: NexusDefinition<TResponse>
): definition is
  | PostNexusDefinition<TResponse>
  | PutNexusDefinition<TResponse>
  | PatchNexusDefinition<TResponse>
  | DeleteNexusDefinition<TResponse> => {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(definition.method);
};
