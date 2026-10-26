/**
 * Jest stand-in for llama.rn, which needs native modules (mapped in package.json `jest.moduleNameMapper`)
 */

export const initLlama = jest.fn();
