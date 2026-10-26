export type LocalModelType = 'speech' | 'language';

export interface LocalModel {
  id: string;
  type: LocalModelType;
  name: string;
  fileName: string;
  url: string;
  sizeMB: number;
}
