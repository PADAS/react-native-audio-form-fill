import { LocalModel } from '../models';
import { AudioFormFillStorage } from './storage';

export type DictationStatus = 'idle' | 'recording' | 'transcribing' | 'extracting';

// Matches the shape of common React Native loggers (react-native-logs, console)
export interface DictationLogger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: unknown) => void;
}

export interface UseFormDictationOptions {
  // JSON Schema of the form, as passed to the form renderer
  jsonSchema: unknown;
  // The form's current data; values already entered are sent to the model as context
  currentValues: Record<string, unknown>;
  // Called with the checked values once dictation finishes, when at least one field was filled
  onFilled: (values: Record<string, unknown>) => void;
  speechModel: LocalModel;
  languageModel: LocalModel;
  shouldTranslateToEnglish: boolean;
  logger?: DictationLogger;
  // Bytes of memory used by the app, added to the metrics log when provided (e.g. react-native-device-info)
  getUsedMemory?: () => Promise<number>;
}

export interface UseLocalModelsOptions {
  // Where the selected models and translate preference are saved; keep the same object across renders
  storage: AudioFormFillStorage;
  // Models to choose from; defaults to the built-in LOCAL_MODELS
  models?: LocalModel[];
  logger?: DictationLogger;
}
