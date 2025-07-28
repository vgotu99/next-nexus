import type {
  NextFetchDefinition,
  CreateNextFetchDefinitionConfig,
  GetNextFetchDefinition,
  PostNextFetchDefinition,
  PutNextFetchDefinition,
  PatchNextFetchDefinition,
  DeleteNextFetchDefinition,
} from '@/types/definition';

const validateConfig = (config: CreateNextFetchDefinitionConfig): void => {
  if (!config.method) {
    throw new Error('Method is required');
  }
  if (!config.endpoint) {
    throw new Error('Endpoint is required');
  }
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method)) {
    throw new Error(`Unsupported HTTP method: ${config.method}`);
  }
};

export const createNextFetchDefinition = <TResponse = unknown>(
  config: CreateNextFetchDefinitionConfig
): NextFetchDefinition<TResponse> => {
  validateConfig(config);
  const { method, endpoint, data, options } = config;

  const definition = {
    method,
    endpoint,
    options,
    data: ['POST', 'PUT', 'PATCH'].includes(method) ? data : undefined,
  };

  return definition as NextFetchDefinition<TResponse>;
};

export const isGetDefinition = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): definition is GetNextFetchDefinition<TResponse> => {
  return definition.method === 'GET';
};

export const isPostDefinition = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): definition is PostNextFetchDefinition<TResponse> => {
  return definition.method === 'POST';
};

export const isPutDefinition = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): definition is PutNextFetchDefinition<TResponse> => {
  return definition.method === 'PUT';
};

export const isPatchDefinition = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): definition is PatchNextFetchDefinition<TResponse> => {
  return definition.method === 'PATCH';
};

export const isDeleteDefinition = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): definition is DeleteNextFetchDefinition<TResponse> => {
  return definition.method === 'DELETE';
};

export const isMutationDefinition = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): definition is
  | PostNextFetchDefinition<TResponse>
  | PutNextFetchDefinition<TResponse>
  | PatchNextFetchDefinition<TResponse> => {
  return ['POST', 'PUT', 'PATCH'].includes(definition.method);
};

export const resolveDefinitionEndpoint = <TResponse>(
  definition: NextFetchDefinition<TResponse>
): string => {
  return definition.endpoint;
};
