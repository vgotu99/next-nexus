export interface NexusResponse<T = unknown> extends Response {
  data: T;
}
