'use client';

import { createContext, useContext } from 'react';

import type { NextFetchInstance } from '@/types/instance';

interface NextFetchContextValue {
  instance: NextFetchInstance;
}

const NextFetchContext = createContext<NextFetchContextValue | null>(null);

export const useNextFetchContext = (): NextFetchContextValue => {
  const context = useContext(NextFetchContext);

  if (!context) {
    throw new Error(
      'useNextFetchContext must be used within a NextFetchProvider'
    );
  }

  return context;
};

export { NextFetchContext };
