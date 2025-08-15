export const isClientEnvironment = (): boolean => {
  return typeof window !== 'undefined';
};

export const isServerEnvironment = (): boolean => {
  return typeof window === 'undefined';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};
