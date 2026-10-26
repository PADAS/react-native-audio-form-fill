import { CoercedDictationValues } from '../extraction';

export interface TranscriptionResult {
  transcript: string;
  language: string;
  loadMs: number;
  transcribeMs: number;
}

export interface ExtractionResult extends CoercedDictationValues {
  rawOutput: string;
  loadMs: number;
  extractMs: number;
  promptTokens: number;
  promptTokensPerSecond: number;
  generatedTokens: number;
  generatedTokensPerSecond: number;
}
