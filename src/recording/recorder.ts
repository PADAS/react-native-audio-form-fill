/**
 * Records dictation to a 16 kHz mono WAV file with react-native-audio-api
 */

import {
  AudioManager, AudioRecorder, BitDepth, FileFormat, FileInfo, FilePreset, Result,
} from 'react-native-audio-api';

// Constants
// Whisper works at 16 kHz mono; recording at that rate avoids resampling a large file on-device
const DICTATION_FILE_OPTIONS = {
  format: FileFormat.Wav,
  channelCount: 1,
  preset: { ...FilePreset.Low, sampleRate: 16000, bitDepth: BitDepth.Bit16 },
  fileNamePrefix: 'dictation',
};

// Created on first use so importing the package doesn't touch the native audio module
let audioRecorder: AudioRecorder | undefined;

const getRecorder = (): AudioRecorder => {
  if (!audioRecorder) {
    audioRecorder = new AudioRecorder();
  }
  return audioRecorder;
};

export const hasRecordingPermission = async (): Promise<boolean> => (
  (await AudioManager.checkRecordingPermissions()) === 'Granted'
  || (await AudioManager.requestRecordingPermissions()) === 'Granted'
);

export const startDictationRecording = async (): Promise<Result<object>> => {
  const recorder = getRecorder();
  AudioManager.setAudioSessionOptions({ iosCategory: 'playAndRecord', iosMode: 'default', iosOptions: [] });
  recorder.enableFileOutput(DICTATION_FILE_OPTIONS);
  await AudioManager.setAudioSessionActivity(true);
  return recorder.start();
};

export const stopDictationRecording = async (): Promise<Result<FileInfo>> => {
  const recording = await getRecorder().stop();
  AudioManager.setAudioSessionActivity(false);
  return recording;
};

// Used on unmount so a recording never keeps the microphone open after the form closes
export const stopRecordingIfActive = (): void => {
  if (audioRecorder?.isRecording()) {
    audioRecorder.stop();
    AudioManager.setAudioSessionActivity(false);
  }
};
