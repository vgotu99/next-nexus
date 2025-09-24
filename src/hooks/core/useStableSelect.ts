import { useEffect, useMemo, useRef } from 'react';

import { shallowEqual } from '@/utils/shallowEqual';

export const useStableSelect = <TData, TSelected = TData>(
  data: TData | undefined,
  select?: (d: TData) => TSelected
): TSelected | undefined => {
  const prevRef = useRef<TSelected | undefined>(undefined);

  const selected = useMemo(() => {
    if (data === undefined)
      return undefined as unknown as TSelected | undefined;
    const next = select ? select(data) : (data as unknown as TSelected);
    const prev = prevRef.current;

    return prev !== undefined && shallowEqual(prev, next) ? prev : next;
  }, [data, select]);

  useEffect(() => {
    prevRef.current = selected;
  }, [selected]);

  return selected;
}
