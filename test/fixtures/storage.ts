/**
 * In-memory AudioFormFillStorage for hook tests, optionally reporting changes like MMKV listeners do
 */

import { AudioFormFillStorage } from '../../src';

export const createMemoryStorage = (
  initialValues: Record<string, string | boolean> = {},
  { canSubscribe = true } = {},
) => {
  const values = new Map<string, string | boolean>(Object.entries(initialValues));
  const listeners = new Set<(key: string) => void>();

  const read = (key: string) => values.get(key);

  const storage: AudioFormFillStorage = {
    getString: (key) => {
      const value = read(key);
      return typeof value === 'string' ? value : undefined;
    },
    getBoolean: (key) => {
      const value = read(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    set: (key, value) => {
      values.set(key, value);
      listeners.forEach((listener) => listener(key));
    },
    ...(canSubscribe ? {
      subscribe: (onChange: (key: string) => void) => {
        listeners.add(onChange);
        return () => listeners.delete(onChange);
      },
    } : {}),
  };

  return { storage, listenerCount: () => listeners.size };
};
