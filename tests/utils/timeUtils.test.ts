import { secondsToMs, msToSeconds, isPast } from '@/utils/timeUtils';

describe('timeUtils', () => {
  const realNow = Date.now;
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
  });
  afterEach(() => {
    (Date.now as jest.Mock).mockRestore?.();
    Date.now = realNow;
  });

  it('secondsToMs and msToSeconds round/truncate as expected', () => {
    expect(secondsToMs(2)).toBe(2000);
    expect(msToSeconds(1234)).toBe(1.2);
  });

  it('isPast compares with current timestamp from Date.now()', () => {
    expect(isPast(999_999)).toBe(true);
    expect(isPast(1_000_000)).toBe(false);
    expect(isPast(1_000_001)).toBe(false);
  });
});
