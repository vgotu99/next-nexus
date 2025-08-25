import { NexusRequestConfig } from '@/types/request';
import { NexusResponse } from '@/types/response';

export interface InternalNexusRequestConfig extends NexusRequestConfig {
  timeoutId?: NodeJS.Timeout;
  next?: NexusOptions;
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
