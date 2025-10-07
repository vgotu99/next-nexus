'use client';

const serverOnlyError = (message?: string) =>
  new Error(
    "[next-nexus] 'next-nexus/server' cannot be used in the client." +
      (message ? `\n${message}` : '')
  );

export const nexus = async () => {
  throw serverOnlyError(
    "Use 'next-nexus/client' (e.g., useNexusQuery) or a client-safe API instead."
  );
};

export const NexusRenderer = () => {
  throw serverOnlyError();
};

export const NexusHydrationBoundary = () => {
  throw serverOnlyError();
};

export const withNexusHydrationBoundary = () => {
  throw serverOnlyError();
};
