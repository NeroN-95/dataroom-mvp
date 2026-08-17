import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { NodesService, ConflictStrategy } from './nodes.service';
import {
  CreateFolderDto,
  MoveNodeDto,
  RenameNodeDto,
  UploadTargetDto,
} from './dto/node.dto';

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB ?? 50) * 1024 * 1024;

const uploadOptions = {
  limits: { fileSize: MAX_FILE_SIZE },
};

@UseGuards(JwtAuthGuard)
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodes: NodesService) {}

  @Get('root')
  root(
    @CurrentUser() user: AuthUser,
    @Query('dataRoomId') dataRoomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    if (!dataRoomId) throw new BadRequestException('dataRoomId is required');
    return this.nodes.listRoomRoot(user.id, dataRoomId, cursor ?? null, limit ? Number(limit) : undefined);
  }

  @Get('search')
  search(
    @CurrentUser() user: AuthUser,
    @Query('dataRoomId') dataRoomId: string,
    @Query('q') q: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    if (!dataRoomId) throw new BadRequestException('dataRoomId is required');
    return this.nodes.search(user.id, dataRoomId, q ?? '', cursor ?? null, limit ? Number(limit) : undefined);
  }

  @Post('folders')
  createFolder(@CurrentUser() user: AuthUser, @Body() dto: CreateFolderDto) {
    return this.nodes.createFolder(user.id, dto.dataRoomId, dto.parentId ?? null, dto.name, dto.onConflict ?? 'rename');
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 25, uploadOptions))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadTargetDto,
  ) {
    return this.nodes.upload(user.id, dto.dataRoomId, dto.parentId ?? null, files, dto.onConflict ?? 'rename');
  }

  @Get(':id/children')
  children(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.nodes.listFolder(user.id, id, cursor ?? null, limit ? Number(limit) : undefined);
  }

  @Get(':id/delete-preview')
  deletePreview(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.nodes.deletePreview(user.id, id);
  }

  @Get(':id/content')
  async content(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.nodes.fileForRead(user.id, id);
    const stream = await this.nodes.streamFile(file.storageKey!);
    res.set({
      'Content-Type': file.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      'Content-Length': String(file.size ?? 0),
    });
    return new StreamableFile(stream);
  }

  @Patch(':id')
  rename(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RenameNodeDto) {
    return this.nodes.rename(user.id, id, dto.name, dto.onConflict ?? 'rename');
  }

  @Patch(':id/move')
  move(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MoveNodeDto) {
    return this.nodes.move(user.id, id, dto.targetParentId ?? null, dto.onConflict ?? 'rename');
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.nodes.remove(user.id, id);
  }
}
