/**
 * Model selection, translation preference and downloads for Audio Form Fill, saved in app-provided storage
 */

import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import {
  downloadModel, getModelForType, getModelsForType, isModelDownloaded, LOCAL_MODELS, LocalModel,
} from '../models';
import { AUDIO_FORM_FILL_STORAGE_KEYS, useStoredBoolean, useStoredString } from './storage';
import { UseLocalModelsOptions } from './types';
import { NOOP_LOGGER } from './logger';

export const useLocalModels = ({ storage, models = LOCAL_MODELS, logger = NOOP_LOGGER }: UseLocalModelsOptions) => {
  // Persisted State
  const [speechModelId, setSpeechModelId] = useStoredString(storage, AUDIO_FORM_FILL_STORAGE_KEYS.speechModel);
  const [languageModelId, setLanguageModelId] = useStoredString(storage, AUDIO_FORM_FILL_STORAGE_KEYS.languageModel);
  const [translatePreference, setTranslatePreference] = useStoredBoolean(
    storage,
    AUDIO_FORM_FILL_STORAGE_KEYS.translateToEnglish,
  );

  // Component's State
  const [downloadedModelIds, setDownloadedModelIds] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadError, setDownloadError] = useState<string>();

  // References
  // Read through a ref so an inline logger object doesn't re-create callbacks every render
  const loggerRef = useRef(logger);
  loggerRef.current = logger;

  // Constants
  const speechModel = getModelForType('speech', speechModelId, models);
  const languageModel = getModelForType('language', languageModelId, models);
  const areModelsReady = downloadedModelIds.includes(speechModel.id)
    && downloadedModelIds.includes(languageModel.id);
  // Translating to English is on by default because form options are written in English
  const shouldTranslateToEnglish = translatePreference ?? true;

  // Call when returning to a screen (e.g. from useFocusEffect) to pick up downloads made elsewhere
  const refreshDownloadedModels = useCallback(async () => {
    const downloaded = await Promise.all(
      models.map(async (model) => ((await isModelDownloaded(model)) ? model.id : undefined)),
    );
    setDownloadedModelIds(downloaded.filter((id): id is string => id !== undefined));
  }, [models]);

  useEffect(() => {
    refreshDownloadedModels();
  }, [refreshDownloadedModels]);

  const onDownloadModel = useCallback(async (model: LocalModel) => {
    try {
      setDownloadError(undefined);
      setDownloadProgress((progress) => ({ ...progress, [model.id]: 0 }));
      await downloadModel(model, (fraction) => {
        setDownloadProgress((progress) => ({ ...progress, [model.id]: fraction }));
      });
      loggerRef.current.info(`Downloaded ${model.id}`);
      await refreshDownloadedModels();
    } catch (error) {
      loggerRef.current.error('Model download failed', error);
      setDownloadError(error instanceof Error ? error.message : String(error));
    } finally {
      setDownloadProgress((progress) => {
        const remaining = { ...progress };
        delete remaining[model.id];
        return remaining;
      });
    }
  }, [refreshDownloadedModels]);

  const onSelectModel = useCallback((model: LocalModel) => {
    if (model.type === 'speech') {
      setSpeechModelId(model.id);
    } else {
      setLanguageModelId(model.id);
    }
  }, [setLanguageModelId, setSpeechModelId]);

  const setShouldTranslateToEnglish = useCallback((value: boolean) => {
    setTranslatePreference(value);
  }, [setTranslatePreference]);

  return {
    speechModels: getModelsForType('speech', models),
    languageModels: getModelsForType('language', models),
    speechModel,
    languageModel,
    areModelsReady,
    downloadedModelIds,
    downloadProgress,
    downloadError,
    shouldTranslateToEnglish,
    setShouldTranslateToEnglish,
    onDownloadModel,
    onSelectModel,
    refreshDownloadedModels,
  };
};
