/**
 * Speech to text with Whisper
 */

import { LocalModel } from '../models';
import { getSpeechContext } from './contexts';
import { TranscriptionResult } from './types';

export const transcribeAudio = async (
  model: LocalModel,
  audioPath: string,
  shouldTranslateToEnglish: boolean,
): Promise<TranscriptionResult> => {
  const { context, loadMs } = await getSpeechContext(model);

  const startedAt = Date.now();
  const { promise } = context.transcribe(audioPath, {
    language: 'auto',
    translate: shouldTranslateToEnglish,
  });
  const { result, language } = await promise;

  return {
    transcript: result.trim(),
    language,
    loadMs,
    transcribeMs: Date.now() - startedAt,
  };
};
