export const setupTimeout = (abortController: AbortController, timeout?: number) => {
  if (!timeout) return undefined;

  return setTimeout(() => abortController.abort(), timeout);
};