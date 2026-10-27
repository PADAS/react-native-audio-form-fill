import { buildExtractionMessages, getDictationFields } from '../../src';
import { DICTATION_V2_SCHEMA_MOCK } from '../fixtures/schemas';

describe('buildExtractionMessages', () => {
  it('lists fields with options and includes the transcript and current values', () => {
    const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);
    const [system, user] = buildExtractionMessages(
      fields,
      ' Two snares near a dead rhino ',
      { observations: 'Found at dawn', shots: '' },
      new Date('2026-10-23T08:00:00.000Z'),
    );

    expect(system.content).toContain('2026-10-23T08:00:00.000Z');
    expect(user.content).toContain('- species: "Species" (choice) Options: Elephant | Rhino');
    expect(user.content).toContain('Current values: {"observations":"Found at dawn"}');
    expect(user.content).toContain('What the ranger said: "Two snares near a dead rhino"');
  });

  it('shows current choice selections as option titles and skips empty lists', () => {
    const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);
    const [, user] = buildExtractionMessages(
      fields,
      'Remove the snare',
      { species: 'rhino_uuid', threats: ['snare', 'fire'], requiresMedicine: false, code: [] },
      new Date('2026-10-23T08:00:00.000Z'),
    );

    expect(user.content).toContain(
      'Current values: {"requiresMedicine":false,"species":"Rhino","threats":["Snare","Fire"]}',
    );
  });

  it('explains how to add, remove and clear options', () => {
    const { fields } = getDictationFields(DICTATION_V2_SCHEMA_MOCK);
    const [system] = buildExtractionMessages(fields, 'Clear the threats', {}, new Date());

    expect(system.content).toContain('{"add": [...], "remove": [...]}');
    expect(system.content).toContain('"remove snare from threats" -> {"threats": {"remove": ["Snare"]}}');
    expect(system.content).toContain('Reply null for a choice or multiChoice field only when the ranger asks to clear');
  });
});
