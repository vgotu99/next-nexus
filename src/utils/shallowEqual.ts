export const isObjectLike = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object';

const asRecord = (v: unknown): Record<string, unknown> => v as Record<string, unknown>;

export const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (!isObjectLike(a) || !isObjectLike(b)) return false;

  const ar = asRecord(a);
  const br = asRecord(b);

  const aKeys = Object.keys(ar);
  const bKeys = Object.keys(br);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(k =>
    Object.prototype.hasOwnProperty.call(br, k) && Object.is(ar[k], br[k])
  );
};

export const shallowArrayEqual = (
  a: unknown[] | undefined,
  b: unknown[] | undefined
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  
  return a.every((v, i) => Object.is(v, b[i]));
};
