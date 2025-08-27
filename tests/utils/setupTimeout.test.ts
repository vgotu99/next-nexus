import { setupTimeout } from '@/utils/setupTimeout';

jest.useFakeTimers();

describe('setupTimeout', () => {
  it('returns undefined when timeout is falsy', () => {
    const ac = new AbortController();
    const id = setupTimeout(ac, 0);
    expect(id).toBeUndefined();
    const id2 = setupTimeout(ac, undefined as unknown as number);
    expect(id2).toBeUndefined();
  });

  it("aborts controller with reason 'timeout' after duration", () => {
    const ac = new AbortController();
    const id = setupTimeout(ac, 50)!;

    expect(ac.signal.aborted).toBe(false);
    jest.advanceTimersByTime(50);

    expect(ac.signal.aborted).toBe(true);
    expect(ac.signal.reason).toBe('timeout');

    clearTimeout(id);
  });
});
