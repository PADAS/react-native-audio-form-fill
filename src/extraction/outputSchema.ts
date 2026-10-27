import { DictationField } from './types';
import { SchemaNode } from './schemaNode';
import { getUniqueTitles } from './choiceOptions';

// JSON Schema handed to llama.cpp, which compiles it to a grammar so the model can only emit known keys and
// listed choice titles. Choice fields use titles rather than stored values because values may be opaque ids.
// Choice fields also accept null, which clears them; multi-choice fields name the options to add and remove.
export const buildExtractionSchema = (fields: DictationField[]): SchemaNode => {
  const properties: Record<string, SchemaNode> = {};

  fields.forEach((field) => {
    switch (field.kind) {
      case 'choice':
        properties[field.key] = { enum: [...getUniqueTitles(field.options || []), null] };
        break;
      case 'multiChoice': {
        const titles = { type: 'array', items: { type: 'string', enum: getUniqueTitles(field.options || []) } };
        properties[field.key] = {
          anyOf: [
            {
              type: 'object',
              properties: { add: titles, remove: titles },
              additionalProperties: false,
            },
            { type: 'null' },
          ],
        };
        break;
      }
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
