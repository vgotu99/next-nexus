type InflightPayload<T> = { data: T; headers: Headers };

const createInflightMap = <T>() => {
  const inflight = new Map<string, Promise<{ data: T; headers: Headers }>>();

  return inflight;
};

export const queryInflightPromise = async <T>(
  key: string,
  queryFetcherFactory: () => Promise<InflightPayload<T>>
): Promise<InflightPayload<T>> => {
  const inflight = createInflightMap<T>();

  const existing = inflight.get(key);

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
