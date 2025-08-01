export interface NextFetchResponse<T = unknown> extends Response {
  data: T;
}
