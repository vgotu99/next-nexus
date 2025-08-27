import { ERROR_CODES } from '@/constants/errorCodes';
import {
  extractErrorMessage,
  getErrorCodeByStatus,
  getErrorMessageByStatus,
} from '@/utils/errorUtils';

describe('errorUtils', () => {
  it('maps status to error codes', () => {
    expect(getErrorCodeByStatus(401)).toBe(ERROR_CODES.UNAUTHORIZED_ERROR);
    expect(getErrorCodeByStatus(404)).toBe(ERROR_CODES.NOT_FOUND_ERROR);
    expect(getErrorCodeByStatus(418)).toBe(ERROR_CODES.BAD_REQUEST_ERROR);
    expect(getErrorCodeByStatus(500)).toBe(ERROR_CODES.SERVER_ERROR);
  });

  it('getErrorMessageByStatus returns human readable message', () => {
    expect(getErrorMessageByStatus(404)).toBe('Not Found');
    expect(getErrorMessageByStatus(400)).toBe('Bad Request');
    expect(getErrorMessageByStatus(418)).toBe('Client Error');
    expect(getErrorMessageByStatus(510)).toBe('Server Error');
  });

  it('extractErrorMessage picks from data shape', () => {
    expect(extractErrorMessage({ message: 'oops' })).toBe('oops');
    expect(extractErrorMessage({ message: 'm' })).toBe('m');
    expect(extractErrorMessage({ error: 'e' })).toBe('e');
    expect(extractErrorMessage({ detail: 'd' })).toBe('d');
    expect(extractErrorMessage({})).toBe('Unknown error occurred');
    expect(extractErrorMessage({ message: 'as-is' })).toBe('as-is');
    // @ts-expect-error testing runtime fallback
    expect(extractErrorMessage(null)).toBe('Unknown error occurred');
  });
});
