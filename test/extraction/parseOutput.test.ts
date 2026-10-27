import { parseExtractionOutput } from '../../src';

describe('parseExtractionOutput', () => {
  it('parses JSON even when wrapped in a code fence', () => {
    expect(parseExtractionOutput('```json\n{"shots": 2}\n```')).toEqual({ shots: 2 });
  });

  it('merges a list of one-field entries into one object, a later entry for a key winning', () => {
    const output = '{"fills": [{"species": "Rhino"}, {"shots": 2}, "noise", {"shots": 3}]}';

    expect(parseExtractionOutput(output)).toEqual({ species: 'Rhino', shots: 3 });
  });

  it('returns undefined for output that is not JSON', () => {
    expect(parseExtractionOutput('I could not find any fields.')).toBeUndefined();
  });
});
