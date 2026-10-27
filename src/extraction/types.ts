export type DictationFieldKind = 'text' | 'number' | 'integer' | 'boolean' | 'date' | 'choice' | 'multiChoice';

export type DateFormat = 'date' | 'time' | 'date-time';

export interface DictationChoiceOption {
  value: string;
  title: string;
}

export interface DictationField {
  key: string;
  title: string;
  kind: DictationFieldKind;
  description?: string;
  options?: DictationChoiceOption[];
  dateFormat?: DateFormat;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  pattern?: string;
}

export interface SkippedDictationField {
  key: string;
  reason: 'unsupportedType' | 'tooManyOptions' | 'noOptions';
}

export interface DictationFieldsResult {
  fields: DictationField[];
  skipped: SkippedDictationField[];
}

export interface RejectedDictationValue {
  key: string;
  value: unknown;
  reason: string;
}

// Stored option values to select and unselect in a multi-choice field
export interface MultiChoiceChange {
  add: string[];
  remove: string[];
}

// Choice and multi-choice fields are null when the ranger asked to clear them
export interface CoercedDictationValues {
  values: Record<string, unknown>;
  rejected: RejectedDictationValue[];
}

export interface ExtractionMessage {
  role: 'system' | 'user';
  content: string;
}
