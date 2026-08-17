import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Node, NodeType, Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessService, Level } from '../../common/access.service';
import { StorageService } from '../../common/storage/storage.service';
import { detectMime, ALLOWED_MIME } from '../../utils/mime-sniff';
import { resolveNameConflict } from '../../utils/naming';
import { isUniqueViolation } from '../../utils/unique-retry';
import { childPath, ancestorIds, coveringIds } from '../../utils/node-path';
import { decodeCursor, encodeCursor, seekWhere } from '../../utils/cursor';

export type ConflictStrategy = 'rename' | 'replace' | 'error';

export interface NodeEntry {
  type: 'folder' | 'file';
  id: string;
  name: string;
  parentId: string | null;
  dataRoomId: string;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Listing {
  dataRoomId: string;
  folder: { id: string; name: string } | null;
  breadcrumb: { id: string; name: string }[];
  items: NodeEntry[];
  nextCursor: string | null;
}

const PAGE_DEFAULT = 50;
const PAGE_MAX = 100;

@Injectable()
export class NodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly storage: StorageService,
  ) {}

  async listRoomRoot(userId: string, dataRoomId: string, cursor: string | null, limit?: number) {
    const room = await this.access.room(dataRoomId);
    if (!room.rootId) throw new BadRequestException('Room has no root');
    const root = await this.access.require(userId, await this.access.node(room.rootId), Level.VIEWER);
    return this.listing(root, cursor, limit, false);
  }

  async listFolder(userId: string, folderId: string, cursor: string | null, limit?: number) {
    const folder = await this.access.require(userId, await this.access.node(folderId), Level.VIEWER);
    if (folder.type !== NodeType.FOLDER) throw new BadRequestException('Not a folder');
    return this.listing(folder, cursor, limit, true);
  }

  private async listing(folder: Node, cursor: string | null, limit: number | undefined, withCrumbs: boolean): Promise<Listing> {
    const { items, nextCursor } = await this.pageOf(folder.dataRoomId, folder.id, cursor, limit);
    const breadcrumb = withCrumbs ? await this.breadcrumb(folder) : [];
    return {
      dataRoomId: folder.dataRoomId,
      folder: withCrumbs ? { id: folder.id, name: folder.name } : null,
      breadcrumb,
      items,
      nextCursor,
    };
  }

  private async breadcrumb(folder: Node): Promise<{ id: string; name: string }[]> {
    const ids = ancestorIds(folder.path);
    const trail = [...ids.slice(1), folder.id];
    if (!trail.length) return [];
    const nodes = await this.prisma.node.findMany({
      where: { id: { in: trail } },
      select: { id: true, name: true },
    });
    const byId = new Map(nodes.map((n) => [n.id, n.name]));
    return trail.filter((id) => byId.has(id)).map((id) => ({ id, name: byId.get(id)! }));
  }

  private async pageOf(dataRoomId: string, parentId: string, cursor: string | null, rawLimit?: number) {
    const limit = Math.min(rawLimit && rawLimit > 0 ? rawLimit : PAGE_DEFAULT, PAGE_MAX);
    const cur = decodeCursor(cursor);
    const items: NodeEntry[] = [];

    if (!cur || cur.phase === 'folder') {
      const seek = cur?.phase === 'folder' ? seekWhere(cur.name, cur.id) : {};
      const folders = await this.prisma.node.findMany({
        where: { dataRoomId, parentId, type: NodeType.FOLDER, deletedAt: null, ...seek },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: limit + 1,
      });
      for (const f of folders.slice(0, limit)) items.push(this.entry(f));
      if (items.length >= limit) {
        const last = items[items.length - 1];
        return { items, nextCursor: encodeCursor({ phase: 'folder', name: last.name, id: last.id }) };
      }
    }

    const remaining = limit - items.length;
    const fileSeek = cur?.phase === 'file' ? seekWhere(cur.name, cur.id) : {};
    const files = await this.prisma.node.findMany({
      where: { dataRoomId, parentId, type: NodeType.FILE, deletedAt: null, ...fileSeek },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: remaining + 1,
    });
    const fileEntries = files.slice(0, remaining).map((f) => this.entry(f));
    items.push(...fileEntries);
    if (files.length > remaining) {
      const last = fileEntries[fileEntries.length - 1];
      return { items, nextCursor: encodeCursor({ phase: 'file', name: last.name, id: last.id }) };
    }
    return { items, nextCursor: null };
  }

  async search(userId: string, dataRoomId: string, q: string, cursor: string | null, rawLimit?: number) {
    const room = await this.access.room(dataRoomId);
    if (room.rootId) await this.access.require(userId, await this.access.node(room.rootId), Level.VIEWER);
    const term = q.trim();
    if (!term) return { items: [], nextCursor: null };

    const limit = Math.min(rawLimit && rawLimit > 0 ? rawLimit : PAGE_DEFAULT, PAGE_MAX);
    const cur = decodeCursor(cursor);
    const seek = cur ? seekWhere(cur.name, cur.id) : {};
    const files = await this.prisma.node.findMany({
      where: { dataRoomId, type: NodeType.FILE, deletedAt: null, name: { contains: term, mode: 'insensitive' }, ...seek },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const items = files.slice(0, limit).map((f) => this.entry(f));
    const nextCursor = files.length > limit
      ? encodeCursor({ phase: 'file', name: items[items.length - 1].name, id: items[items.length - 1].id })
      : null;
    return { items, nextCursor };
  }

  async fileForRead(userId: string, nodeId: string): Promise<Node> {
    const node = await this.access.require(userId, await this.access.node(nodeId), Level.VIEWER);
    if (node.type !== NodeType.FILE) throw new BadRequestException('Not a file');
    return node;
  }

  streamFile(storageKey: string) {
    return this.storage.read(storageKey);
  }

  page(folder: Node, cursor: string | null, limit?: number) {
    return this.pageOf(folder.dataRoomId, folder.id, cursor, limit);
  }

  async breadcrumbWithin(folder: Node, shareRootId: string): Promise<{ id: string; name: string }[]> {
    const ids = coveringIds(folder.path);
    const idx = ids.indexOf(shareRootId);
    const trail = idx >= 0 ? ids.slice(idx + 1) : ids;
    if (!trail.length) return [];
    const nodes = await this.prisma.node.findMany({
      where: { id: { in: trail } },
      select: { id: true, name: true },
    });
    const byId = new Map(nodes.map((n) => [n.id, n.name]));
    return trail.filter((id) => byId.has(id)).map((id) => ({ id, name: byId.get(id)! }));
  }

  toEntry(node: Node): NodeEntry {
    return this.entry(node);
  }

  async createFolder(userId: string, dataRoomId: string, parentId: string | null, name: string, onConflict: ConflictStrategy = 'rename'): Promise<NodeEntry> {
    const parent = await this.writableParent(userId, dataRoomId, parentId);
    const node = await this.insertChild(parent, NodeType.FOLDER, name.trim(), {}, onConflict);
    return this.entry(node);
  }

  async upload(userId: string, dataRoomId: string, parentId: string | null, files: Express.Multer.File[], onConflict: ConflictStrategy = 'rename'): Promise<NodeEntry[]> {
    const parent = await this.writableParent(userId, dataRoomId, parentId);
    if (!files?.length) throw new BadRequestException('No files uploaded');

    const mimes = files.map((f) => {
      const mime = detectMime(f.buffer, f.mimetype, f.originalname);
      if (!mime || !ALLOWED_MIME.has(mime)) throw new BadRequestException(`Unsupported or corrupted file: ${f.originalname}`);
      return mime;
    });

    const created: NodeEntry[] = [];
    for (const [i, file] of files.entries()) {
      const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const blob = await this.storage.save(file.buffer, name);
      try {
        const node = await this.insertChild(parent, NodeType.FILE, name, { storageKey: blob.key, mimeType: mimes[i], size: blob.size }, onConflict);
        created.push(this.entry(node));
      } catch (err) {
        await this.storage.delete(blob.key).catch(() => undefined);
        throw err;
      }
    }
    return created;
  }

  async rename(userId: string, nodeId: string, name: string, onConflict: ConflictStrategy = 'rename'): Promise<NodeEntry> {
    const node = await this.access.require(userId, await this.access.node(nodeId), Level.EDITOR);
    const updated = await this.settleName(node.parentId, node.dataRoomId, name.trim(), node.id, onConflict, (finalName) =>
      this.prisma.node.update({ where: { id: node.id }, data: { name: finalName } }),
    );
    return this.entry(updated);
  }

  async move(userId: string, nodeId: string, targetParentId: string | null, onConflict: ConflictStrategy = 'rename'): Promise<NodeEntry> {
    const node = await this.access.require(userId, await this.access.node(nodeId), Level.EDITOR);
    const target = await this.writableParent(userId, node.dataRoomId, targetParentId);
    if (target.dataRoomId !== node.dataRoomId) throw new BadRequestException('Cannot move across rooms');
    if (target.path.startsWith(node.path)) throw new BadRequestException('Cannot move a folder into itself');

    const newPrefix = childPath(target.path, node.id);
    const updated = await this.settleName(target.id, node.dataRoomId, node.name, node.id, onConflict, async (finalName) => {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Node" SET "path" = $1 || substring("path" from ($2)::int), "updatedAt" = now() WHERE "dataRoomId" = $3 AND "path" LIKE $4`,
        newPrefix, node.path.length + 1, node.dataRoomId, `${node.path}%`,
      );
      return this.prisma.node.update({ where: { id: node.id }, data: { parentId: target.id, name: finalName } });
    });
    return this.entry(updated);
  }

  async remove(userId: string, nodeId: string) {
    const node = await this.access.require(userId, await this.access.node(nodeId), Level.EDITOR);
    const batchId = uuid();
    const affected = await this.prisma.$executeRawUnsafe(
      `UPDATE "Node" SET "deletedAt" = now(), "deleteBatchId" = $1 WHERE "dataRoomId" = $2 AND "path" LIKE $3 AND "deletedAt" IS NULL`,
      batchId, node.dataRoomId, `${node.path}%`,
    );
    return { deleted: true, batchId, count: affected };
  }

  async deletePreview(userId: string, nodeId: string) {
    const node = await this.access.require(userId, await this.access.node(nodeId), Level.VIEWER);
    const [stats] = await this.prisma.$queryRawUnsafe<{ folders: bigint; files: bigint; size: bigint }[]>(
      `SELECT
         count(*) FILTER (WHERE type = 'FOLDER')::bigint AS folders,
         count(*) FILTER (WHERE type = 'FILE')::bigint  AS files,
         COALESCE(sum(size), 0)::bigint AS size
       FROM "Node"
       WHERE "dataRoomId" = $1 AND "path" LIKE $2 AND "deletedAt" IS NULL AND id <> $3`,
      node.dataRoomId, `${node.path}%`, node.id,
    );
    const [{ links }] = await this.prisma.$queryRawUnsafe<{ links: bigint }[]>(
      `SELECT count(*)::bigint AS links FROM "Share" s
       JOIN "Node" n ON n.id = s."nodeId"
       WHERE n."dataRoomId" = $1 AND n."path" LIKE $2 AND s."revokedAt" IS NULL`,
      node.dataRoomId, `${node.path}%`,
    );
    return {
      folderCount: Number(stats.folders),
      fileCount: Number(stats.files),
      totalSize: Number(stats.size),
      activeLinks: Number(links),
    };
  }

  private entry(n: Node): NodeEntry {
    return {
      type: n.type === NodeType.FOLDER ? 'folder' : 'file',
      id: n.id,
      name: n.name,
      parentId: n.parentId,
      dataRoomId: n.dataRoomId,
      mimeType: n.mimeType,
      size: n.size,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    };
  }

  private async writableParent(userId: string, dataRoomId: string, parentId: string | null): Promise<Node> {
    if (parentId) {
      const parent = await this.access.node(parentId);
      if (parent.dataRoomId !== dataRoomId || parent.type !== NodeType.FOLDER) {
        throw new BadRequestException('Parent folder does not belong to room');
      }
      return this.access.require(userId, parent, Level.EDITOR);
    }
    const rootId = await this.access.ownedRoomRoot(userId, dataRoomId);
    return this.access.node(rootId);
  }

  private insertChild(parent: Node, type: NodeType, name: string, payload: Partial<Node>, onConflict: ConflictStrategy) {
    return this.settleName(parent.id, parent.dataRoomId, name, undefined, onConflict, (finalName) => {
      const id = uuid();
      return this.prisma.node.create({
        data: {
          id,
          type,
          name: finalName,
          dataRoomId: parent.dataRoomId,
          parentId: parent.id,
          path: childPath(parent.path, id),
          storageKey: payload.storageKey ?? null,
          mimeType: payload.mimeType ?? null,
          size: payload.size ?? null,
        },
      });
    });
  }

  private async settleName(
    parentId: string | null,
    dataRoomId: string,
    desired: string,
    excludeId: string | undefined,
    onConflict: ConflictStrategy,
    write: (name: string) => Promise<Node>,
  ): Promise<Node> {
    let name = desired;
    for (let attempt = 0; ; attempt++) {
      try {
        return await write(name);
      } catch (err) {
        if (!isUniqueViolation(err) || attempt >= 5) throw err;
        if (onConflict === 'error') {
          throw new ConflictException({ code: 'NAME_CONFLICT', name: desired });
        }
        if (onConflict === 'replace' && attempt === 0) {
          await this.prisma.node.updateMany({
            where: { parentId, dataRoomId, name: { equals: desired, mode: 'insensitive' }, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
            data: { deletedAt: new Date(), deleteBatchId: uuid() },
          });
          name = desired;
        } else {
          name = resolveNameConflict(desired, await this.siblingNames(parentId, dataRoomId, excludeId));
        }
      }
    }
  }

  private async siblingNames(parentId: string | null, dataRoomId: string, excludeId?: string): Promise<Set<string>> {
    const rows = await this.prisma.node.findMany({
      where: { parentId, dataRoomId, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { name: true },
    });
    return new Set(rows.map((r) => r.name));
  }
}
