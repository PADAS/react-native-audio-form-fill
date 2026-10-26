/**
 * Loads Whisper and llama.cpp models and keeps one of each in memory between dictations
 */

import { initWhisper, WhisperContext } from 'whisper.rn';
import { initLlama, LlamaContext } from 'llama.rn';

import { getModelPath, LocalModel } from '../models';

// Constants
const LANGUAGE_MODEL_CONTEXT_SIZE = 4096;
// Offload every layer; llama.rn falls back to CPU on devices without a usable GPU backend
const ALL_GPU_LAYERS = 99;

// Contexts are kept between forms because loading a 1 GB model takes several seconds
let speechContext: { modelId: string; context: WhisperContext } | undefined;
let languageContext: { modelId: string; context: LlamaContext } | undefined;

export const getSpeechContext = async (model: LocalModel): Promise<{ context: WhisperContext; loadMs: number }> => {
  if (speechContext?.modelId === model.id) {
    return { context: speechContext.context, loadMs: 0 };
  }

  await speechContext?.context.release();
  const startedAt = Date.now();
  const context = await initWhisper({ filePath: getModelPath(model) });
  speechContext = { modelId: model.id, context };
  return { context, loadMs: Date.now() - startedAt };
};

export const getLanguageContext = async (model: LocalModel): Promise<{ context: LlamaContext; loadMs: number }> => {
  if (languageContext?.modelId === model.id) {
    return { context: languageContext.context, loadMs: 0 };
  }

  await languageContext?.context.release();
  const startedAt = Date.now();
  const context = await initLlama({
    model: getModelPath(model),
    n_ctx: LANGUAGE_MODEL_CONTEXT_SIZE,
    n_gpu_layers: ALL_GPU_LAYERS,
  });
  languageContext = { modelId: model.id, context };
  return { context, loadMs: Date.now() - startedAt };
};

export const releaseDictationModels = async (): Promise<void> => {
  await speechContext?.context.release();
  await languageContext?.context.release();
  speechContext = undefined;
  languageContext = undefined;
};
