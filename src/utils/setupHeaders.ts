export const setupHeaders = (
  defaultHeaders: HeadersInit = {},
  configHeaders: HeadersInit = {}
) => {
  const headers = new Headers(defaultHeaders);

  if (configHeaders instanceof Headers) {
    configHeaders.forEach((value, key) => {
      if (value) headers.set(key, value);
    });
  } else if (Array.isArray(configHeaders)) {
    configHeaders.forEach(([key, value]) => {
      if (value) headers.set(key, value);
    });
  } else if (configHeaders && typeof configHeaders === 'object') {
    Object.entries(configHeaders).forEach(([key, value]) => {
      if (value) headers.set(key, value);
    });
  }

  return headers;
};
