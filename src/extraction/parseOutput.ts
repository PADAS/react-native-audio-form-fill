import { isSchemaNode } from './schemaNode';

const mergeFills = (parsed: unknown): unknown => {
  if (!isSchemaNode(parsed) || !Array.isArray(parsed.fills)) return parsed;
  return Object.assign({}, ...parsed.fills.filter(isSchemaNode));
};

export const parseExtractionOutput = (text: string): unknown => {
  // Grammar-constrained output should be bare JSON, but some chat templates still wrap it in a code fence
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return undefined;

  try {
    return mergeFills(JSON.parse(text.slice(start, end + 1)));
  } catch {
    return undefined;
  }
};
