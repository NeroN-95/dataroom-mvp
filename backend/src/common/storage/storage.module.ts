import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalDiskStorage } from './local-disk.storage';
import { S3Storage } from './s3.storage';

@Global()
@Module({
  providers: [
    {
      provide: StorageService,
      useClass:
        process.env.STORAGE_DRIVER === 's3' ? S3Storage : LocalDiskStorage,
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
