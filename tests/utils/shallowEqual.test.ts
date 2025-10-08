import { shallowArrayEqual, shallowEqual } from '@/utils/shallowEqual';

describe('shallowEqual utilities', () => {
  it('shallowEqual handles primitives and objects', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it('shallowArrayEqual handles arrays', () => {
    expect(shallowArrayEqual([1, 2], [1, 2])).toBe(true);
    expect(shallowArrayEqual([1, 2], [2, 1])).toBe(false);
    expect(shallowArrayEqual([NaN], [NaN])).toBe(true);
    expect(shallowArrayEqual(undefined, undefined)).toBe(true);
    expect(shallowArrayEqual([1], undefined)).toBe(false);
  });
});
