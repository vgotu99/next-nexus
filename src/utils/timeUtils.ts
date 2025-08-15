export const getCurrentTimestamp = (): number => {
  return Date.now();
};

export const secondsToMs = (seconds: number): number => {
  return seconds * 1000;
};

export const msToSeconds = (ms: number): number => {
  return Math.floor(ms / 100) / 10;
};

export const isPast = (timestamp: number): boolean => {
  return timestamp < getCurrentTimestamp();
};
