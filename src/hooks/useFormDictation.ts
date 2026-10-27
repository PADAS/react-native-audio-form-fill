/**
 * Records speech, transcribes it and fills the form, exposing a single toggle for a dictation button
 */

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import RNFS from 'react-native-fs';

import {
  DictationField, getDictationFields, mergeDictatedValues, SkippedDictationField,
} from '../extraction';
import { extractFormValues, preloadDictationModels, transcribeAudio } from '../engine';
import {
  hasRecordingPermission, startDictationRecording, stopDictationRecording, stopRecordingIfActive,
} from '../recording/recorder';
import { DictationStatus, UseFormDictationOptions } from './types';
import { NOOP_LOGGER } from './logger';

// Constants
const BYTES_PER_MB = 1024 * 1024;

export const useFormDictation = ({
  jsonSchema,
  currentValues,
  onFilled,
  speechModel,
  languageModel,
  shouldTranslateToEnglish,
  logger = NOOP_LOGGER,
  getUsedMemory,
}: UseFormDictationOptions) => {
  // Component's State
  const [status, setStatus] = useState<DictationStatus>('idle');

  // References
  const recordingStartedAt = useRef(0);
  const currentValuesRef = useRef(currentValues);
  currentValuesRef.current = currentValues;
  // Read through a ref so an inline logger object doesn't re-run effects or re-create callbacks every render
  const loggerRef = useRef(logger);
  loggerRef.current = logger;

  const { fields, skipped } = useMemo<{ fields: DictationField[]; skipped: SkippedDictationField[] }>(
    () => getDictationFields(jsonSchema),
    [jsonSchema],
  );

  const updateStatus = useCallback((nextStatus: DictationStatus) => {
    loggerRef.current.info(`Dictation status: ${nextStatus}`);
    setStatus(nextStatus);
  }, []);

  useEffect(() => {
    const skippedSummary = skipped.map(({ key, reason }) => `${key} (${reason})`).join(', ');
    loggerRef.current.info(`${fields.length} fields can be dictated, ${skipped.length} skipped`
      + `${skippedSummary ? `: ${skippedSummary}` : ''}`);
  }, [fields, skipped]);

  useEffect(() => () => {
    stopRecordingIfActive();
  }, []);

  const startRecording = useCallback(async () => {
    if (!(await hasRecordingPermission())) {
      loggerRef.current.warn('Microphone permission was not granted');
      return;
    }

    const result = await startDictationRecording();
    if (result.status === 'error') {
      loggerRef.current.error(`Recording failed to start: ${result.message}`);
      return;
    }

    recordingStartedAt.current = Date.now();
    updateStatus('recording');

    preloadDictationModels(speechModel, languageModel).catch((error) => {
      loggerRef.current.warn(`Model preload failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }, [languageModel, speechModel, updateStatus]);

  const stopRecordingAndFill = useCallback(async () => {
    const recording = await stopDictationRecording();
    const recordingSeconds = (Date.now() - recordingStartedAt.current) / 1000;

    if (recording.status !== 'success') {
      loggerRef.current.error(`Recording failed to stop: ${recording.message}`);
      updateStatus('idle');
      return;
    }

    const [audioPath] = recording.paths;

    try {
      updateStatus('transcribing');
      const transcription = await transcribeAudio(speechModel, audioPath, shouldTranslateToEnglish);
      loggerRef.current.info(`Transcript (${transcription.language}): ${transcription.transcript}`);

      if (!transcription.transcript) {
        loggerRef.current.warn('No speech was recognised');
        return;
      }

      updateStatus('extracting');
      loggerRef.current.debug(`Fields: ${fields.map(({ key, kind }) => `${key} (${kind})`).join(', ')}`);
      const extraction = await extractFormValues(
        languageModel,
        fields,
        transcription.transcript,
        currentValuesRef.current,
      );
      loggerRef.current.debug(`Extraction output: ${extraction.rawOutput}`);

      loggerRef.current.info(`Filled fields: ${JSON.stringify(extraction.values)}`);
      if (extraction.rejected.length > 0) {
        loggerRef.current.warn(`Rejected values: ${JSON.stringify(extraction.rejected)}`);
      }
      const usedMemory = getUsedMemory ? await getUsedMemory() : undefined;
      loggerRef.current.info(`Dictation metrics ${JSON.stringify({
        speechModel: speechModel.id,
        languageModel: languageModel.id,
        fieldCount: fields.length,
        filledCount: Object.keys(extraction.values).length,
        rejectedCount: extraction.rejected.length,
        recordingSeconds,
        speechModelLoadMs: transcription.loadMs,
        transcribeMs: transcription.transcribeMs,
        languageModelLoadMs: extraction.loadMs,
        extractMs: extraction.extractMs,
        promptTokens: extraction.promptTokens,
        promptTokensPerSecond: extraction.promptTokensPerSecond,
        generatedTokens: extraction.generatedTokens,
        generatedTokensPerSecond: extraction.generatedTokensPerSecond,
        ...(usedMemory !== undefined ? { usedMemoryMB: Math.round(usedMemory / BYTES_PER_MB) } : {}),
      })}`);

      if (Object.keys(extraction.values).length > 0) {
        onFilled(mergeDictatedValues(fields, currentValuesRef.current, extraction.values));
      }
    } catch (error) {
      loggerRef.current.error('Dictation failed', error);
    } finally {
      RNFS.unlink(audioPath).catch(() => undefined);
      updateStatus('idle');
    }
  }, [
    fields, getUsedMemory, languageModel, onFilled, shouldTranslateToEnglish, speechModel, updateStatus,
  ]);

  const toggleRecording = useCallback(() => (
    status === 'recording' ? stopRecordingAndFill() : startRecording()
  ), [startRecording, status, stopRecordingAndFill]);

  return {
    status,
    fieldCount: fields.length,
    toggleRecording,
  };
};
