/**
 * Form JSON schemas in the shape a JSONForms renderer receives (v1 enum/enumNames and v2 anyOf/oneOf choices)
 */

export const DICTATION_V2_SCHEMA_MOCK = {
  type: 'object',
  properties: {
    observations: { type: 'string', title: 'Observations', description: 'Further details about the carcass.' },
    shots: {
      type: 'number', title: 'Number of shots', minimum: 1, maximum: 50,
    },
    requiresMedicine: { type: 'boolean', title: 'Animal Requires Medicine' },
    sightedAt: { type: 'string', title: 'Sighted at', format: 'date-time' },
    sightedOn: { type: 'string', title: 'Sighted on', format: 'date' },
    species: {
      type: 'string',
      title: 'Species',
      anyOf: [{
        oneOf: [
          { const: 'elephant_uuid', title: 'Elephant' },
          { const: 'rhino_uuid', title: 'Rhino' },
        ],
      }],
    },
    threats: {
      type: 'array',
      title: 'Threats',
      uniqueItems: true,
      items: {
        type: 'string',
        anyOf: [{
          oneOf: [
            { const: 'snare', title: 'Snare' },
            { const: 'gunshot', title: 'Gunshot' },
            { const: 'fire', title: 'Fire' },
          ],
        }],
      },
    },
    code: { type: 'string', title: 'Code', pattern: '^[a-zA-Z0-9]+$' },
    weaponLocation: {
      type: 'object',
      title: 'Weapon location',
      properties: { latitude: { type: 'number' }, longitude: { type: 'number' } },
    },
    photos: { type: 'array', title: 'Photos', items: { type: 'object', properties: { uploadId: { type: 'string' } } } },
    retired: { type: 'string', title: 'Retired field', deprecated: true },
    emptyChoice: {
      type: 'string',
      title: 'Empty choice',
      anyOf: [{ oneOf: [{ const: 'no_option', title: 'No Options' }] }],
    },
  },
};

export const DICTATION_V1_SCHEMA_MOCK = {
  type: 'object',
  properties: {
    carcassType: {
      type: 'string',
      title: 'Carcass type',
      enum: ['fresh', 'old'],
      enumNames: { 0: 'Fresh', 1: 'Old' },
    },
    sex: {
      type: 'string',
      title: 'Sex',
      enum: ['m', 'f'],
      enumNames: ['Male', 'Female'],
    },
  },
};

export const buildLargeChoiceSchemaMock = (optionCount: number) => ({
  type: 'object',
  properties: {
    subject: {
      type: 'string',
      title: 'Subject',
      anyOf: [{
        oneOf: Array.from({ length: optionCount }, (_, index) => ({ const: `id-${index}`, title: `Subject ${index}` })),
      }],
    },
  },
});
