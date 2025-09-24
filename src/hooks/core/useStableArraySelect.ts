import { useMemo } from 'react';

import { useStableSelect } from '@/hooks/core/useStableSelect';

export const useStableArraySelect = <TItem, TSelected = TItem>(
  items: TItem[] | undefined,
  map?: (item: TItem) => TSelected
): TSelected[] => {
  const projected = useMemo(() => {
    if (!items) return undefined as unknown as TSelected[] | undefined;
    const mapper = map ?? ((x: TItem): TSelected => x as unknown as TSelected);
    return items.map(mapper);
  }, [items, map]);

  const stable = useStableSelect<
    TSelected[] | undefined,
    TSelected[] | undefined
  >(projected, v => v);

  return stable ?? [];
};
