type InflightPayload<T> = { data: T; headers: Headers };

const inflight = new Map<string, Promise<InflightPayload<unknown>>>();

export const queryInflightPromise = async <T>(
  key: string,
  queryFetcherFactory: () => Promise<InflightPayload<T>>
): Promise<InflightPayload<T>> => {
  const existing = inflight.get(key) as Promise<InflightPayload<T>> | undefined;

  if (existing) return existing;

  const created = (async () => {
    try {
      return await queryFetcherFactory();
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, created);

  return created;
};
