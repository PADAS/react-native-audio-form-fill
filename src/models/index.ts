/**
 * Public API of the models layer
 */

export type { LocalModel, LocalModelType } from './types';
export {
  getModelForType, getModelsForType, LOCAL_MODELS,
} from './registry';
export {
  deleteModel, downloadModel, getDownloadProgress, getModelPath, isModelDownloaded, subscribeToDownloads,
} from './downloads';
