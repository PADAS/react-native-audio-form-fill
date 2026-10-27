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

// The model answers choice fields with titles, so it is shown the current selections as titles too
const toPromptValue = (field: DictationField, value: unknown): unknown => {
  const getTitle = (item: unknown) => field.options?.find((option) => option.value === item)?.title ?? item;

  if (field.kind === 'choice') return getTitle(value);
  if (field.kind === 'multiChoice' && Array.isArray(value)) return value.map(getTitle);
  return value;
};

const hasValue = (value: unknown): boolean => (
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
);

export const buildExtractionMessages = (
  fields: DictationField[],
  transcript: string,
  currentValues: Record<string, unknown>,
  now: Date,
): ExtractionMessage[] => {
  const currentFieldValues = Object.fromEntries(
    fields
      .filter((field) => hasValue(currentValues[field.key]))
      .map((field) => [field.key, toPromptValue(field, currentValues[field.key])]),
  );

  return [
    {
      role: 'system',
      content: [
        'You fill in a wildlife ranger\'s field report form from what the ranger said out loud.',
        'Reply with a single JSON object whose keys are field keys from the list.',
        'Only include fields the ranger clearly mentioned. Leave every other field out. Never guess.',
        'For fields with options, use one of the listed options exactly.',
        'For multiChoice fields, reply {"add": [...], "remove": [...]}: "add" lists options the ranger wants selected,'
          + ' "remove" lists options they want unselected.',
        'Example: "remove snare from threats" -> {"threats": {"remove": ["Snare"]}}',
        'Reply null for a choice or multiChoice field only when the ranger asks to clear the whole field.',
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
