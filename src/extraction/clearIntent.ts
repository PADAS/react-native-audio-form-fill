/**
 * Guards against the language model clearing a choice field the ranger never asked to clear
 */

import { CoercedDictationValues, DictationField, MultiChoiceChange } from './types';

// Transcripts are English when translation is on, which is the default
const CLEAR_WORDS = ['clear', 'all', 'everything', 'none', 'nothing', 'reset', 'empty'];

export const normalize = (text: string): string => ` ${text.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ' ').trim()} `;

const mentions = (transcript: string, title: string): boolean => transcript.includes(normalize(title));

// A null from the model only clears a field when the ranger used a clearing word. Otherwise a multi-choice field
// loses just the options named in the transcript, and a choice field is cleared only if its current option was named.
export const confirmClearedValues = (
  fields: DictationField[],
  coerced: CoercedDictationValues,
  transcript: string,
  currentValues: Record<string, unknown>,
): CoercedDictationValues => {
  const normalizedTranscript = normalize(transcript);
  if (CLEAR_WORDS.some((word) => normalizedTranscript.includes(` ${word} `))) {
    return coerced;
  }

  const values = { ...coerced.values };
  const rejected = [...coerced.rejected];

  fields.forEach((field) => {
    if (values[field.key] !== null) {
      return;
    }

    const options = field.options || [];
    if (field.kind === 'multiChoice') {
      const remove = Array.from(new Set(options
        .filter((option) => mentions(normalizedTranscript, option.title))
        .map((option) => option.value)));
      if (remove.length > 0) {
        const change: MultiChoiceChange = { add: [], remove };
        values[field.key] = change;
        return;
      }
    } else {
      const currentOption = options.find((option) => option.value === currentValues[field.key]);
      if (currentOption && mentions(normalizedTranscript, currentOption.title)) {
        return;
      }
    }

    delete values[field.key];
    rejected.push({ key: field.key, value: null, reason: 'unconfirmedClear' });
  });

  return { values, rejected };
};
