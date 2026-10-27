import { initLlama, LlamaContext } from 'llama.rn';

import {
  extractFormValues, getDictationFields, getModelForType, releaseDictationModels,
} from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

const MODEL = getModelForType('language', 'qwen2.5-1.5b-instruct-q4_k_m');
const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);

const TIMINGS = {
  prompt_n: 176,
  prompt_per_second: 150,
  predicted_n: 23,
  predicted_per_second: 10,
};

const mockInitLlama = jest.mocked(initLlama);

const createLlamaContext = (output: { content: string; text: string }) => {
  const context = {
    completion: jest.fn().mockResolvedValue({ ...output, timings: TIMINGS }),
    release: jest.fn(),
  };
  // Only the members the engine uses are faked
  mockInitLlama.mockResolvedValueOnce(context as unknown as LlamaContext);
  return context;
};

beforeEach(async () => {
  await releaseDictationModels();
  jest.clearAllMocks();
});

describe('extractFormValues', () => {
  it('loads the model with full GPU offload and constrains output to the form fields', async () => {
    const context = createLlamaContext({ content: '{"shots": 2}', text: '{"shots": 2}' });

    await extractFormValues(MODEL, fields, 'Two shots heard', {});

    expect(mockInitLlama).toHaveBeenCalledWith({
      model: '/documents/local-ai-models/qwen2.5-1.5b-instruct-q4_k_m.gguf',
      n_ctx: 4096,
      n_gpu_layers: 99,
    });
    const [params] = context.completion.mock.calls[0];
    expect(params).toMatchObject({
      response_format: { type: 'json_schema', json_schema: { strict: true } },
      jinja: true,
      enable_thinking: false,
      add_generation_prompt: true,
      temperature: 0,
      n_predict: 512,
    });
    expect(params.response_format.json_schema.schema.properties).toHaveProperty('shots');
    expect(params.messages[1].content).toContain('What the ranger said: "Two shots heard"');
  });

  it('returns checked values, rejections, the raw output and timings', async () => {
    createLlamaContext({ content: '{"shots": 2, "species": "Lion"}', text: '' });

    const result = await extractFormValues(MODEL, fields, 'Two shots at a lion', {});

    expect(result).toMatchObject({
      values: { shots: 2 },
      rejected: [{ key: 'species', value: 'Lion', reason: 'unknownOption' }],
      rawOutput: '{"shots": 2, "species": "Lion"}',
      promptTokens: 176,
      promptTokensPerSecond: 150,
      generatedTokens: 23,
      generatedTokensPerSecond: 10,
    });
  });

  it('turns a clear the ranger did not ask for into removing the options they named', async () => {
    createLlamaContext({ content: '{"threats": null}', text: '' });

    const result = await extractFormValues(MODEL, fields, 'Move snare from threats.', { threats: ['snare', 'fire'] });

    expect(result.values).toEqual({ threats: { add: [], remove: ['snare'] } });
  });

  it('falls back to the full text when the chat parser returns no content', async () => {
    createLlamaContext({ content: '', text: '<|im_start|>assistant\n{"shots": 3}' });

    const result = await extractFormValues(MODEL, fields, 'Three shots', {});

    expect(result.values).toEqual({ shots: 3 });
  });
});

describe('releaseDictationModels', () => {
  it('releases the loaded model so the next extraction loads it again', async () => {
    const context = createLlamaContext({ content: '{}', text: '{}' });
    await extractFormValues(MODEL, fields, 'Nothing', {});

    await releaseDictationModels();
    createLlamaContext({ content: '{}', text: '{}' });
    await extractFormValues(MODEL, fields, 'Nothing', {});

    expect(context.release).toHaveBeenCalled();
    expect(mockInitLlama).toHaveBeenCalledTimes(2);
  });
});
