import { DictationLogger } from './types';

// Default when the app doesn't pass a logger
export const NOOP_LOGGER: DictationLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
