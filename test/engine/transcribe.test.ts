import { initWhisper, WhisperContext } from 'whisper.rn';

import { getModelForType, releaseDictationModels, transcribeAudio } from '../../src';

const BASE_MODEL = getModelForType('speech', 'whisper-base-q5_1');
const SMALL_MODEL = getModelForType('speech', 'whisper-small-q5_1');

const mockInitWhisper = jest.mocked(initWhisper);

const createWhisperContext = (result: string) => {
  const context = {
    transcribe: jest.fn(() => ({ stop: jest.fn(), promise: Promise.resolve({ result, language: 'en' }) })),
    release: jest.fn(),
  };
  // Only the members the engine uses are faked
  mockInitWhisper.mockResolvedValueOnce(context as unknown as WhisperContext);
  return context;
};

beforeEach(async () => {
  await releaseDictationModels();
  jest.clearAllMocks();
});

describe('transcribeAudio', () => {
  it('loads the model, transcribes with auto language detection and trims the transcript', async () => {
    const context = createWhisperContext('  Two snares near the river  ');

    const result = await transcribeAudio(BASE_MODEL, '/tmp/dictation.wav', true);

    expect(mockInitWhisper).toHaveBeenCalledWith({
      filePath: '/documents/local-ai-models/ggml-base-q5_1.bin',
    });
    expect(context.transcribe).toHaveBeenCalledWith('/tmp/dictation.wav', { language: 'auto', translate: true });
    expect(result).toMatchObject({ transcript: 'Two snares near the river', language: 'en' });
  });

  it('keeps the loaded model for the next dictation', async () => {
    createWhisperContext('first');
    await transcribeAudio(BASE_MODEL, '/tmp/one.wav', false);

    const second = await transcribeAudio(BASE_MODEL, '/tmp/two.wav', false);

    expect(mockInitWhisper).toHaveBeenCalledTimes(1);
    expect(second.loadMs).toBe(0);
  });

  it('releases the loaded model when a different one is selected', async () => {
    const baseContext = createWhisperContext('base');
    await transcribeAudio(BASE_MODEL, '/tmp/one.wav', false);
    createWhisperContext('small');

    const result = await transcribeAudio(SMALL_MODEL, '/tmp/two.wav', false);

    expect(baseContext.release).toHaveBeenCalled();
    expect(result.transcript).toBe('small');
  });
});
