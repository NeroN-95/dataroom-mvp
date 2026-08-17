import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { SharedAccessService } from './shared-access.service';

@UseGuards(OptionalJwtAuthGuard)
@Controller('shared')
export class SharedController {
  constructor(private readonly shared: SharedAccessService) {}

  @Get(':token')
  resolve(@Param('token') token: string, @CurrentUser() user?: AuthUser) {
    return this.shared.resolve(token, user?.id);
  }

  @Get(':token/browse')
  browse(
    @Param('token') token: string,
    @Query('folderId') folderId: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.shared.browse(
      token,
      folderId || null,
      cursor || null,
      limit ? Number(limit) : undefined,
      user?.id,
    );
  }

  @Get(':token/files/:fileId/content')
  async content(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthUser,
  ): Promise<StreamableFile> {
    const file = await this.shared.fileForContent(token, fileId, user?.id);
    const stream = await this.shared.streamFile(file.storageKey!);
    res.set({
      'Content-Type': file.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      'Content-Length': String(file.size ?? 0),
    });
    return new StreamableFile(stream);
  }
}
