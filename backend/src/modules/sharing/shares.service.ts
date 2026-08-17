import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Share, ShareMode, ShareRole } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessService, Level } from '../../common/access.service';
import { CreateShareDto } from './dto/sharing.dto';

function appUrl(): string {
  const raw =
    process.env.APP_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async create(userId: string, dto: CreateShareDto) {
    const node = await this.access.requireNode(userId, dto.nodeId, Level.OWNER);

    const share = await this.prisma.share.create({
      data: {
        nodeId: node.id,
        mode: dto.mode,
        role: dto.role ?? ShareRole.VIEWER,
        ownerId: userId,
        publicToken: uuid().replace(/-/g, ''),
      },
    });

    const notFoundEmails: string[] = [];
    if (dto.mode === ShareMode.RESTRICTED && dto.grantEmails?.length) {
      for (const rawEmail of dto.grantEmails) {
        const email = rawEmail.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) notFoundEmails.push(email);
        else await this.grant(share.id, user.id);
      }
    }

    return { share: await this.shareView(share.id), notFoundEmails };
  }

  async listForNode(userId: string, nodeId: string) {
    await this.access.requireNode(userId, nodeId, Level.OWNER);
    const shares = await this.prisma.share.findMany({
      where: { nodeId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(shares.map((s) => this.shareView(s.id)));
  }

  async addGrant(userId: string, shareId: string, email: string) {
    const share = await this.ownedShare(userId, shareId);
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) throw new BadRequestException('No registered user with that email');
    await this.grant(share.id, user.id);
    return this.shareView(share.id);
  }

  async removeGrant(userId: string, shareId: string, grantUserId: string) {
    const share = await this.ownedShare(userId, shareId);
    await this.prisma.shareGrant.deleteMany({
      where: { shareId: share.id, userId: grantUserId },
    });
    return this.shareView(share.id);
  }

  async revoke(userId: string, shareId: string) {
    const share = await this.ownedShare(userId, shareId);
    await this.prisma.share.update({
      where: { id: share.id },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  private grant(shareId: string, userId: string) {
    return this.prisma.shareGrant.upsert({
      where: { shareId_userId: { shareId, userId } },
      create: { shareId, userId },
      update: {},
    });
  }

  private async ownedShare(userId: string, shareId: string): Promise<Share> {
    const share = await this.prisma.share.findUnique({ where: { id: shareId } });
    if (!share) throw new NotFoundException('Share not found');
    if (share.ownerId !== userId) throw new ForbiddenException();
    return share;
  }

  private async shareView(shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { node: true, grants: { include: { user: true } } },
    });
    if (!share) throw new NotFoundException('Share not found');
    return {
      id: share.id,
      nodeId: share.nodeId,
      nodeName: share.node.name,
      nodeType: share.node.type,
      mode: share.mode,
      role: share.role,
      token: share.publicToken,
      url: share.publicToken ? `${appUrl()}/shared/${share.publicToken}` : null,
      createdAt: share.createdAt,
      revokedAt: share.revokedAt,
      grants: share.grants.map((g) => ({
        userId: g.userId,
        email: g.user.email,
        name: g.user.name,
        role: g.role,
      })),
    };
  }
}
