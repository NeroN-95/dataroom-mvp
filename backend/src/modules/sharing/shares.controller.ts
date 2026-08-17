import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { SharesService } from './shares.service';
import { AddGrantDto, CreateShareDto } from './dto/sharing.dto';

@UseGuards(JwtAuthGuard)
@Controller('shares')
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShareDto) {
    return this.shares.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('nodeId') nodeId: string) {
    if (!nodeId) throw new BadRequestException('nodeId is required');
    return this.shares.listForNode(user.id, nodeId);
  }

  @Post(':id/grants')
  addGrant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddGrantDto,
  ) {
    return this.shares.addGrant(user.id, id, dto.email);
  }

  @Delete(':id/grants/:userId')
  removeGrant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') grantUserId: string,
  ) {
    return this.shares.removeGrant(user.id, id, grantUserId);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shares.revoke(user.id, id);
  }
}
