/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import RNFS from 'react-native-fs';

import {
  DictationLogger, extractFormValues, getModelForType, preloadDictationModels, transcribeAudio, useFormDictation,
  UseFormDictationOptions,
} from '../../src';
import { AudioManager, mockRecorder } from '../mocks/reactNativeAudioApi';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

jest.mock('../../src/engine', () => ({
  transcribeAudio: jest.fn(),
  extractFormValues: jest.fn(),
  preloadDictationModels: jest.fn(),
}));

const SPEECH_MODEL = getModelForType('speech', undefined);
const LANGUAGE_MODEL = getModelForType('language', undefined);
const AUDIO_PATH = '/cache/dictation-1.wav';

const mockTranscribeAudio = jest.mocked(transcribeAudio);
const mockExtractFormValues = jest.mocked(extractFormValues);
const mockPreloadDictationModels = jest.mocked(preloadDictationModels);

const createLogger = (): jest.Mocked<DictationLogger> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const renderDictation = (overrides: Partial<UseFormDictationOptions> = {}) => {
  const options: UseFormDictationOptions = {
    jsonSchema: DICTATION_V2_SCHEMA_MOCK,
    currentValues: { observations: 'Found at dawn' },
    onFilled: jest.fn(),
    speechModel: SPEECH_MODEL,
    languageModel: LANGUAGE_MODEL,
    shouldTranslateToEnglish: true,
    logger: createLogger(),
    ...overrides,
  };
  return { options, ...renderHook(() => useFormDictation(options)) };
};

const mockExtraction = (values: Record<string, unknown>) => {
  mockExtractFormValues.mockResolvedValue({
    values,
    rejected: [],
    rawOutput: JSON.stringify(values),
    loadMs: 0,
    extractMs: 2500,
    promptTokens: 176,
    promptTokensPerSecond: 150,
    generatedTokens: 23,
    generatedTokensPerSecond: 10,
  });
};

const recordAndStop = async (result: ReturnType<typeof renderDictation>['result']) => {
  await act(async () => { await result.current.toggleRecording(); });
  await act(async () => { await result.current.toggleRecording(); });
};

beforeEach(() => {
  jest.clearAllMocks();
  AudioManager.checkRecordingPermissions.mockResolvedValue('Granted');
  mockRecorder.start.mockResolvedValue({ status: 'success' });
  mockRecorder.stop.mockResolvedValue({
    status: 'success', paths: [AUDIO_PATH], size: 0.2, duration: 6,
  });
  jest.mocked(RNFS.unlink).mockResolvedValue(undefined);
  mockPreloadDictationModels.mockResolvedValue(undefined);
  mockTranscribeAudio.mockResolvedValue({
    transcript: 'Two shots heard', language: 'en', loadMs: 0, transcribeMs: 800,
  });
  mockExtraction({ shots: 2 });
});

describe('useFormDictation', () => {
  it('counts and logs the fields that can be dictated', () => {
    const { result, options } = renderDictation();

    expect(result.current.status).toBe('idle');
    expect(result.current.fieldCount).toBe(8);
    expect(options.logger?.info).toHaveBeenCalledWith(
      '8 fields can be dictated, 3 skipped: weaponLocation (unsupportedType), photos (unsupportedType), '
        + 'emptyChoice (noOptions)',
    );
  });

  it('logs the field summary once even when given a new logger object every render', () => {
    const info = jest.fn();
    const { rerender } = renderHook(() => useFormDictation({
      jsonSchema: DICTATION_V2_SCHEMA_MOCK,
      currentValues: {},
      onFilled: jest.fn(),
      speechModel: SPEECH_MODEL,
      languageModel: LANGUAGE_MODEL,
      shouldTranslateToEnglish: true,
      logger: {
        debug: jest.fn(), info, warn: jest.fn(), error: jest.fn(),
      },
    }));

    rerender();
    rerender();

    expect(info).toHaveBeenCalledTimes(1);
  });

  it('records a 16 kHz mono WAV file', async () => {
    const { result } = renderDictation();

    await act(async () => { await result.current.toggleRecording(); });

    expect(result.current.status).toBe('recording');
    expect(mockRecorder.enableFileOutput).toHaveBeenCalledWith(expect.objectContaining({
      channelCount: 1,
      preset: expect.objectContaining({ sampleRate: 16000 }),
    }));
    expect(AudioManager.setAudioSessionActivity).toHaveBeenCalledWith(true);
  });

  it('starts loading the models when recording starts', async () => {
    const { result } = renderDictation();

    await act(async () => { await result.current.toggleRecording(); });

    expect(mockPreloadDictationModels).toHaveBeenCalledWith(SPEECH_MODEL, LANGUAGE_MODEL);
  });

  it('logs a failed preload and keeps recording', async () => {
    mockPreloadDictationModels.mockRejectedValue(new Error('out of memory'));
    const { result, options } = renderDictation();

    await act(async () => { await result.current.toggleRecording(); });

    expect(result.current.status).toBe('recording');
    expect(options.logger?.warn).toHaveBeenCalledWith('Model preload failed: out of memory');
  });

  it('does not record without microphone permission', async () => {
    AudioManager.checkRecordingPermissions.mockResolvedValue('Denied');
    AudioManager.requestRecordingPermissions.mockResolvedValue('Denied');
    const { result, options } = renderDictation();

    await act(async () => { await result.current.toggleRecording(); });

    expect(result.current.status).toBe('idle');
    expect(mockRecorder.start).not.toHaveBeenCalled();
    expect(mockPreloadDictationModels).not.toHaveBeenCalled();
    expect(options.logger?.warn).toHaveBeenCalledWith('Microphone permission was not granted');
  });

  it('transcribes, fills the form, deletes the recording and returns to idle', async () => {
    const { result, options } = renderDictation({ getUsedMemory: async () => 800 * 1024 * 1024 });

    await recordAndStop(result);

    expect(mockTranscribeAudio).toHaveBeenCalledWith(SPEECH_MODEL, AUDIO_PATH, true);
    expect(mockExtractFormValues).toHaveBeenCalledWith(
      LANGUAGE_MODEL,
      expect.arrayContaining([expect.objectContaining({ key: 'shots' })]),
      'Two shots heard',
      { observations: 'Found at dawn' },
    );
    expect(options.onFilled).toHaveBeenCalledWith({ shots: 2 });
    expect(RNFS.unlink).toHaveBeenCalledWith(AUDIO_PATH);
    expect(result.current.status).toBe('idle');
    expect(options.logger?.info).toHaveBeenCalledWith(expect.stringContaining('"usedMemoryMB":800'));
  });

  it('applies dictated changes to the current selections and clears fields the ranger cleared', async () => {
    mockExtraction({ threats: { add: ['fire'], remove: ['snare'] }, species: null, shots: 2 });
    const { result, options } = renderDictation({
      currentValues: { threats: ['snare', 'gunshot'], species: 'rhino_uuid', shots: 1 },
    });

    await recordAndStop(result);

    expect(options.onFilled).toHaveBeenCalledWith({ threats: ['gunshot', 'fire'], species: undefined, shots: 2 });
  });

  it('logs the raw extraction output on one line', async () => {
    mockExtractFormValues.mockResolvedValueOnce({
      values: { shots: 2 },
      rejected: [],
      rawOutput: '<|im_start|>assistant\n{"fills": [{"shots": 2}]}',
      loadMs: 0,
      extractMs: 2500,
      promptTokens: 176,
      promptTokensPerSecond: 150,
      generatedTokens: 23,
      generatedTokensPerSecond: 10,
    });
    const { result, options } = renderDictation();

    await recordAndStop(result);

    expect(options.logger?.debug).toHaveBeenCalledWith(
      'Extraction output: "<|im_start|>assistant\\n{\\"fills\\": [{\\"shots\\": 2}]}"',
    );
  });

  it('logs filled choices with their titles next to the stored values', async () => {
    mockExtraction({ threats: { add: ['fire'], remove: ['snare'] }, species: 'rhino_uuid', shots: 2 });
    const { result, options } = renderDictation();

    await recordAndStop(result);

    expect(options.logger?.info).toHaveBeenCalledWith('Filled fields: {"threats":{"add":["Fire (fire)"],'
      + '"remove":["Snare (snare)"]},"species":"Rhino (rhino_uuid)","shots":2}');
  });

  it('logs each status change', async () => {
    const { result, options } = renderDictation();

    await recordAndStop(result);

    const statuses = jest.mocked(options.logger!.info).mock.calls
      .map(([message]) => message)
      .filter((message) => message.startsWith('Dictation status:'));
    expect(statuses).toEqual([
      'Dictation status: recording',
      'Dictation status: transcribing',
      'Dictation status: extracting',
      'Dictation status: idle',
    ]);
  });

  it('skips filling when no speech was recognised', async () => {
    mockTranscribeAudio.mockResolvedValue({
      transcript: '', language: 'en', loadMs: 0, transcribeMs: 500,
    });
    const { result, options } = renderDictation();

    await recordAndStop(result);

    expect(mockExtractFormValues).not.toHaveBeenCalled();
    expect(options.onFilled).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('does not call onFilled when no field was filled', async () => {
    mockExtraction({});
    const { result, options } = renderDictation();

    await recordAndStop(result);

    expect(options.onFilled).not.toHaveBeenCalled();
  });

  it('logs a failure and returns to idle', async () => {
    const failure = new Error('model failed to load');
    mockTranscribeAudio.mockRejectedValue(failure);
    const { result, options } = renderDictation();

    await recordAndStop(result);

    expect(options.logger?.error).toHaveBeenCalledWith('Dictation failed', failure);
    expect(RNFS.unlink).toHaveBeenCalledWith(AUDIO_PATH);
    expect(result.current.status).toBe('idle');
  });

  it('stops an active recording when unmounted', () => {
    mockRecorder.isRecording.mockReturnValue(true);
    const { unmount } = renderDictation();

    unmount();

    expect(mockRecorder.stop).toHaveBeenCalled();
  });
});
