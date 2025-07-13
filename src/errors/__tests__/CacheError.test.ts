import { CacheError } from '../CacheError';
import { ERROR_CODES } from '../errorCodes';

describe('CacheError', () => {
  it('should create unavailable error', () => {
    const error = CacheError.unavailable('Cache storage not available');
    
    expect(error.name).toBe('CacheError');
    expect(error.message).toBe('Cache storage not available');
    expect(error.code).toBe(ERROR_CODES.ERR_CACHE_UNAVAILABLE);
    expect(error.isRetryable).toBe(false);
    expect(error.fallbackStrategy).toBe('network');
  });

  it('should create unsupported error', () => {
    const error = CacheError.unsupported('Cache API not supported');
    
    expect(error.name).toBe('CacheError');
    expect(error.message).toBe('Cache API not supported');
    expect(error.code).toBe(ERROR_CODES.ERR_CACHE_UNSUPPORTED);
    expect(error.isRetryable).toBe(false);
    expect(error.fallbackStrategy).toBe('network');
  });

  it('should create quota exceeded error', () => {
    const error = CacheError.quotaExceeded('Storage quota exceeded');
    
    expect(error.name).toBe('CacheError');
    expect(error.message).toBe('Storage quota exceeded');
    expect(error.code).toBe(ERROR_CODES.ERR_CACHE_QUOTA_EXCEEDED);
    expect(error.isRetryable).toBe(true);
    expect(error.fallbackStrategy).toBe('network');
  });

  it('should create operation failed error', () => {
    const originalError = new Error('Original error');
    const error = CacheError.operationFailed('Cache operation failed', originalError);
    
    expect(error.name).toBe('CacheError');
    expect(error.message).toBe('Cache operation failed');
    expect(error.code).toBe(ERROR_CODES.ERR_CACHE_OPERATION_FAILED);
    expect(error.isRetryable).toBe(true);
    expect(error.fallbackStrategy).toBe('stale');
    expect(error.stack).toBe(originalError.stack);
  });

  it('should create operation failed error without cause', () => {
    const error = CacheError.operationFailed('Cache operation failed');
    
    expect(error.name).toBe('CacheError');
    expect(error.message).toBe('Cache operation failed');
    expect(error.code).toBe(ERROR_CODES.ERR_CACHE_OPERATION_FAILED);
    expect(error.isRetryable).toBe(true);
    expect(error.fallbackStrategy).toBe('stale');
  });

  it('should create corruption error', () => {
    const error = CacheError.corruption('Cache data is corrupted');
    
    expect(error.name).toBe('CacheError');
    expect(error.message).toBe('Cache data is corrupted');
    expect(error.code).toBe(ERROR_CODES.ERR_CACHE_CORRUPTION);
    expect(error.isRetryable).toBe(false);
    expect(error.fallbackStrategy).toBe('network');
  });

  it('should inherit from Error', () => {
    const error = CacheError.unavailable('Test error');
    
    expect(error instanceof Error).toBe(true);
    expect(error instanceof CacheError).toBe(true);
  });
}); 