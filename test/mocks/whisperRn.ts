/**
 * Jest stand-in for whisper.rn, which needs native modules (mapped in package.json `jest.moduleNameMapper`)
 */

export const initWhisper = jest.fn();
