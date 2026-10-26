import { DictationField } from './types';
import { SchemaNode } from './schemaNode';
import { getUniqueTitles } from './choiceOptions';

// JSON Schema handed to llama.cpp, which compiles it to a grammar so the model can only emit known keys and
// listed choice titles. Choice fields use titles rather than stored values because values may be opaque ids.
export const buildExtractionSchema = (fields: DictationField[]): SchemaNode => {
  const properties: Record<string, SchemaNode> = {};

  fields.forEach((field) => {
    switch (field.kind) {
      case 'choice':
        properties[field.key] = { type: 'string', enum: getUniqueTitles(field.options || []) };
        break;
      case 'multiChoice':
        properties[field.key] = {
          type: 'array',
          items: { type: 'string', enum: getUniqueTitles(field.options || []) },
        };
        break;
      case 'date':
        properties[field.key] = { type: 'string', format: field.dateFormat || 'date-time' };
        break;
      case 'number':
      case 'integer':
      case 'boolean':
        properties[field.key] = { type: field.kind };
        break;
      default:
        properties[field.key] = { type: 'string' };
    }
  });

  return {
    type: 'object',
    properties,
    additionalProperties: false,
  };
};
