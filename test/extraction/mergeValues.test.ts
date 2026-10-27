import { getDictationFields, mergeDictatedValues } from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

describe('mergeDictatedValues', () => {
  const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);

  it('adds dictated options to the current multi-choice selections without duplicates', () => {
    const merged = mergeDictatedValues(
      fields,
      { threats: ['snare', 'fire'] },
      { threats: { add: ['fire', 'gunshot'], remove: [] } },
    );

    expect(merged).toEqual({ threats: ['snare', 'fire', 'gunshot'] });
  });

  it('removes dictated options from the current multi-choice selections', () => {
    const merged = mergeDictatedValues(
      fields,
      { threats: ['snare', 'fire', 'gunshot'] },
      { threats: { add: [], remove: ['snare', 'fire'] } },
    );

    expect(merged).toEqual({ threats: ['gunshot'] });
  });

  it('clears a multi-choice field when every selection is removed', () => {
    const merged = mergeDictatedValues(fields, { threats: ['snare'] }, { threats: { add: [], remove: ['snare'] } });

    expect(merged).toEqual({ threats: undefined });
  });

  it('clears choice and multi-choice fields dictated as null', () => {
    const merged = mergeDictatedValues(
      fields,
      { threats: ['snare'], species: 'rhino_uuid' },
      { threats: null, species: null },
    );

    expect(merged).toEqual({ threats: undefined, species: undefined });
  });

  it('uses the dictated options when nothing is selected yet', () => {
    const merged = mergeDictatedValues(fields, {}, { threats: { add: ['snare'], remove: [] } });

    expect(merged).toEqual({ threats: ['snare'] });
  });

  it('replaces single-value fields and only returns dictated keys', () => {
    const merged = mergeDictatedValues(
      fields,
      { species: 'elephant_uuid', shots: 1, threats: ['snare'] },
      { species: 'rhino_uuid', shots: 2 },
    );

    expect(merged).toEqual({ species: 'rhino_uuid', shots: 2 });
  });
});
