describe('logger', () => {
  const originalConsole = { ...console };

  afterEach(() => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not log when not in development', () => {
    jest.isolateModules(() => {
      jest.doMock('@/utils/environmentUtils', () => ({
        isDevelopment: () => false,
      }));
      jest.doMock('@/debug/config', () => ({
        getDebugConfig: () => ({ enabled: true, level: 'debug' }),
      }));

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      const { logger } = require('@/utils/logger');
      logger.debug('hello');
      logger.info('world');

      expect(logSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    });
  });

  it('logs debug when in development and debug enabled', () => {
    jest.isolateModules(() => {
      jest.doMock('@/utils/environmentUtils', () => ({
        isDevelopment: () => true,
      }));
      jest.doMock('@/debug/config', () => ({
        getDebugConfig: () => ({ enabled: true, level: 'debug' }),
      }));

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      const { logger } = require('@/utils/logger');
      logger.debug('hello');
      logger.info('world');

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      const debugMsg = (logSpy.mock.calls[0][0] as string) || '';
      const infoMsg = (infoSpy.mock.calls[0][0] as string) || '';
      expect(debugMsg).toContain('[Nexus]');
      expect(infoMsg).toContain('[Nexus]');
    });
  });

  it('suppresses debug when debug disabled', () => {
    jest.isolateModules(() => {
      jest.doMock('@/utils/environmentUtils', () => ({
        isDevelopment: () => true,
      }));
      jest.doMock('@/debug/config', () => ({
        getDebugConfig: () => ({ enabled: false, level: 'debug' }),
      }));

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      const { logger } = require('@/utils/logger');
      logger.debug('hello');
      logger.info('world');

      expect(logSpy).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('logs warn/error with meta argument', () => {
    jest.isolateModules(() => {
      jest.doMock('@/utils/environmentUtils', () => ({ isDevelopment: () => true }));
      jest.doMock('@/debug/config', () => ({ getDebugConfig: () => ({ enabled: true, level: 'debug' }) }));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { logger } = require('@/utils/logger');
      const meta = { ctx: 'context' };
      logger.warn('something', meta);
      logger.error('bad', meta);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Nexus]'), meta);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[Nexus]'), meta);
    });
  });
});
