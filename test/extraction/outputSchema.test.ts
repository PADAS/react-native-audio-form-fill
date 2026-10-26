import { buildExtractionSchema, getDictationFields } from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

describe('buildExtractionSchema', () => {
  it('constrains choice fields to option titles and forbids unknown keys', () => {
    const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);
    const schema = buildExtractionSchema(fields);

    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties).toMatchObject({
      species: { type: 'string', enum: ['Elephant', 'Rhino'] },
      threats: { type: 'array', items: { type: 'string', enum: ['Snare', 'Gunshot', 'Fire'] } },
      sightedOn: { type: 'string', format: 'date' },
      shots: { type: 'number' },
    });
  });
});
