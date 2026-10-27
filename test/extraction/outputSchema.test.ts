import { buildExtractionSchema, getDictationFields } from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

describe('buildExtractionSchema', () => {
  it('constrains choice fields to option titles or null, multi-choice to add and remove lists, and forbids unknown keys', () => {
    const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);
    const schema = buildExtractionSchema(fields);

    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties).toMatchObject({
      species: { enum: ['Elephant', 'Rhino', null] },
      threats: {
        anyOf: [
          {
            type: 'object',
            properties: {
              add: { type: 'array', items: { type: 'string', enum: ['Snare', 'Gunshot', 'Fire'] } },
              remove: { type: 'array', items: { type: 'string', enum: ['Snare', 'Gunshot', 'Fire'] } },
            },
            additionalProperties: false,
          },
          { type: 'null' },
        ],
      },
      sightedOn: { type: 'string', format: 'date' },
      shots: { type: 'number' },
    });
  });
});
