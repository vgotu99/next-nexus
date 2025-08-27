import {
  getNotModifiedKeys,
  registerNotModifiedKey,
  runWithNotModifiedContext,
} from '@/scope/notModifiedContext';
import {
  isDelegationEnabled,
  runWithDelegationEnabled,
} from '@/scope/renderRegistry';
import { requestScopeStore } from '@/scope/requestScopeStore';

describe('scope utilities', () => {
  it('renderRegistry toggles delegation flag in context', () => {
    expect(isDelegationEnabled()).toBe(false);
    const value = runWithDelegationEnabled(() => isDelegationEnabled());
    expect(value).toBe(true);
    expect(isDelegationEnabled()).toBe(false);
  });

  it('notModifiedContext stores and retrieves keys within context', () => {
    expect(getNotModifiedKeys()).toEqual([]);
    const keys = runWithNotModifiedContext(() => {
      registerNotModifiedKey('k1');
      registerNotModifiedKey('k2');
      return getNotModifiedKeys();
    });
    expect(keys.sort()).toEqual(['k1', 'k2']);
    expect(getNotModifiedKeys()).toEqual([]);
  });

  it('requestScopeStore isolates values per context', async () => {
    const result = await requestScopeStore.runWith(async () => {
      await requestScopeStore.set('a', 1);
      await requestScopeStore.set('b', 2);
      expect(await requestScopeStore.get('a')).toBe(1);
      expect(await requestScopeStore.get('b')).toBe(2);
      expect((await requestScopeStore.keys()).sort()).toEqual(['a', 'b']);
      await requestScopeStore.clear();
      expect(await requestScopeStore.get('a')).toBeNull();
      return 'done';
    });

    expect(result).toBe('done');
    expect(await requestScopeStore.get('a')).toBeNull();
  });
});
