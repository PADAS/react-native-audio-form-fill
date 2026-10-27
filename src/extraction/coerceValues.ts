/**
 * Maps the model's output back to form values, enforcing each field's constraints
 */

import {
  CoercedDictationValues, DictationField, MultiChoiceChange, RejectedDictationValue,
} from './types';
import { isSchemaNode } from './schemaNode';
import { findOptionValue } from './choiceOptions';
import { coerceDate } from './dates';

const CLEARABLE_KINDS = ['choice', 'multiChoice'];

const isEmptyList = (value: unknown): boolean => value === undefined || (Array.isArray(value) && value.length === 0);

const toOptionValues = (field: DictationField, titles: unknown): string[] => {
  if (!Array.isArray(titles)) return [];
  const optionValues = titles
    .map((title) => findOptionValue(field.options || [], title))
    .filter((optionValue): optionValue is string => optionValue !== undefined);
  return Array.from(new Set(optionValues));
};

const coerceFieldValue = (field: DictationField, value: unknown): { value?: unknown; reason?: string } => {
  switch (field.kind) {
    case 'text': {
      if (typeof value !== 'string' || value.trim() === '') return { reason: 'empty' };
      const text = value.trim();
      if (field.maxLength !== undefined && text.length > field.maxLength) return { reason: 'tooLong' };
      if (field.pattern && !new RegExp(field.pattern).test(text)) return { reason: 'patternMismatch' };
      return { value: text };
    }
    case 'number':
    case 'integer': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return { reason: 'notANumber' };
      const number = field.kind === 'integer' ? Math.round(value) : value;
      if (field.minimum !== undefined && number < field.minimum) return { reason: 'belowMinimum' };
      if (field.maximum !== undefined && number > field.maximum) return { reason: 'aboveMaximum' };
      return { value: number };
    }
    case 'boolean':
      return typeof value === 'boolean' ? { value } : { reason: 'notABoolean' };
    case 'date': {
      const date = coerceDate(value, field.dateFormat);
      return date ? { value: date } : { reason: 'invalidDate' };
    }
    case 'choice': {
      const optionValue = findOptionValue(field.options || [], value);
      return optionValue ? { value: optionValue } : { reason: 'unknownOption' };
    }
    case 'multiChoice': {
      if (!isSchemaNode(value)) return { reason: 'notAChange' };
      const add = toOptionValues(field, value.add);
      const remove = toOptionValues(field, value.remove);
      if (add.length > 0 || remove.length > 0) {
        const change: MultiChoiceChange = { add, remove };
        return { value: change };
      }
      const isEmptyChange = isEmptyList(value.add) && isEmptyList(value.remove);
      return { reason: isEmptyChange ? 'empty' : 'unknownOption' };
    }
    default:
      return { reason: 'unsupportedType' };
  }
};

export const coerceExtractedValues = (fields: DictationField[], extracted: unknown): CoercedDictationValues => {
  const values: Record<string, unknown> = {};
  const rejected: RejectedDictationValue[] = [];

  if (!isSchemaNode(extracted)) {
    return { values, rejected };
  }

  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

  Object.entries(extracted).forEach(([key, rawValue]) => {
    const field = fieldsByKey.get(key);
    if (!field) {
      rejected.push({ key, value: rawValue, reason: 'unknownField' });
      return;
    }
    if (rawValue === null && CLEARABLE_KINDS.includes(field.kind)) {
      values[key] = null;
      return;
    }
    if (rawValue === null || rawValue === undefined) {
      return;
    }

    const { value, reason } = coerceFieldValue(field, rawValue);
    if (value !== undefined) {
      values[key] = value;
    } else if (reason !== 'empty') {
      rejected.push({ key, value: rawValue, reason: reason || 'invalid' });
    }
  });

  return { values, rejected };
};
