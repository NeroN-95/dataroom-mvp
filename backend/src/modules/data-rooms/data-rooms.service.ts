import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessService } from '../../common/access.service';
import { StorageService } from '../../common/storage/storage.service';
import { mapWithConcurrency } from '../../utils/concurrency';
import { rootPath } from '../../utils/node-path';
import { CreateDataRoomDto, UpdateDataRoomDto } from './dto/data-room.dto';

const BLOB_DELETE_CONCURRENCY = 20;

@Injectable()
export class DataRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, dto: CreateDataRoomDto) {
    const name = dto.name.trim();
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.dataRoom.create({ data: { name, ownerId: userId } });
      const rootId = uuid();
      await tx.node.create({
        data: {
          id: rootId,
          type: 'FOLDER',
          name,
          dataRoomId: room.id,
          parentId: null,
          path: rootPath(rootId),
        },
      });
      return tx.dataRoom.update({ where: { id: room.id }, data: { rootId } });
    });
  }

  async list(userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<
      {
        id: string;
        name: string;
        ownerId: string;
        createdAt: Date;
        updatedAt: Date;
        folders: bigint;
        files: bigint;
        size: bigint;
      }[]
    >(
      `SELECT dr.id, dr.name, dr."ownerId", dr."createdAt", dr."updatedAt",
              COALESCE(n.folders, 1) - 1 AS folders,
              COALESCE(n.files, 0)       AS files,
              COALESCE(n.size, 0)        AS size
       FROM "DataRoom" dr
       LEFT JOIN (
         SELECT "dataRoomId",
                count(*) FILTER (WHERE type = 'FOLDER') AS folders,
                count(*) FILTER (WHERE type = 'FILE')   AS files,
                COALESCE(sum(size), 0)                  AS size
         FROM "Node" WHERE "deletedAt" IS NULL GROUP BY "dataRoomId"
       ) n ON n."dataRoomId" = dr.id
       WHERE dr."ownerId" = $1
       ORDER BY dr."createdAt" DESC`,
      userId,
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      ownerId: r.ownerId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      stats: {
        folderCount: Number(r.folders),
        fileCount: Number(r.files),
        totalSize: Number(r.size),
      },
    }));
  }

  async get(userId: string, id: string) {
    const room = await this.access.ownedRoom(userId, id);
    return { ...room, stats: await this.roomStats(id) };
  }

  async stats(userId: string, id: string) {
    await this.access.ownedRoom(userId, id);
    return this.roomStats(id);
  }

  async rename(userId: string, id: string, dto: UpdateDataRoomDto) {
    await this.access.ownedRoom(userId, id);
    return this.prisma.dataRoom.update({ where: { id }, data: { name: dto.name.trim() } });
  }

  async remove(userId: string, id: string) {
    await this.access.ownedRoom(userId, id);
    const files = await this.prisma.node.findMany({
      where: { dataRoomId: id, type: 'FILE', storageKey: { not: null } },
      select: { storageKey: true },
    });
    await this.prisma.dataRoom.delete({ where: { id } });
    await mapWithConcurrency(files, BLOB_DELETE_CONCURRENCY, (f) =>
      this.storage.delete(f.storageKey!),
    );
    return { deleted: true };
  }

  private async roomStats(dataRoomId: string) {
    const [s] = await this.prisma.$queryRawUnsafe<
      { folders: bigint; files: bigint; size: bigint }[]
    >(
      `SELECT count(*) FILTER (WHERE type = 'FOLDER') - 1 AS folders,
              count(*) FILTER (WHERE type = 'FILE')      AS files,
              COALESCE(sum(size), 0)                     AS size
       FROM "Node" WHERE "dataRoomId" = $1 AND "deletedAt" IS NULL`,
      dataRoomId,
    );
    return {
      folderCount: Number(s.folders),
      fileCount: Number(s.files),
      totalSize: Number(s.size),
    };
  }
}
