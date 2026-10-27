/**
 * Transcript to form values with a llama.cpp language model, constrained to the form's fields
 */

import {
  buildExtractionMessages,
  buildExtractionSchema,
  coerceExtractedValues,
  confirmClearedValues,
  DictationField,
  parseExtractionOutput,
} from '../extraction';
import { LocalModel } from '../models';
import { getLanguageContext } from './contexts';
import { ExtractionResult } from './types';

// Constants
const MAX_GENERATED_TOKENS = 512;

export const extractFormValues = async (
  model: LocalModel,
  fields: DictationField[],
  transcript: string,
  currentValues: Record<string, unknown>,
): Promise<ExtractionResult> => {
  const { context, loadMs } = await getLanguageContext(model);

  const startedAt = Date.now();
  const result = await context.completion({
    messages: buildExtractionMessages(fields, transcript, currentValues, new Date()),
    response_format: {
      type: 'json_schema',
      json_schema: { strict: true, schema: buildExtractionSchema(fields) },
    },
    jinja: true,
    enable_thinking: false,
    add_generation_prompt: true,
    temperature: 0,
    n_predict: MAX_GENERATED_TOKENS,
  });
  const extractMs = Date.now() - startedAt;

  const rawOutput = result.content || result.text;
  const coerced = confirmClearedValues(
    fields,
    coerceExtractedValues(fields, parseExtractionOutput(rawOutput)),
    transcript,
    currentValues,
  );
  const { timings } = result;

  return {
    ...coerced,
    rawOutput,
    loadMs,
    extractMs,
    promptTokens: timings.prompt_n,
    promptTokensPerSecond: timings.prompt_per_second,
    generatedTokens: timings.predicted_n,
    generatedTokensPerSecond: timings.predicted_per_second,
  };
};
