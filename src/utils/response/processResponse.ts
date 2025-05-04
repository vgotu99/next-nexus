import type { NextFetchResponse } from "../../types";


export const processResponse = async <T>(
  response: Response,
): Promise<NextFetchResponse<T>> => {
  const NextFetchResponse = response as NextFetchResponse<T>;

  if (response.headers.get('content-type')?.includes('application/json')) {
    NextFetchResponse.data = await response.json();
  }

  return NextFetchResponse;
};
