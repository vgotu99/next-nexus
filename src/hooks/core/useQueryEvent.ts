import { useEffect } from 'react';

export const useQueryOnMount = (onMount: () => void, deps: unknown[]): void => {
  useEffect(() => {
    onMount();
  }, [...deps]);
};

export const useQueryOnWindowFocus = (
  onFocus: () => void,
  deps: unknown[]
): void => {
  useEffect(() => {
    const handler = () => onFocus();
    window.addEventListener('focus', handler);

    return () => window.removeEventListener('focus', handler);
  }, [...deps]);
};
