import { Injectable } from '@nestjs/common';
import { createReadStream, promises as fs } from 'fs';
import { Readable } from 'stream';
import { join, resolve, extname } from 'path';
import { v4 as uuid } from 'uuid';
import { StorageService, StoredBlob } from './storage.service';

@Injectable()
export class LocalDiskStorage extends StorageService {
  private readonly baseDir = resolve(
    process.env.STORAGE_LOCAL_DIR ?? './storage',
  );

  private full(key: string): string {
    return join(this.baseDir, key);
  }

  async save(buffer: Buffer, originalName: string): Promise<StoredBlob> {
    const ext = extname(originalName);
    const id = uuid();
    const key = `${id.slice(0, 2)}/${id}${ext}`;
    const dest = this.full(key);
    await fs.mkdir(join(this.baseDir, id.slice(0, 2)), { recursive: true });
    await fs.writeFile(dest, buffer);
    return { key, size: buffer.length };
  }

  async read(key: string): Promise<Readable> {
    return createReadStream(this.full(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.full(key), { force: true });
  }

  async getSignedUrl(): Promise<string | null> {
    return null;
  }
}
