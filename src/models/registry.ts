/**
 * The speech and language models available for download, and lookups by type and id
 */

import { LocalModel, LocalModelType } from './types';

// Constants
const HUGGING_FACE_BASE_URL = 'https://huggingface.co';

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'whisper-base-q5_1',
    type: 'speech',
    name: 'Whisper base (multilingual)',
    fileName: 'ggml-base-q5_1.bin',
    url: `${HUGGING_FACE_BASE_URL}/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin`,
    sizeMB: 60,
  },
  {
    id: 'whisper-small-q5_1',
    type: 'speech',
    name: 'Whisper small (multilingual)',
    fileName: 'ggml-small-q5_1.bin',
    url: `${HUGGING_FACE_BASE_URL}/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin`,
    sizeMB: 190,
  },
  {
    id: 'qwen3-1.7b-q4_k_m',
    type: 'language',
    name: 'Qwen3 1.7B',
    fileName: 'Qwen3-1.7B-Q4_K_M.gguf',
    url: `${HUGGING_FACE_BASE_URL}/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf`,
    sizeMB: 1107,
  },
  {
    id: 'qwen2.5-1.5b-instruct-q4_k_m',
    type: 'language',
    name: 'Qwen2.5 1.5B Instruct',
    fileName: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    url: `${HUGGING_FACE_BASE_URL}/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf`,
    sizeMB: 1117,
  },
];

export const getModelsForType = (type: LocalModelType, models: LocalModel[] = LOCAL_MODELS) => (
  models.filter((model) => model.type === type)
);

// Falls back to the first model of the type when nothing (or an unknown id) has been saved
export const getModelForType = (
  type: LocalModelType,
  modelId: string | undefined,
  models: LocalModel[] = LOCAL_MODELS,
): LocalModel => {
  const modelsOfType = getModelsForType(type, models);
  return modelsOfType.find((model) => model.id === modelId) || modelsOfType[0];
};
