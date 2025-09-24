import { useEffect } from 'react';

export const useQueryOnMount = (onMount: () => void): void => {
  useEffect(() => {
    onMount();
  }, [onMount]);
};

export const useQueryOnWindowFocus = (onFocus: () => void): void => {
  useEffect(() => {
    const handler = () => onFocus();
    window.addEventListener('focus', handler);

    return () => window.removeEventListener('focus', handler);
  }, [onFocus]);
};
