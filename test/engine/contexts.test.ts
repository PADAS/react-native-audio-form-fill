import { initWhisper, WhisperContext } from 'whisper.rn';
import { initLlama, LlamaContext } from 'llama.rn';

import {
  extractFormValues,
  getDictationFields,
  getModelForType,
  preloadDictationModels,
  releaseDictationModels,
  transcribeAudio,
} from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

const SPEECH_MODEL = getModelForType('speech', 'whisper-base-q5_1');
const LANGUAGE_MODEL = getModelForType('language', 'qwen2.5-1.5b-instruct-q4_k_m');
const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);

const mockInitWhisper = jest.mocked(initWhisper);
const mockInitLlama = jest.mocked(initLlama);

// Only the members the engine uses are faked
const createWhisperContext = () => ({
  transcribe: jest.fn(() => ({ stop: jest.fn(), promise: Promise.resolve({ result: 'Two shots', language: 'en' }) })),
  release: jest.fn(),
});

const createLlamaContext = () => ({
  completion: jest.fn().mockResolvedValue({
    content: '{"shots": 2}',
    text: '',
    timings: {
      prompt_n: 1, prompt_per_second: 1, predicted_n: 1, predicted_per_second: 1,
    },
  }),
  release: jest.fn(),
});

beforeEach(async () => {
  await releaseDictationModels();
  jest.clearAllMocks();
});

describe('preloadDictationModels', () => {
  it('loads both models so the next dictation does not wait for them', async () => {
    mockInitWhisper.mockResolvedValueOnce(createWhisperContext() as unknown as WhisperContext);
    mockInitLlama.mockResolvedValueOnce(createLlamaContext() as unknown as LlamaContext);

    await preloadDictationModels(SPEECH_MODEL, LANGUAGE_MODEL);
    await transcribeAudio(SPEECH_MODEL, '/tmp/dictation.wav', true);
    await extractFormValues(LANGUAGE_MODEL, fields, 'Two shots', {});

    expect(mockInitWhisper).toHaveBeenCalledTimes(1);
    expect(mockInitLlama).toHaveBeenCalledTimes(1);
  });

  it('shares a load still in progress with a dictation that needs the same model', async () => {
    let finishLoad: () => void = () => undefined;
    mockInitWhisper.mockReturnValueOnce(new Promise((resolve) => {
      finishLoad = () => resolve(createWhisperContext() as unknown as WhisperContext);
    }));
    mockInitLlama.mockResolvedValueOnce(createLlamaContext() as unknown as LlamaContext);

    const preload = preloadDictationModels(SPEECH_MODEL, LANGUAGE_MODEL);
    const transcription = transcribeAudio(SPEECH_MODEL, '/tmp/dictation.wav', true);
    await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    finishLoad();
    await Promise.all([preload, transcription]);

    expect(mockInitWhisper).toHaveBeenCalledTimes(1);
  });

  it('retries a load that failed', async () => {
    mockInitWhisper.mockRejectedValueOnce(new Error('out of memory'));
    mockInitLlama.mockResolvedValueOnce(createLlamaContext() as unknown as LlamaContext);
    await expect(preloadDictationModels(SPEECH_MODEL, LANGUAGE_MODEL)).rejects.toThrow('out of memory');

    mockInitWhisper.mockResolvedValueOnce(createWhisperContext() as unknown as WhisperContext);
    const result = await transcribeAudio(SPEECH_MODEL, '/tmp/dictation.wav', true);

    expect(result.transcript).toBe('Two shots');
    expect(mockInitWhisper).toHaveBeenCalledTimes(2);
  });

  it('releases a model loaded by a preload', async () => {
    const whisperContext = createWhisperContext();
    const llamaContext = createLlamaContext();
    mockInitWhisper.mockResolvedValueOnce(whisperContext as unknown as WhisperContext);
    mockInitLlama.mockResolvedValueOnce(llamaContext as unknown as LlamaContext);
    await preloadDictationModels(SPEECH_MODEL, LANGUAGE_MODEL);

    await releaseDictationModels();

    expect(whisperContext.release).toHaveBeenCalled();
    expect(llamaContext.release).toHaveBeenCalled();
  });
});
