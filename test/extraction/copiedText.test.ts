import { DictationField, rejectCopiedTranscript } from '../../src';

const FIELDS: DictationField[] = [
  { key: 'activity', title: 'Description of activity', kind: 'text' },
  { key: 'response', title: 'Patrols response/intent', kind: 'text' },
  { key: 'bearing', title: 'Bearing', kind: 'number' },
];
const TRANSCRIPT = 'We detected a camp fire at a distance of 25 meters. The response was to complete the extinguishment'
  + ' of the fire. The bearing was 275 and the description of the activity was the fire was going out.';

const check = (values: Record<string, unknown>, transcript = TRANSCRIPT) => (
  rejectCopiedTranscript(FIELDS, { values, rejected: [] }, transcript)
);

describe('rejectCopiedTranscript', () => {
  it('rejects a text answer that is the start of the transcript, even when cut off mid-sentence', () => {
    const copied = 'We detected a camp fire at a distance of 25 meters. The response was to complete the extinguishment'
      + ' of the fire. The ';

    const result = check({ activity: copied, response: 'Complete the extinguishment of the fire', bearing: 275 });

    expect(result.values).toEqual({ response: 'Complete the extinguishment of the fire', bearing: 275 });
    expect(result.rejected).toEqual([{ key: 'activity', value: copied, reason: 'copiedTranscript' }]);
  });

  it('keeps answers taken from the middle of the transcript', () => {
    const result = check({ activity: 'the fire was going out', response: 'complete the extinguishment of the fire' });

    expect(result.rejected).toEqual([]);
  });

  it('keeps a short answer that happens to start the transcript', () => {
    const result = check({ activity: 'Campfire spotted' }, 'Campfire spotted, two shots heard near the river.');

    expect(result.rejected).toEqual([]);
  });

  it('keeps a long answer that is only a small part of a long transcript', () => {
    const transcript = `${'We detected a camp fire burning near the old ranger post.'} ${'Further details follow. '.repeat(10)}`;

    const result = check({ activity: 'We detected a camp fire burning near the old ranger post.' }, transcript);

    expect(result.rejected).toEqual([]);
  });
});
