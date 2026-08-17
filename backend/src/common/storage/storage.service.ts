import { Readable } from 'stream';

export interface StoredBlob {
  key: string;
  size: number;
}

export abstract class StorageService {
  abstract save(buffer: Buffer, originalName: string): Promise<StoredBlob>;
  abstract read(key: string): Promise<Readable>;
  abstract delete(key: string): Promise<void>;
  abstract getSignedUrl(key: string): Promise<string | null>;
}
