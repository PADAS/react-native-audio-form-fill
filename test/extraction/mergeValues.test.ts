import { getDictationFields, mergeDictatedValues } from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

describe('mergeDictatedValues', () => {
  const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);

  it('adds dictated options to the current multi-choice selections without duplicates', () => {
    const merged = mergeDictatedValues(fields, { threats: ['snare', 'fire'] }, { threats: ['fire', 'poison'] });

    expect(merged).toEqual({ threats: ['snare', 'fire', 'poison'] });
  });

  it('uses the dictated options when nothing is selected yet', () => {
    const merged = mergeDictatedValues(fields, {}, { threats: ['snare'] });

    expect(merged).toEqual({ threats: ['snare'] });
  });

  it('replaces single-value fields', () => {
    const merged = mergeDictatedValues(
      fields,
      { species: 'lion_uuid', shots: 1 },
      { species: 'rhino_uuid', shots: 2 },
    );

    expect(merged).toEqual({ species: 'rhino_uuid', shots: 2 });
  });

  it('only returns dictated keys', () => {
    const merged = mergeDictatedValues(fields, { threats: ['snare'], shots: 1 }, { shots: 3 });

    expect(merged).toEqual({ shots: 3 });
  });
});
