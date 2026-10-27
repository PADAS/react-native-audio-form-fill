/**
 * Downloading, locating and deleting model files on the device
 */

import RNFS from 'react-native-fs';

import { LocalModel } from './types';

// Constants
const MODELS_DIRECTORY = `${RNFS.DocumentDirectoryPath}/local-ai-models`;

export const getModelPath = (model: LocalModel) => `${MODELS_DIRECTORY}/${model.fileName}`;

// Downloads land at a temporary path first so an interrupted download is never mistaken for a usable model
const getPartialModelPath = (model: LocalModel) => `${getModelPath(model)}.partial`;

const activeDownloads = new Map<string, Promise<void>>();
const downloadListeners = new Set<() => void>();
let downloadProgress: Record<string, number> = {};

const setDownloadProgress = (modelId: string, fraction?: number) => {
  const next = { ...downloadProgress };
  if (fraction === undefined) {
    delete next[modelId];
  } else {
    next[modelId] = fraction;
  }
  downloadProgress = next;
  downloadListeners.forEach((listener) => listener());
};

export const subscribeToDownloads = (listener: () => void) => {
  downloadListeners.add(listener);
  return () => {
    downloadListeners.delete(listener);
  };
};

export const getDownloadProgress = () => downloadProgress;

export const isModelDownloaded = async (model: LocalModel): Promise<boolean> => RNFS.exists(getModelPath(model));

const runDownload = async (
  model: LocalModel,
  onProgress: (fraction: number) => void,
): Promise<void> => {
  await RNFS.mkdir(MODELS_DIRECTORY);

  const partialPath = getPartialModelPath(model);
  if (await RNFS.exists(partialPath)) {
    await RNFS.unlink(partialPath);
  }

  const { promise } = RNFS.downloadFile({
    fromUrl: model.url,
    toFile: partialPath,
    background: true,
    progressInterval: 500,
    begin: () => undefined,
    progress:({ bytesWritten, contentLength }) => {
      if (contentLength > 0) {
        onProgress(bytesWritten / contentLength);
      }
    },
  });

  const { statusCode } = await promise;
  if (statusCode !== 200) {
    await RNFS.unlink(partialPath);
    throw new Error(`Model download failed for ${model.id} with status ${statusCode}`);
  }

  await RNFS.moveFile(partialPath, getModelPath(model));
};

export const downloadModel = (model: LocalModel): Promise<void> => {
  const activeDownload = activeDownloads.get(model.id);
  if (activeDownload) {
    return activeDownload;
  }

  setDownloadProgress(model.id, 0);
  const download = runDownload(model, (fraction) => setDownloadProgress(model.id, fraction))
    .finally(() => {
      activeDownloads.delete(model.id);
      setDownloadProgress(model.id);
    });
  activeDownloads.set(model.id, download);
  return download;
};

export const deleteModel = async (model: LocalModel): Promise<void> => {
  if (await isModelDownloaded(model)) {
    await RNFS.unlink(getModelPath(model));
  }
};
