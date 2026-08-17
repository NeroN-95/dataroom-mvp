import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Node, NodeType, Share } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessService, Level } from '../../common/access.service';
import { NodesService } from '../nodes/nodes.service';

@Injectable()
export class SharedAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly nodes: NodesService,
  ) {}

  async resolve(token: string, userId?: string) {
    const { share, node } = await this.shareByToken(token);
    await this.access.require(userId, node, Level.VIEWER);
    const owner = await this.prisma.user.findUnique({
      where: { id: share.ownerId },
      select: { name: true },
    });
    return {
      token,
      mode: share.mode,
      nodeType: node.type,
      resource: { id: node.id, name: node.name },
      owner: { name: owner?.name ?? 'Unknown' },
      file: node.type === NodeType.FILE ? this.nodes.toEntry(node) : null,
    };
  }

  async browse(
    token: string,
    folderId: string | null,
    cursor: string | null,
    limit: number | undefined,
    userId?: string,
  ) {
    const { node: root } = await this.shareByToken(token);

    if (root.type === NodeType.FILE) {
      await this.access.require(userId, root, Level.VIEWER);
      return {
        dataRoomId: root.dataRoomId,
        folder: null,
        breadcrumb: [],
        items: [this.nodes.toEntry(root)],
        nextCursor: null,
      };
    }

    let target = root;
    if (folderId) {
      const folder = await this.access.node(folderId);
      if (folder.type !== NodeType.FOLDER || !folder.path.startsWith(root.path)) {
        throw new NotFoundException('Folder not found in this share');
      }
      target = folder;
    }
    await this.access.require(userId, target, Level.VIEWER);

    const { items, nextCursor } = await this.nodes.page(target, cursor, limit);
    const breadcrumb = await this.nodes.breadcrumbWithin(target, root.id);
    const folder = target.id === root.id ? null : { id: target.id, name: target.name };
    return { dataRoomId: target.dataRoomId, folder, breadcrumb, items, nextCursor };
  }

  async fileForContent(token: string, fileId: string, userId?: string): Promise<Node> {
    const { node: root } = await this.shareByToken(token);
    const file = await this.access.node(fileId);
    if (file.type !== NodeType.FILE || !file.path.startsWith(root.path)) {
      throw new ForbiddenException();
    }
    await this.access.require(userId, file, Level.VIEWER);
    return file;
  }

  streamFile(storageKey: string) {
    return this.nodes.streamFile(storageKey);
  }

  private async shareByToken(token: string): Promise<{ share: Share; node: Node }> {
    const share = await this.prisma.share.findUnique({
      where: { publicToken: token },
    });
    if (!share || share.revokedAt) throw new NotFoundException('Link not found');
    const node = await this.access.node(share.nodeId);
    return { share, node };
  }
}
