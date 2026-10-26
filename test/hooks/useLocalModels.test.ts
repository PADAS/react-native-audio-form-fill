/**
 * @jest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import RNFS from 'react-native-fs';

import {
  AUDIO_FORM_FILL_STORAGE_KEYS, DictationLogger, getModelForType, useLocalModels, UseLocalModelsOptions,
} from '../../src';
import { createMemoryStorage } from '../fixtures/storage';
import { CUSTOM_MODELS } from '../fixtures/models';

const mockFs = jest.mocked(RNFS);

const BASE_SPEECH = getModelForType('speech', 'whisper-base-q5_1');
const SMALL_SPEECH = getModelForType('speech', 'whisper-small-q5_1');
const QWEN3 = getModelForType('language', 'qwen3-1.7b-q4_k_m');

const createLogger = (): jest.Mocked<DictationLogger> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

// Marks the given model files as present on the device
const mockDownloadedFiles = (fileNames: string[]) => {
  mockFs.exists.mockImplementation(async (path) => fileNames.some((fileName) => path.endsWith(`/${fileName}`)));
};

// Renders the hook and waits for its on-mount check of which models are downloaded
const renderLocalModels = async (options: UseLocalModelsOptions) => {
  const rendered = renderHook(() => useLocalModels(options));
  await act(() => new Promise<void>((resolve) => { setTimeout(resolve, 0); }));
  return rendered;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDownloadedFiles([]);
});

describe('useLocalModels', () => {
  it('defaults to the first model of each type and translating to English', async () => {
    const { storage } = createMemoryStorage();

    const { result } = await renderLocalModels({ storage });

    expect(result.current.speechModel.id).toBe('whisper-base-q5_1');
    expect(result.current.languageModel.id).toBe('qwen2.5-1.5b-instruct-q4_k_m');
    expect(result.current.shouldTranslateToEnglish).toBe(true);
  });

  it('reads saved settings under the keys er-mobile used before this package', async () => {
    const { storage } = createMemoryStorage({
      AudioFormFillSpeechModel: 'whisper-small-q5_1',
      AudioFormFillLanguageModel: 'qwen3-1.7b-q4_k_m',
      AudioFormFillTranslate: false,
    });

    const { result } = await renderLocalModels({ storage });

    expect(result.current.speechModel).toBe(SMALL_SPEECH);
    expect(result.current.languageModel).toBe(QWEN3);
    expect(result.current.shouldTranslateToEnglish).toBe(false);
  });

  it('saves a selected model and translate preference', async () => {
    const { storage } = createMemoryStorage();
    const { result } = await renderLocalModels({ storage });

    act(() => {
      result.current.onSelectModel(SMALL_SPEECH);
      result.current.onSelectModel(QWEN3);
      result.current.setShouldTranslateToEnglish(false);
    });

    expect(storage.getString(AUDIO_FORM_FILL_STORAGE_KEYS.speechModel)).toBe('whisper-small-q5_1');
    expect(storage.getString(AUDIO_FORM_FILL_STORAGE_KEYS.languageModel)).toBe('qwen3-1.7b-q4_k_m');
    expect(storage.getBoolean(AUDIO_FORM_FILL_STORAGE_KEYS.translateToEnglish)).toBe(false);
    expect(result.current.speechModel).toBe(SMALL_SPEECH);
    expect(result.current.languageModel).toBe(QWEN3);
    expect(result.current.shouldTranslateToEnglish).toBe(false);
  });

  it('updates every screen using the hook when storage reports a change', async () => {
    const { storage } = createMemoryStorage();
    const settingsScreen = await renderLocalModels({ storage });
    const reportForm = await renderLocalModels({ storage });

    act(() => {
      settingsScreen.result.current.onSelectModel(SMALL_SPEECH);
    });

    expect(reportForm.result.current.speechModel).toBe(SMALL_SPEECH);
  });

  it('still updates the component that made a change when storage cannot subscribe', async () => {
    const { storage } = createMemoryStorage({}, { canSubscribe: false });
    const { result } = await renderLocalModels({ storage });

    act(() => {
      result.current.onSelectModel(SMALL_SPEECH);
    });

    expect(result.current.speechModel).toBe(SMALL_SPEECH);
  });

  it('unsubscribes from storage when unmounted', async () => {
    const { storage, listenerCount } = createMemoryStorage();
    const { unmount } = await renderLocalModels({ storage });

    expect(listenerCount()).toBeGreaterThan(0);
    unmount();

    expect(listenerCount()).toBe(0);
  });

  it('reports which models are downloaded and whether the selected pair is ready', async () => {
    mockDownloadedFiles([BASE_SPEECH.fileName]);
    const { storage } = createMemoryStorage();
    const { result } = await renderLocalModels({ storage });

    await waitFor(() => expect(result.current.downloadedModelIds).toEqual(['whisper-base-q5_1']));
    expect(result.current.areModelsReady).toBe(false);

    mockDownloadedFiles([BASE_SPEECH.fileName, 'qwen2.5-1.5b-instruct-q4_k_m.gguf']);
    await act(async () => { await result.current.refreshDownloadedModels(); });

    expect(result.current.areModelsReady).toBe(true);
  });

  it('downloads a model, tracks progress and logs completion', async () => {
    const logger = createLogger();
    const { storage } = createMemoryStorage();
    let finishDownload: (statusCode: number) => void = () => undefined;
    mockFs.downloadFile.mockImplementation((options) => {
      options.progress?.({ jobId: 1, bytesWritten: 25, contentLength: 100 });
      return {
        jobId: 1,
        promise: new Promise((resolve) => {
          finishDownload = (statusCode) => resolve({ jobId: 1, statusCode, bytesWritten: 100 });
        }),
      };
    });
    const { result } = await renderLocalModels({ storage, logger });

    let download: Promise<void> = Promise.resolve();
    act(() => {
      download = result.current.onDownloadModel(BASE_SPEECH);
    });
    await waitFor(() => expect(result.current.downloadProgress).toEqual({ 'whisper-base-q5_1': 0.25 }));

    mockDownloadedFiles([BASE_SPEECH.fileName]);
    await act(async () => {
      finishDownload(200);
      await download;
    });

    expect(result.current.downloadProgress).toEqual({});
    expect(result.current.downloadedModelIds).toEqual(['whisper-base-q5_1']);
    expect(logger.info).toHaveBeenCalledWith('Downloaded whisper-base-q5_1');
  });

  it('reports a failed download', async () => {
    const logger = createLogger();
    const { storage } = createMemoryStorage();
    mockFs.downloadFile.mockReturnValue({
      jobId: 1,
      promise: Promise.resolve({ jobId: 1, statusCode: 503, bytesWritten: 0 }),
    });
    const { result } = await renderLocalModels({ storage, logger });

    await act(async () => { await result.current.onDownloadModel(BASE_SPEECH); });

    expect(result.current.downloadError).toBe('Model download failed for whisper-base-q5_1 with status 503');
    expect(result.current.downloadProgress).toEqual({});
    expect(logger.error).toHaveBeenCalledWith('Model download failed', expect.any(Error));
  });

  it('offers an app-provided model list', async () => {
    const { storage } = createMemoryStorage();

    const { result } = await renderLocalModels({ storage, models: CUSTOM_MODELS });

    expect(result.current.speechModels).toEqual([CUSTOM_MODELS[0]]);
    expect(result.current.languageModel).toBe(CUSTOM_MODELS[1]);
  });
});
