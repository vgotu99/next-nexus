import {
  isClientEnvironment,
  isServerEnvironment,
  isDevelopment,
} from '@/utils/environmentUtils';

describe('environmentUtils', () => {
  const originalWindow = global.window as unknown;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = originalWindow;
    }
    process.env.NODE_ENV = originalEnv;
  });

  it('detects client vs server environments', () => {
    expect(isClientEnvironment()).toBe(true);
    expect(isServerEnvironment()).toBe(false);

    delete (global as any).window;

    expect(isClientEnvironment()).toBe(false);
    expect(isServerEnvironment()).toBe(true);
  });

  it('detects development mode', () => {
    process.env.NODE_ENV = 'development';
    expect(isDevelopment()).toBe(true);

    process.env.NODE_ENV = 'production';
    expect(isDevelopment()).toBe(false);
  });
});
