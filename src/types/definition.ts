import type { NextFetchRequestConfig } from './request';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type BaseNextFetchDefinition<TResponse = unknown> =
  Readonly<NextFetchRequestConfig> & {
    readonly method: HttpMethod;
    readonly endpoint: string;
    readonly _phantomResponse?: TResponse;
  };

export interface GetNextFetchDefinition<TResponse = unknown>
  extends BaseNextFetchDefinition<TResponse> {
  readonly method: 'GET';
  readonly data?: never;
}

export interface PostNextFetchDefinition<TResponse = unknown>
  extends BaseNextFetchDefinition<TResponse> {
  readonly method: 'POST';
  readonly data?: unknown;
}

export interface PutNextFetchDefinition<TResponse = unknown>
  extends BaseNextFetchDefinition<TResponse> {
  readonly method: 'PUT';
  readonly data?: unknown;
}

export interface PatchNextFetchDefinition<TResponse = unknown>
  extends BaseNextFetchDefinition<TResponse> {
  readonly method: 'PATCH';
  readonly data?: unknown;
}

export interface DeleteNextFetchDefinition<TResponse = unknown>
  extends BaseNextFetchDefinition<TResponse> {
  readonly method: 'DELETE';
  readonly data?: never;
}

export type NextFetchDefinition<TResponse = unknown> =
  | GetNextFetchDefinition<TResponse>
  | PostNextFetchDefinition<TResponse>
  | PutNextFetchDefinition<TResponse>
  | PatchNextFetchDefinition<TResponse>
  | DeleteNextFetchDefinition<TResponse>;

export interface CreateNextFetchDefinitionConfig
  extends NextFetchRequestConfig {
  method: HttpMethod;
  endpoint: string;
  data?: unknown;
}

export type MutationDefinition<TResponse = unknown, TVariables = unknown> = (
  | PostNextFetchDefinition<TResponse>
  | PutNextFetchDefinition<TResponse>
  | PatchNextFetchDefinition<TResponse>
  | DeleteNextFetchDefinition<TResponse>
) & {
  readonly _phantomVariables?: TVariables;
};

export type DefinitionCreator = <TResponse = unknown>(
  config: CreateNextFetchDefinitionConfig
) => NextFetchDefinition<TResponse>;
