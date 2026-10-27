/**
 * Turns dictated changes into form values, applied on top of the form's current values
 */

import { DictationField, MultiChoiceChange } from './types';
import { isSchemaNode } from './schemaNode';

const isMultiChoiceChange = (value: unknown): value is MultiChoiceChange => (
  isSchemaNode(value) && Array.isArray(value.add) && Array.isArray(value.remove)
);

// Cleared fields come back as undefined; multi-choice changes add to and remove from the current selections
export const mergeDictatedValues = (
  fields: DictationField[],
  currentValues: Record<string, unknown>,
  values: Record<string, unknown>,
): Record<string, unknown> => {
  const multiChoiceKeys = new Set(fields.filter(({ kind }) => kind === 'multiChoice').map(({ key }) => key));

  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (value === null) {
      return [key, undefined];
    }
    if (!multiChoiceKeys.has(key) || !isMultiChoiceChange(value)) {
      return [key, value];
    }

    const currentValue = currentValues[key];
    const removed = new Set(value.remove);
    const selected = Array.from(new Set([...(Array.isArray(currentValue) ? currentValue : []), ...value.add]))
      .filter((option) => !removed.has(option));
    return [key, selected.length > 0 ? selected : undefined];
  }));
};
