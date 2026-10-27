import {
  buildExtractionSchema, DictationField, getDictationFields, MAX_DICTATED_TEXT_LENGTH,
} from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

interface FillEntry {
  properties: Record<string, unknown>;
  required: string[];
}

const THREAT_TITLES = { type: 'array', items: { type: 'string', enum: ['Snare', 'Gunshot', 'Fire'] } };

describe('buildExtractionSchema', () => {
  const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);
  const schema = buildExtractionSchema(fields);
  const { fills } = schema.properties as { fills: { items: { anyOf: FillEntry[] } } };
  const entries = fills.items.anyOf;
  const entryFor = (key: string) => entries.find((entry) => entry.required[0] === key) as FillEntry;

  it('asks for a list of one-field entries so fields can be filled in any order', () => {
    expect(schema).toMatchObject({ type: 'object', required: ['fills'], additionalProperties: false });
    expect(entries.map((entry) => entry.required[0])).toEqual(fields.map(({ key }) => key));
    expect(entryFor('shots')).toEqual({
      type: 'object',
      properties: { shots: { type: 'number' } },
      required: ['shots'],
      additionalProperties: false,
    });
  });

  it('constrains choice fields to option titles or null and multi-choice to add and remove lists', () => {
    expect(entryFor('species').properties.species).toEqual({ enum: ['Elephant', 'Rhino', null] });
    expect(entryFor('threats').properties.threats).toEqual({
      anyOf: [
        {
          type: 'object',
          properties: { add: THREAT_TITLES, remove: THREAT_TITLES },
          additionalProperties: false,
        },
        { type: 'null' },
      ],
    });
    expect(entryFor('sightedOn').properties.sightedOn).toEqual({ type: 'string', format: 'date' });
  });

  it('caps text answers, using a shorter field limit when the form sets one', () => {
    const textField = (maxLength?: number): DictationField => ({
      key: 'notes', title: 'Notes', kind: 'text', maxLength,
    });
    const valueFor = (field: DictationField) => {
      const { fills: built } = buildExtractionSchema([field]).properties as { fills: { items: { anyOf: FillEntry[] } } };
      return built.items.anyOf[0].properties.notes;
    };

    expect(valueFor(textField())).toEqual({ type: 'string', maxLength: MAX_DICTATED_TEXT_LENGTH });
    expect(valueFor(textField(40))).toEqual({ type: 'string', maxLength: 40 });
    expect(valueFor(textField(500))).toEqual({ type: 'string', maxLength: MAX_DICTATED_TEXT_LENGTH });
  });

  it('keeps text answers well under the transcript length so the whole transcript cannot be copied', () => {
    const textField: DictationField = { key: 'notes', title: 'Notes', kind: 'text' };
    const limitFor = (transcript: string) => {
      const { fills: built } = buildExtractionSchema([textField], transcript).properties as {
        fills: { items: { anyOf: FillEntry[] } }
      };
      return (built.items.anyOf[0].properties.notes as { maxLength: number }).maxLength;
    };

    expect(limitFor('x'.repeat(148))).toBe(88);
    expect(limitFor('Two shots heard')).toBe(40);
    expect(limitFor('x'.repeat(400))).toBe(MAX_DICTATED_TEXT_LENGTH);
  });

  it('allows no entries when no field can be dictated', () => {
    expect(buildExtractionSchema([]).properties).toEqual({ fills: { type: 'array', items: {}, maxItems: 0 } });
  });
});
