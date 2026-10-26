/**
 * Jest stand-in for react-native-audio-api, which needs native modules (mapped in package.json `jest.moduleNameMapper`)
 */

export const AudioManager = {
  checkRecordingPermissions: jest.fn(),
  requestRecordingPermissions: jest.fn(),
  setAudioSessionOptions: jest.fn(),
  setAudioSessionActivity: jest.fn(),
};

// Every AudioRecorder created by the code under test is this object
export const mockRecorder = {
  enableFileOutput: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  isRecording: jest.fn(() => false),
};

export const AudioRecorder = jest.fn(() => mockRecorder);

export const BitDepth = { Bit16: 0, Bit24: 1, Bit32: 2 };
export const FileFormat = {
  Wav: 0, Caf: 1, M4A: 2, Flac: 3,
};
export const FilePreset = {
  Low: {
    sampleRate: 22050, bitRate: 48000, bitDepth: 0, iosQuality: 1, flacCompressionLevel: 0,
  },
};
