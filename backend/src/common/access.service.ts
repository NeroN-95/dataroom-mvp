import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataRoom, Node, ShareMode, ShareRole } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { coveringIds } from '../utils/node-path';

export enum Level {
  NONE = 0,
  VIEWER = 1,
  EDITOR = 2,
  OWNER = 3,
}

const ROLE_LEVEL: Record<ShareRole, Level> = {
  [ShareRole.VIEWER]: Level.VIEWER,
  [ShareRole.EDITOR]: Level.EDITOR,
};

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async node(nodeId: string): Promise<Node> {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null },
    });
    if (!node) throw new NotFoundException('Not found');
    return node;
  }

  async room(dataRoomId: string): Promise<DataRoom> {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: dataRoomId },
    });
    if (!room) throw new NotFoundException('Data room not found');
    return room;
  }

  async levelFor(userId: string | undefined, node: Node): Promise<Level> {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: node.dataRoomId },
      select: { ownerId: true },
    });
    if (userId && room?.ownerId === userId) return Level.OWNER;

    const shares = await this.prisma.share.findMany({
      where: { nodeId: { in: coveringIds(node.path) }, revokedAt: null },
      include: { grants: true },
    });

    let level = Level.NONE;
    for (const share of shares) {
      if (share.mode === ShareMode.PUBLIC) {
        level = Math.max(level, ROLE_LEVEL[share.role]);
      } else if (userId) {
        const grant = share.grants.find((g) => g.userId === userId);
        if (grant) level = Math.max(level, ROLE_LEVEL[grant.role]);
      }
    }
    return level;
  }

  async require(
    userId: string | undefined,
    node: Node,
    min: Level,
  ): Promise<Node> {
    const level = await this.levelFor(userId, node);
    if (level >= min) return node;
    if (level === Level.NONE) {
      if (!userId) throw new UnauthorizedException('Login required');
      throw new NotFoundException('Not found');
    }
    throw new ForbiddenException('You do not have access');
  }

  async requireNode(
    userId: string | undefined,
    nodeId: string,
    min: Level,
  ): Promise<Node> {
    return this.require(userId, await this.node(nodeId), min);
  }

  async ownedRoom(userId: string, dataRoomId: string): Promise<DataRoom> {
    const room = await this.room(dataRoomId);
    if (room.ownerId !== userId) throw new ForbiddenException();
    return room;
  }

  async ownedRoomRoot(userId: string, dataRoomId: string): Promise<string> {
    const room = await this.ownedRoom(userId, dataRoomId);
    if (!room.rootId) throw new NotFoundException('Room has no root');
    return room.rootId;
  }
}
