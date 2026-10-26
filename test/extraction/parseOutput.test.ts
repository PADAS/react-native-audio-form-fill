import { parseExtractionOutput } from '../../src';

describe('parseExtractionOutput', () => {
  it('parses JSON even when wrapped in a code fence', () => {
    expect(parseExtractionOutput('```json\n{"shots": 2}\n```')).toEqual({ shots: 2 });
  });

  it('returns undefined for output that is not JSON', () => {
    expect(parseExtractionOutput('I could not find any fields.')).toBeUndefined();
  });
});
