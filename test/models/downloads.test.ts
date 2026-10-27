import RNFS from 'react-native-fs';

import {
  deleteModel, downloadModel, getDownloadProgress, getModelPath, isModelDownloaded, subscribeToDownloads,
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

// Records every progress snapshot published while `run` executes
const recordProgress = async (run: () => Promise<void>) => {
  const snapshots: Record<string, number>[] = [];
  const unsubscribe = subscribeToDownloads(() => snapshots.push(getDownloadProgress()));
  try {
    await run();
  } finally {
    unsubscribe();
  }
  return snapshots;
};

describe('downloadModel', () => {
  it('downloads to a partial file, reports progress and moves it into place', async () => {
    mockDownload(200);

    const snapshots = await recordProgress(() => downloadModel(MODEL));

    expect(mockFs.mkdir).toHaveBeenCalledWith('/documents/local-ai-models');
    expect(mockFs.downloadFile).toHaveBeenCalledWith(expect.objectContaining({
      fromUrl: MODEL.url,
      toFile: PARTIAL_PATH,
      begin: expect.any(Function),
    }));
    expect(snapshots).toEqual([{ 'custom-speech': 0 }, { 'custom-speech': 0.5 }, {}]);
    expect(mockFs.moveFile).toHaveBeenCalledWith(PARTIAL_PATH, MODEL_PATH);
  });

  it('removes a partial file left by an interrupted download before starting', async () => {
    mockFs.exists.mockImplementation(async (path) => path === PARTIAL_PATH);
    mockDownload(200);

    await downloadModel(MODEL);

    expect(mockFs.unlink).toHaveBeenCalledWith(PARTIAL_PATH);
  });

  it('does not report progress when the size is unknown', async () => {
    mockDownload(200, 5, -1);

    const snapshots = await recordProgress(() => downloadModel(MODEL));

    expect(snapshots).toEqual([{ 'custom-speech': 0 }, {}]);
  });

  it('joins a download already in progress instead of starting another', async () => {
    let finishDownload: () => void = () => undefined;
    mockFs.downloadFile.mockReturnValue({
      jobId: 1,
      promise: new Promise((resolve) => {
        finishDownload = () => resolve({ jobId: 1, statusCode: 200, bytesWritten: 10 });
      }),
    });

    const first = downloadModel(MODEL);
    const second = downloadModel(MODEL);
    await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    finishDownload();
    await Promise.all([first, second]);

    expect(second).toBe(first);
    expect(mockFs.downloadFile).toHaveBeenCalledTimes(1);
    expect(getDownloadProgress()).toEqual({});
  });

  it('deletes the partial file and throws when the server does not return 200', async () => {
    mockDownload(404);

    await expect(downloadModel(MODEL)).rejects.toThrow('custom-speech with status 404');
    expect(mockFs.unlink).toHaveBeenCalledWith(PARTIAL_PATH);
    expect(mockFs.moveFile).not.toHaveBeenCalled();
    expect(getDownloadProgress()).toEqual({});
  });

  it('starts a new download after a failed one', async () => {
    mockDownload(404);
    await expect(downloadModel(MODEL)).rejects.toThrow();
    mockDownload(200);

    await downloadModel(MODEL);

    expect(mockFs.downloadFile).toHaveBeenCalledTimes(2);
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
