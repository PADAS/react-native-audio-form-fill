/**
 * Public API of the extraction layer; helpers in schemaNode, choiceOptions and dates stay internal
 */

export type {
  CoercedDictationValues,
  DateFormat,
  DictationChoiceOption,
  DictationField,
  DictationFieldKind,
  DictationFieldsResult,
  ExtractionMessage,
  RejectedDictationValue,
  SkippedDictationField,
} from './types';
export { getDictationFields, MAX_DICTATION_CHOICE_OPTIONS } from './schemaFields';
export { buildExtractionSchema } from './outputSchema';
export { buildExtractionMessages } from './prompt';
export { parseExtractionOutput } from './parseOutput';
export { coerceExtractedValues } from './coerceValues';
