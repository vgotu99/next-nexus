export const getCurrentTimestamp = (): number => {
  return Date.now();
};

export const addMilliseconds = (timestamp: number, ms: number): number => {
  return timestamp + ms;
};

export const addSeconds = (timestamp: number, seconds: number): number => {
  return timestamp + seconds * 1000;
};

export const addMinutes = (timestamp: number, minutes: number): number => {
  return timestamp + minutes * 60 * 1000;
};

export const isExpired = (expiresAt: number): boolean => {
  return getCurrentTimestamp() > expiresAt;
};

export const willExpireWithin = (expiresAt: number, ms: number): boolean => {
  return expiresAt - getCurrentTimestamp() <= ms;
};

export const secondsToMs = (seconds: number): number => {
  return seconds * 1000;
};

export const minutesToMs = (minutes: number): number => {
  return minutes * 60 * 1000;
};

export const hoursToMs = (hours: number): number => {
  return hours * 60 * 60 * 1000;
};

export const daysToMs = (days: number): number => {
  return days * 24 * 60 * 60 * 1000;
};

export const getTimeUntilExpiration = (expiresAt: number): number => {
  const remaining = expiresAt - getCurrentTimestamp();
  return Math.max(0, remaining);
};

export const isFuture = (timestamp: number): boolean => {
  return timestamp > getCurrentTimestamp();
};

export const isPast = (timestamp: number): boolean => {
  return timestamp < getCurrentTimestamp();
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

export const fromNow = (ms: number): number => {
  return getCurrentTimestamp() + ms;
};

export const parseTimeToMs = (time: string | number): number => {
  if (typeof time === 'number') {
    return time;
  }

  const match = time.match(/^(\d+)([smhd]?)$/i);
  if (!match) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase() || 'ms';

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return secondsToMs(value);
    case 'm':
      return minutesToMs(value);
    case 'h':
      return hoursToMs(value);
    case 'd':
      return daysToMs(value);
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
};
