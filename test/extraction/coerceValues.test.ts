import { coerceExtractedValues, getDictationFields } from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

describe('coerceExtractedValues', () => {
  const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);

  it('maps choice titles back to stored values', () => {
    const { values, rejected } = coerceExtractedValues(fields, {
      species: 'rhino',
      threats: { add: ['Snare', 'Fire', 'Snare'], remove: ['Gunshot'] },
    });

    expect(values).toEqual({ species: 'rhino_uuid', threats: { add: ['snare', 'fire'], remove: ['gunshot'] } });
    expect(rejected).toEqual([]);
  });

  it('rejects values outside the field constraints', () => {
    const { values, rejected } = coerceExtractedValues(fields, {
      shots: 80,
      code: 'not valid!',
      species: 'Lion',
      unknownField: 'x',
    });

    expect(values).toEqual({});
    expect(rejected.map(({ key, reason }) => [key, reason])).toEqual([
      ['shots', 'aboveMaximum'],
      ['code', 'patternMismatch'],
      ['species', 'unknownOption'],
      ['unknownField', 'unknownField'],
    ]);
  });

  it('normalises dates and drops empty values without rejecting them', () => {
    const { values, rejected } = coerceExtractedValues(fields, {
      sightedAt: '2026-10-23T06:30:00Z',
      sightedOn: '2026-10-23T12:00:00',
      observations: '  ',
      requiresMedicine: true,
    });

    expect(values).toEqual({
      sightedAt: '2026-10-23T06:30:00.000Z',
      sightedOn: '2026-10-23',
      requiresMedicine: true,
    });
    expect(rejected).toEqual([]);
  });

  it('keeps null for choice fields so they can be cleared, and ignores it for other fields', () => {
    const { values, rejected } = coerceExtractedValues(fields, {
      species: null,
      threats: null,
      shots: null,
    });

    expect(values).toEqual({ species: null, threats: null });
    expect(rejected).toEqual([]);
  });

  it('fills in a missing add or remove list and rejects changes with no known options', () => {
    const { values, rejected } = coerceExtractedValues(fields, { threats: { remove: ['Fire'] } });
    const unknown = coerceExtractedValues(fields, { threats: { add: ['Lion'] } });
    const notAChange = coerceExtractedValues(fields, { threats: ['Fire'] });
    const empty = coerceExtractedValues(fields, { threats: { add: [], remove: [] } });

    expect(values).toEqual({ threats: { add: [], remove: ['fire'] } });
    expect(rejected).toEqual([]);
    expect(unknown.rejected.map(({ reason }) => reason)).toEqual(['unknownOption']);
    expect(notAChange.rejected.map(({ reason }) => reason)).toEqual(['notAChange']);
    expect(empty).toEqual({ values: {}, rejected: [] });
  });
});
