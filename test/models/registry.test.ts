import { getModelForType, getModelsForType, LOCAL_MODELS } from '../../src';
import { CUSTOM_MODELS } from '../fixtures/models';

describe('getModelsForType', () => {
  it('lists the built-in models of a type', () => {
    expect(getModelsForType('speech').map(({ id }) => id)).toEqual(['whisper-base-q5_1', 'whisper-small-q5_1']);
    expect(getModelsForType('language').map(({ id }) => id))
      .toEqual(['qwen2.5-1.5b-instruct-q4_k_m', 'qwen3-1.7b-q4_k_m']);
  });

  it('uses an app-provided model list when given one', () => {
    expect(getModelsForType('language', CUSTOM_MODELS)).toEqual([CUSTOM_MODELS[1]]);
  });
});

describe('getModelForType', () => {
  it('returns the saved model', () => {
    expect(getModelForType('speech', 'whisper-small-q5_1').id).toBe('whisper-small-q5_1');
  });

  it('falls back to the first model of the type for a missing or unknown id', () => {
    expect(getModelForType('language', undefined)).toBe(LOCAL_MODELS[2]);
    expect(getModelForType('language', 'removed-model')).toBe(LOCAL_MODELS[2]);
  });

  it('ignores an id that belongs to the other type', () => {
    expect(getModelForType('speech', 'qwen3-1.7b-q4_k_m').id).toBe('whisper-base-q5_1');
  });
});
