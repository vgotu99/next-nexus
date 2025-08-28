import type { NexusDefinitionConfig } from '@/types/definition';
import type { NexusResponse } from '@/types/response';

export interface InternalNexusRequestConfig extends NexusDefinitionConfig {
  body?: BodyInit | null;
  timeoutId?: NodeJS.Timeout;
  next?: NexusOptions;
  cache?: RequestCache;
}

export interface InternalNexusResponse<T = unknown> extends NexusResponse<T> {
  config?: InternalNexusRequestConfig;
  request?: Request;
  clone(): InternalNexusResponse<T>;
}

export interface NexusOptions {
  revalidate?: number | false;
  tags?: string[];
}
