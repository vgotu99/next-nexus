import React from 'react';

interface NextFetchProviderProps {
  children: React.ReactNode;
}

export const NextFetchProvider = ({ children }: NextFetchProviderProps) => {
  return <>{children}</>;
};
