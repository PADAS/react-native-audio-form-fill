/**
 * Loads Whisper and llama.cpp models and keeps one of each in memory between dictations
 */

import { initWhisper, WhisperContext } from 'whisper.rn';
import { initLlama, LlamaContext, releaseAllLlama } from 'llama.rn';

import { getModelPath, LocalModel } from '../models';

// Constants
const LANGUAGE_MODEL_CONTEXT_SIZE = 4096;
// Offload every layer; llama.rn falls back to CPU on devices without a usable GPU backend
const ALL_GPU_LAYERS = 99;

interface Releasable {
  release: () => Promise<void>;
}

interface LoadedContext<T> {
  modelId: string;
  promise: Promise<T>;
}

let speechContext: LoadedContext<WhisperContext> | undefined;
let languageContext: LoadedContext<LlamaContext> | undefined;
const failedModelIds = new Set<string>();

const releaseContext = async (loaded?: LoadedContext<Releasable>) => {
  const context = await loaded?.promise.catch(() => undefined);
  await context?.release();
};

const loadContext = <T extends Releasable>(
  current: LoadedContext<T> | undefined,
  model: LocalModel,
  load: () => Promise<T>,
): LoadedContext<T> => {
  if (current?.modelId === model.id) {
    return current;
  }
  return {
    modelId: model.id,
    promise: releaseContext(current).then(load),
  };
};

const waitForContext = async <T>(loaded: LoadedContext<T>, model: LocalModel, clear: () => void) => {
  const startedAt = Date.now();
  try {
    const context = await loaded.promise;
    failedModelIds.delete(model.id);
    return { context, loadMs: Date.now() - startedAt };
  } catch (error) {
    clear();
    failedModelIds.add(model.id);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load ${model.type} model ${model.id}: ${message}`);
  }
};

const initLanguageModel = async (model: LocalModel) => {
  try {
    return await initLlama({
      model: getModelPath(model),
      n_ctx: LANGUAGE_MODEL_CONTEXT_SIZE,
      n_gpu_layers: ALL_GPU_LAYERS,
    });
  } catch (error) {
    await releaseAllLlama().catch(() => undefined);
    throw error;
  }
};

export const getSpeechContext = (model: LocalModel): Promise<{ context: WhisperContext; loadMs: number }> => {
  const loaded = loadContext(speechContext, model, () => initWhisper({ filePath: getModelPath(model) }));
  speechContext = loaded;
  return waitForContext(loaded, model, () => {
    if (speechContext === loaded) speechContext = undefined;
  });
};

export const getLanguageContext = (model: LocalModel): Promise<{ context: LlamaContext; loadMs: number }> => {
  const loaded = loadContext(languageContext, model, () => initLanguageModel(model));
  languageContext = loaded;
  return waitForContext(loaded, model, () => {
    if (languageContext === loaded) languageContext = undefined;
  });
};

export const preloadDictationModels = async (speechModel: LocalModel, languageModel: LocalModel): Promise<void> => {
  await Promise.all([
    failedModelIds.has(speechModel.id) ? undefined : getSpeechContext(speechModel),
    failedModelIds.has(languageModel.id) ? undefined : getLanguageContext(languageModel),
  ]);
};

export const releaseDictationModels = async (): Promise<void> => {
  const loaded = [speechContext, languageContext];
  speechContext = undefined;
  languageContext = undefined;
  failedModelIds.clear();
  await Promise.all(loaded.map(releaseContext));
};
