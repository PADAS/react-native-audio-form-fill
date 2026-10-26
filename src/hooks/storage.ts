/**
 * Storage interface for model settings, and hooks that keep every screen in sync with it
 */

import {
  useCallback, useReducer, useSyncExternalStore,
} from 'react';

// Implemented by the app, e.g. over MMKV or AsyncStorage-backed in-memory state
export interface AudioFormFillStorage {
  getString: (key: string) => string | undefined;
  getBoolean: (key: string) => boolean | undefined;
  set: (key: string, value: string | boolean) => void;
  // Optional: report changes made elsewhere (e.g. MMKV `addOnValueChangedListener`) so every screen using the
  // hook updates. Returns an unsubscribe function. Without it, only the component that made the change updates.
  subscribe?: (onChange: (key: string) => void) => () => void;
}

export const AUDIO_FORM_FILL_STORAGE_KEYS = {
  speechModel: 'AudioFormFillSpeechModel',
  languageModel: 'AudioFormFillLanguageModel',
  translateToEnglish: 'AudioFormFillTranslate',
};

const useStoredValue = <T>(
  storage: AudioFormFillStorage,
  key: string,
  read: (storageKey: string) => T,
): [T, (value: string | boolean) => void] => {
  // Re-renders the component that wrote the value when storage can't report its own changes
  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  const subscribe = useCallback((onStoreChange: () => void) => (
    storage.subscribe
      ? storage.subscribe((changedKey) => {
        if (changedKey === key) onStoreChange();
      })
      : () => undefined
  ), [storage, key]);

  const value = useSyncExternalStore(subscribe, () => read(key));

  const setValue = useCallback((nextValue: string | boolean) => {
    storage.set(key, nextValue);
    forceRender();
  }, [storage, key]);

  return [value, setValue];
};

// Called through `storage` so methods that rely on `this` (e.g. an MMKV instance) keep working
export const useStoredString = (storage: AudioFormFillStorage, key: string) => (
  useStoredValue(storage, key, (storageKey) => storage.getString(storageKey))
);

export const useStoredBoolean = (storage: AudioFormFillStorage, key: string) => (
  useStoredValue(storage, key, (storageKey) => storage.getBoolean(storageKey))
);
