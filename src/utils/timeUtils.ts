export const getCurrentTimestamp = (): number => {
  return Date.now();
};

export const secondsToMs = (seconds: number): number => {
  return seconds * 1000;
};

export const isPast = (timestamp: number): boolean => {
  return timestamp < getCurrentTimestamp();
};
