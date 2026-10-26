/**
 * Turns a JSON Schema for a form (e.g. a JSONForms schema after @earthranger/react-native-jsonforms-formatter)
 * into the fields a language model can fill from a dictated transcript
 */

import {
  DictationField, DictationFieldKind, DictationFieldsResult, SkippedDictationField,
} from './types';
import {
  getNumber, getString, isSchemaNode, SchemaNode,
} from './schemaNode';
import { getOptionsFromNode, hasChoices } from './choiceOptions';
import { toDateFormat } from './dates';

// Choice lists bigger than this (e.g. every subject on a site) blow up the prompt and grammar on-device
export const MAX_DICTATION_CHOICE_OPTIONS = 150;

const getFieldKind = (property: SchemaNode): DictationFieldKind | undefined => {
  const type = getString(property, 'type');

  if (type === 'array') {
    const { items } = property;
    return isSchemaNode(items) && hasChoices(items) ? 'multiChoice' : undefined;
  }
  if (type === 'string' || (type === undefined && hasChoices(property))) {
    if (hasChoices(property)) return 'choice';
    if (toDateFormat(getString(property, 'format'))) return 'date';
    return 'text';
  }
  if (type === 'number') return 'number';
  if (type === 'integer') return 'integer';
  if (type === 'boolean') return 'boolean';

  // Locations, collections and attachments are objects or arrays of objects; GPS and pickers fill those
  return undefined;
};

const isFieldHidden = (property: SchemaNode): boolean => (
  property.deprecated === true || property.readOnly === true || property.isHidden === true
);

export const getDictationFields = (jsonSchema: unknown): DictationFieldsResult => {
  const fields: DictationField[] = [];
  const skipped: SkippedDictationField[] = [];

  if (!isSchemaNode(jsonSchema) || !isSchemaNode(jsonSchema.properties)) {
    return { fields, skipped };
  }

  Object.entries(jsonSchema.properties).forEach(([key, property]) => {
    if (!isSchemaNode(property) || isFieldHidden(property)) {
      return;
    }

    const kind = getFieldKind(property);
    if (!kind) {
      skipped.push({ key, reason: 'unsupportedType' });
      return;
    }

    const field: DictationField = {
      key,
      kind,
      title: getString(property, 'title') || key,
      description: getString(property, 'description'),
    };

    if (kind === 'choice' || kind === 'multiChoice') {
      const optionsNode = kind === 'multiChoice' && isSchemaNode(property.items) ? property.items : property;
      const options = getOptionsFromNode(optionsNode);
      if (options.length === 0) {
        skipped.push({ key, reason: 'noOptions' });
        return;
      }
      if (options.length > MAX_DICTATION_CHOICE_OPTIONS) {
        skipped.push({ key, reason: 'tooManyOptions' });
        return;
      }
      field.options = options;
    }

    if (kind === 'date') {
      field.dateFormat = toDateFormat(getString(property, 'format'));
    }

    if (kind === 'number' || kind === 'integer') {
      field.minimum = getNumber(property, 'minimum');
      field.maximum = getNumber(property, 'maximum');
    }

    if (kind === 'text') {
      field.maxLength = getNumber(property, 'maxLength');
      field.pattern = getString(property, 'pattern');
    }

    fields.push(field);
  });

  return { fields, skipped };
};
