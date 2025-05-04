export const setupHeaders = (
  defaultHeaders: HeadersInit = {},
  configHeaders: HeadersInit = {},
) => {
  const headers = new Headers(defaultHeaders);

  Object.entries(configHeaders).forEach(([key, value]) => {
    if (value) headers.set(key, value);
  });

  return headers;
};