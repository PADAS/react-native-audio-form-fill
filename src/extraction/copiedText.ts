/**
 * Guards against the language model pasting the start of the transcript into a text field
 */

import { CoercedDictationValues, DictationField } from './types';
import { normalize } from './clearIntent';

const MIN_COPIED_LENGTH = 30;
const MIN_COPIED_SHARE = 0.4;

export const rejectCopiedTranscript = (
  fields: DictationField[],
  coerced: CoercedDictationValues,
  transcript: string,
): CoercedDictationValues => {
  const spoken = normalize(transcript).trim();
  const values = { ...coerced.values };
  const rejected = [...coerced.rejected];

  fields.filter(({ kind }) => kind === 'text').forEach(({ key }) => {
    const value = values[key];
    if (typeof value !== 'string') {
      return;
    }

    const answer = normalize(value).trim();
    const isCopy = answer.length >= MIN_COPIED_LENGTH
      && answer.length >= spoken.length * MIN_COPIED_SHARE
      && spoken.startsWith(answer);
    if (isCopy) {
      delete values[key];
      rejected.push({ key, value, reason: 'copiedTranscript' });
    }
  });

  return { values, rejected };
};
