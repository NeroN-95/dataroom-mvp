import { Module } from '@nestjs/common';
import { SharesService } from './shares.service';
import { SharedAccessService } from './shared-access.service';
import { SharesController } from './shares.controller';
import { SharedController } from './shared.controller';
import { NodesModule } from '../nodes/nodes.module';

@Module({
  imports: [NodesModule],
  providers: [SharesService, SharedAccessService],
  controllers: [SharesController, SharedController],
})
export class SharingModule {}
