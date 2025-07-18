export interface NextFetchResponse<T = any> extends Response {
  data: T;
}
