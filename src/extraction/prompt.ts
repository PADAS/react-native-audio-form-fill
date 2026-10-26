import { DictationField, ExtractionMessage } from './types';
import { getUniqueTitles } from './choiceOptions';

const describeField = (field: DictationField): string => {
  const parts = [`- ${field.key}: "${field.title}" (${field.kind})`];

  if (field.description) {
    parts.push(` ${field.description}`);
  }
  if (field.options) {
    parts.push(` Options: ${getUniqueTitles(field.options).join(' | ')}`);
  }
  if (field.minimum !== undefined || field.maximum !== undefined) {
    parts.push(` Range: ${field.minimum ?? '-inf'} to ${field.maximum ?? 'inf'}`);
  }
  if (field.kind === 'date') {
    parts.push(` Format: ISO 8601 ${field.dateFormat || 'date-time'}`);
  }

  return parts.join('');
};

export const buildExtractionMessages = (
  fields: DictationField[],
  transcript: string,
  currentValues: Record<string, unknown>,
  now: Date,
): ExtractionMessage[] => {
  const currentFieldValues = Object.fromEntries(
    fields
      .filter((field) => currentValues[field.key] !== undefined && currentValues[field.key] !== '')
      .map((field) => [field.key, currentValues[field.key]]),
  );

  return [
    {
      role: 'system',
      content: [
        'You fill in a wildlife ranger\'s field report form from what the ranger said out loud.',
        'Reply with a single JSON object whose keys are field keys from the list.',
        'Only include fields the ranger clearly mentioned. Leave every other field out. Never guess.',
        'For fields with options, use one of the listed options exactly.',
        `The current local time is ${now.toISOString()}. Resolve relative times like "this morning" against it.`,
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        'Form fields:',
        ...fields.map(describeField),
        '',
        `Current values: ${JSON.stringify(currentFieldValues)}`,
        '',
        `What the ranger said: "${transcript.trim()}"`,
      ].join('\n'),
    },
  ];
};
