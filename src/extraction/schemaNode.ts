/**
 * Type-safe readers for untyped JSON Schema nodes
 */

export type SchemaNode = Record<string, unknown>;

export const isSchemaNode = (value: unknown): value is SchemaNode => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const getString = (node: SchemaNode, key: string): string | undefined => {
  const value = node[key];
  return typeof value === 'string' ? value : undefined;
};

export const getNumber = (node: SchemaNode, key: string): number | undefined => {
  const value = node[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

export const getSchemaNodes = (node: SchemaNode, key: string): SchemaNode[] => {
  const value = node[key];
  return Array.isArray(value) ? value.filter(isSchemaNode) : [];
};
