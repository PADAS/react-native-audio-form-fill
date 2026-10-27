import { getDictationFields, MAX_DICTATION_CHOICE_OPTIONS } from '../../src';
import {
  buildLargeChoiceSchemaMock,
  DICTATION_V1_SCHEMA_MOCK,
  DICTATION_V2_SCHEMA_MOCK,
} from '../fixtures/schemas';

describe('getDictationFields', () => {
  it('keeps fillable v2 fields and skips locations, attachments, deprecated and empty choice fields', () => {
    const { fields, skipped } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);

    expect(fields.map(({ key, kind }) => [key, kind])).toEqual([
      ['observations', 'text'],
      ['shots', 'number'],
      ['requiresMedicine', 'boolean'],
      ['sightedAt', 'date'],
      ['sightedOn', 'date'],
      ['species', 'choice'],
      ['threats', 'multiChoice'],
      ['code', 'text'],
    ]);
    expect(skipped).toEqual([
      { key: 'weaponLocation', reason: 'unsupportedType' },
      { key: 'photos', reason: 'unsupportedType' },
      { key: 'emptyChoice', reason: 'noOptions' },
    ]);
  });

  it('reads v1 enum titles from both array and index-keyed enumNames', () => {
    const { fields } = getDictationFields(DICTATION_V1_SCHEMA_MOCK);

    expect(fields[0].options).toEqual([{ value: 'fresh', title: 'Fresh' }, { value: 'old', title: 'Old' }]);
    expect(fields[1].options).toEqual([{ value: 'm', title: 'Male' }, { value: 'f', title: 'Female' }]);
  });

  it('skips choice lists that are too large for an on-device prompt', () => {
    const { fields, skipped } = getDictationFields(buildLargeChoiceSchemaMock(MAX_DICTATION_CHOICE_OPTIONS + 1));

    expect(fields).toEqual([]);
    expect(skipped).toEqual([{ key: 'subject', reason: 'tooManyOptions' }]);
  });

  it('returns nothing for a schema without properties', () => {
    expect(getDictationFields(undefined)).toEqual({ fields: [], skipped: [] });
  });

  it('reads v2 option display names from x-enumExtra', () => {
    const { fields } = getDictationFields({
      properties: {
        whatDetected: {
          type: 'string',
          title: 'What was detected',
          anyOf: [{
            type: 'string',
            enum: ['campfire', 'torch', 'other'],
            'x-enumExtra': {
              campfire: { display: 'Camp Fire', description: 'whatDetected' },
              torch: { display: 'Torch/Light', description: 'whatDetected' },
            },
          }],
        },
      },
    });

    expect(fields[0].options).toEqual([
      { value: 'campfire', title: 'Camp Fire' },
      { value: 'torch', title: 'Torch/Light' },
      { value: 'other', title: 'other' },
    ]);
  });
});
