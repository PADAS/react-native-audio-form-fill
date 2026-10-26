export const parseExtractionOutput = (text: string): unknown => {
  // Grammar-constrained output should be bare JSON, but some chat templates still wrap it in a code fence
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return undefined;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
};
