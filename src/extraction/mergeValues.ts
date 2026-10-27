/**
 * Combines dictated values with the form's current values
 */

import { DictationField } from './types';

// Multi-choice selections are added to, not replaced, so dictating one more option keeps the earlier ones
export const mergeDictatedValues = (
  fields: DictationField[],
  currentValues: Record<string, unknown>,
  values: Record<string, unknown>,
): Record<string, unknown> => {
  const multiChoiceKeys = new Set(fields.filter(({ kind }) => kind === 'multiChoice').map(({ key }) => key));

  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    const currentValue = currentValues[key];
    if (!multiChoiceKeys.has(key) || !Array.isArray(currentValue) || !Array.isArray(value)) {
      return [key, value];
    }
    return [key, Array.from(new Set([...currentValue, ...value]))];
  }));
};
