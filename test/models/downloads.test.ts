import RNFS from 'react-native-fs';

import {
  deleteModel, downloadModel, getModelPath, isModelDownloaded,
} from '../../src';
import { CUSTOM_MODELS } from '../fixtures/models';

const [MODEL] = CUSTOM_MODELS;
const MODEL_PATH = '/documents/local-ai-models/custom-speech.bin';
const PARTIAL_PATH = `${MODEL_PATH}.partial`;

const mockFs = jest.mocked(RNFS);

// Resolves the download with `statusCode`, reporting `bytesWritten` of `contentLength` along the way
const mockDownload = (statusCode: number, bytesWritten = 5, contentLength = 10) => {
  mockFs.downloadFile.mockImplementation((options) => {
    options.progress?.({
      jobId: 1, bytesWritten, contentLength,
    });
    return { jobId: 1, promise: Promise.resolve({ jobId: 1, statusCode, bytesWritten }) };
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFs.exists.mockResolvedValue(false);
});

describe('getModelPath', () => {
  it('stores models under the documents directory', () => {
    expect(getModelPath(MODEL)).toBe(MODEL_PATH);
  });
});

describe('isModelDownloaded', () => {
  it('checks for the final file, not the partial download', async () => {
    mockFs.exists.mockResolvedValue(true);

    await expect(isModelDownloaded(MODEL)).resolves.toBe(true);
    expect(mockFs.exists).toHaveBeenCalledWith(MODEL_PATH);
  });
});

describe('downloadModel', () => {
  it('downloads to a partial file, reports progress and moves it into place', async () => {
    mockDownload(200);
    const onProgress = jest.fn();

    await downloadModel(MODEL, onProgress);

    expect(mockFs.mkdir).toHaveBeenCalledWith('/documents/local-ai-models');
    expect(mockFs.downloadFile).toHaveBeenCalledWith(expect.objectContaining({
      fromUrl: MODEL.url,
      toFile: PARTIAL_PATH,
    }));
    expect(onProgress).toHaveBeenCalledWith(0.5);
    expect(mockFs.moveFile).toHaveBeenCalledWith(PARTIAL_PATH, MODEL_PATH);
  });

  it('removes a partial file left by an interrupted download before starting', async () => {
    mockFs.exists.mockImplementation(async (path) => path === PARTIAL_PATH);
    mockDownload(200);

    await downloadModel(MODEL, jest.fn());

    expect(mockFs.unlink).toHaveBeenCalledWith(PARTIAL_PATH);
  });

  it('does not report progress when the size is unknown', async () => {
    mockDownload(200, 5, -1);
    const onProgress = jest.fn();

    await downloadModel(MODEL, onProgress);

    expect(onProgress).not.toHaveBeenCalled();
  });

  it('deletes the partial file and throws when the server does not return 200', async () => {
    mockDownload(404);

    await expect(downloadModel(MODEL, jest.fn())).rejects.toThrow('custom-speech with status 404');
    expect(mockFs.unlink).toHaveBeenCalledWith(PARTIAL_PATH);
    expect(mockFs.moveFile).not.toHaveBeenCalled();
  });
});

describe('deleteModel', () => {
  it('deletes a downloaded model', async () => {
    mockFs.exists.mockResolvedValue(true);

    await deleteModel(MODEL);

    expect(mockFs.unlink).toHaveBeenCalledWith(MODEL_PATH);
  });

  it('does nothing when the model is not downloaded', async () => {
    await deleteModel(MODEL);

    expect(mockFs.unlink).not.toHaveBeenCalled();
  });
});
