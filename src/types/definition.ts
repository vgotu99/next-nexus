import type { NexusRequestConfig } from './request';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type BaseNexusDefinition<TResponse = unknown> = Readonly<NexusRequestConfig> & {
  readonly method: HttpMethod;
  readonly endpoint: string;
  readonly _phantomResponse?: TResponse;
};

export interface GetNexusDefinition<TResponse = unknown>
  extends BaseNexusDefinition<TResponse> {
  readonly method: 'GET';
  readonly data?: never;
}

export interface PostNexusDefinition<TResponse = unknown>
  extends BaseNexusDefinition<TResponse> {
  readonly method: 'POST';
  readonly data?: unknown;
}

export interface PutNexusDefinition<TResponse = unknown>
  extends BaseNexusDefinition<TResponse> {
  readonly method: 'PUT';
  readonly data?: unknown;
}

export interface PatchNexusDefinition<TResponse = unknown>
  extends BaseNexusDefinition<TResponse> {
  readonly method: 'PATCH';
  readonly data?: unknown;
}

export interface DeleteNexusDefinition<TResponse = unknown>
  extends BaseNexusDefinition<TResponse> {
  readonly method: 'DELETE';
  readonly data?: never;
}

export type NexusDefinition<TResponse = unknown> =
  | GetNexusDefinition<TResponse>
  | PostNexusDefinition<TResponse>
  | PutNexusDefinition<TResponse>
  | PatchNexusDefinition<TResponse>
  | DeleteNexusDefinition<TResponse>;

export interface NexusDefinitionConfig extends NexusRequestConfig {
  method: HttpMethod;
  endpoint: string;
  data?: unknown;
}

export type MutationDefinition<TResponse = unknown, TVariables = unknown> = (
  | PostNexusDefinition<TResponse>
  | PutNexusDefinition<TResponse>
  | PatchNexusDefinition<TResponse>
  | DeleteNexusDefinition<TResponse>
) & {
  readonly _phantomVariables?: TVariables;
};
