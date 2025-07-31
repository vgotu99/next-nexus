import type { NextFetchRequestConfig } from './request';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface BaseNextFetchDefinition<TResponse = unknown> {
  readonly method: HttpMethod;
  readonly endpoint: string;
  readonly options?: NextFetchRequestConfig;
  readonly _phantomResponse?: TResponse;
}

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

export interface CreateNextFetchDefinitionConfig {
  method: HttpMethod;
  endpoint: string;
  data?: unknown;
  options?: NextFetchRequestConfig;
}

export type CreateNextFetchDefinition = <TResponse = unknown>(
  config: CreateNextFetchDefinitionConfig
) => NextFetchDefinition<TResponse>;
