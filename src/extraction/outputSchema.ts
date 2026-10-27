import { DictationField } from './types';
import { SchemaNode } from './schemaNode';
import { getUniqueTitles } from './choiceOptions';

export const MAX_DICTATED_TEXT_LENGTH = 150;
const MAX_TRANSCRIPT_SHARE = 0.6;
const MIN_TEXT_LENGTH = 40;

const getTextLimit = (field: DictationField, transcript?: string): number => {
  const transcriptLimit = transcript === undefined
    ? MAX_DICTATED_TEXT_LENGTH
    : Math.max(MIN_TEXT_LENGTH, Math.floor(transcript.trim().length * MAX_TRANSCRIPT_SHARE));
  return Math.min(field.maxLength ?? MAX_DICTATED_TEXT_LENGTH, MAX_DICTATED_TEXT_LENGTH, transcriptLimit);
};

const buildValueSchema = (field: DictationField, transcript?: string): SchemaNode => {
  switch (field.kind) {
    case 'choice':
      return { enum: [...getUniqueTitles(field.options || []), null] };
    case 'multiChoice': {
      const titles = { type: 'array', items: { type: 'string', enum: getUniqueTitles(field.options || []) } };
      return {
        anyOf: [
          {
            type: 'object',
            properties: { add: titles, remove: titles },
            additionalProperties: false,
          },
          { type: 'null' },
        ],
      };
    }
    case 'date':
      return { type: 'string', format: field.dateFormat || 'date-time' };
    case 'number':
    case 'integer':
    case 'boolean':
      return { type: field.kind };
    default:
      return { type: 'string', maxLength: getTextLimit(field, transcript) };
  }
};

export const buildExtractionSchema = (fields: DictationField[], transcript?: string): SchemaNode => {
  const fill = fields.length > 0
    ? {
      anyOf: fields.map((field) => ({
        type: 'object',
        properties: { [field.key]: buildValueSchema(field, transcript) },
        required: [field.key],
        additionalProperties: false,
      })),
    }
    : {};

  return {
    type: 'object',
    properties: {
      fills: { type: 'array', items: fill, ...(fields.length > 0 ? {} : { maxItems: 0 }) },
    },
    required: ['fills'],
    additionalProperties: false,
  };
};
