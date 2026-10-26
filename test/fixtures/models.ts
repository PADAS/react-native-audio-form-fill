/**
 * Model lists for registry and download tests
 */

import { LocalModel } from '../../src';

export const CUSTOM_MODELS: LocalModel[] = [
  {
    id: 'custom-speech',
    type: 'speech',
    name: 'Custom speech',
    fileName: 'custom-speech.bin',
    url: 'https://example.com/custom-speech.bin',
    sizeMB: 10,
  },
  {
    id: 'custom-language',
    type: 'language',
    name: 'Custom language',
    fileName: 'custom-language.gguf',
    url: 'https://example.com/custom-language.gguf',
    sizeMB: 20,
  },
];
