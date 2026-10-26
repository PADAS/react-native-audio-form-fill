/**
 * Jest stand-in for react-native-fs, which needs native modules (mapped in package.json `jest.moduleNameMapper`)
 */

const reactNativeFs = {
  DocumentDirectoryPath: '/documents',
  exists: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  moveFile: jest.fn(),
  downloadFile: jest.fn(),
};

export default reactNativeFs;
