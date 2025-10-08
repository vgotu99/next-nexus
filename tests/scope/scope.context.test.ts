import {
  enterNotModifiedContext,
  getNotModifiedKeys,
  registerNotModifiedKey,
} from '@/scope/notModifiedContext';
import { requestScopeStore } from '@/scope/requestScopeStore';

describe('scope utilities', () => {
  it('notModifiedContext stores and retrieves keys within context', () => {
    expect(getNotModifiedKeys()).toEqual([]);
    enterNotModifiedContext();
    registerNotModifiedKey('k1');
    registerNotModifiedKey('k2');
    expect(getNotModifiedKeys().sort()).toEqual(['k1', 'k2']);
  });

  it('requestScopeStore stores values when enter() is called', async () => {
    requestScopeStore.enter();
    await requestScopeStore.set('a', 1);
    await requestScopeStore.set('b', 2);
    expect(await requestScopeStore.get('a')).toBe(1);
    expect(await requestScopeStore.get('b')).toBe(2);
    expect((await requestScopeStore.keys()).sort()).toEqual(['a', 'b']);
    await requestScopeStore.clear();
    expect(await requestScopeStore.get('a')).toBeNull();
  });
});
