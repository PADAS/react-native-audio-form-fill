import { confirmClearedValues, getDictationFields } from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

describe('confirmClearedValues', () => {
  const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);
  const confirm = (values: Record<string, unknown>, transcript: string, currentValues = {}) => (
    confirmClearedValues(fields, { values, rejected: [] }, transcript, currentValues)
  );

  it('keeps a clear when the ranger used a clearing word', () => {
    const result = confirm({ threats: null, species: null }, 'Clear the threats and species.');

    expect(result).toEqual({ values: { threats: null, species: null }, rejected: [] });
  });

  it('removes only the named options when a multi-choice clear was not asked for', () => {
    const result = confirm({ threats: null }, 'Move snare and fire from threats.', { threats: ['snare', 'fire', 'gunshot'] });

    expect(result).toEqual({ values: { threats: { add: [], remove: ['snare', 'fire'] } }, rejected: [] });
  });

  it('rejects a multi-choice clear that names no option', () => {
    const result = confirm({ threats: null, shots: 2 }, 'Two shots heard.', { threats: ['snare'] });

    expect(result).toEqual({
      values: { shots: 2 },
      rejected: [{ key: 'threats', value: null, reason: 'unconfirmedClear' }],
    });
  });

  it('clears a choice field when its current option was named', () => {
    const result = confirm({ species: null }, 'Take off rhino.', { species: 'rhino_uuid' });

    expect(result).toEqual({ values: { species: null }, rejected: [] });
  });

  it('rejects a choice clear when the current option was not named', () => {
    const result = confirm({ species: null }, 'Take off elephant.', { species: 'rhino_uuid' });

    expect(result).toEqual({
      values: {},
      rejected: [{ key: 'species', value: null, reason: 'unconfirmedClear' }],
    });
  });

  it('matches whole words only', () => {
    const result = confirm({ threats: null }, 'Ensnared animal, firefighters on scene.', { threats: ['snare', 'fire'] });

    expect(result.rejected.map(({ reason }) => reason)).toEqual(['unconfirmedClear']);
  });

  it('leaves other values and earlier rejections untouched', () => {
    const result = confirmClearedValues(
      fields,
      { values: { shots: 3 }, rejected: [{ key: 'code', value: 'x', reason: 'patternMismatch' }] },
      'Three shots.',
      {},
    );

    expect(result).toEqual({ values: { shots: 3 }, rejected: [{ key: 'code', value: 'x', reason: 'patternMismatch' }] });
  });
});
