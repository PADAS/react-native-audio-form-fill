/**
 * Reading choice options out of a schema, and matching the model's choice back to a stored value
 */

import { DictationChoiceOption } from './types';
import {
  getSchemaNodes, getString, isSchemaNode, SchemaNode,
} from './schemaNode';

// Constants
const NO_OPTION_VALUE = 'no_option';

// v1 `enumNames` is either an array parallel to `enum`, or an index-keyed object
const getEnumTitle = (enumNames: unknown, index: number, fallback: string): string => {
  if (Array.isArray(enumNames) && typeof enumNames[index] === 'string') {
    return enumNames[index];
  }
  if (isSchemaNode(enumNames) && typeof enumNames[String(index)] === 'string') {
    return enumNames[String(index)] as string;
  }
  return fallback;
};

export const getOptionsFromNode = (node: SchemaNode): DictationChoiceOption[] => {
  const options: DictationChoiceOption[] = [];

  const enumValues = node.enum;
  if (Array.isArray(enumValues)) {
    enumValues.forEach((value, index) => {
      if (typeof value === 'string') {
        options.push({ value, title: getEnumTitle(node.enumNames, index, value) });
      }
    });
  }

  getSchemaNodes(node, 'oneOf').forEach((option) => {
    const value = option.const;
    if (typeof value === 'string') {
      options.push({ value, title: getString(option, 'title') || value });
    }
  });

  // v2 choice lists arrive as `anyOf: [{ oneOf: [...] }]` once their $ref is resolved
  getSchemaNodes(node, 'anyOf').forEach((entry) => {
    options.push(...getOptionsFromNode(entry));
  });

  return options.filter((option) => option.value !== NO_OPTION_VALUE);
};

export const hasChoices = (node: SchemaNode): boolean => (
  Array.isArray(node.enum) || Array.isArray(node.oneOf) || Array.isArray(node.anyOf)
);

export const getUniqueTitles = (options: DictationChoiceOption[]): string[] => (
  Array.from(new Set(options.map((option) => option.title)))
);

export const findOptionValue = (options: DictationChoiceOption[], spoken: unknown): string | undefined => {
  if (typeof spoken !== 'string') return undefined;
  const normalized = spoken.trim().toLowerCase();
  const match = options.find((option) => option.title.toLowerCase() === normalized)
    || options.find((option) => option.value.toLowerCase() === normalized);
  return match?.value;
};
