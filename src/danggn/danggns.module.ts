import { Module } from '@nestjs/common';

import { DanggnsCacheRepository } from './danggns-cache.repository';
import { DanggnsController } from './danggns.controller';
import { DanggnsRepository } from './danggns.repository';
import { DanggnsService } from './danggns.service';

@Module({
  controllers: [DanggnsController],
  providers: [DanggnsService, DanggnsRepository, DanggnsCacheRepository],
})
export class DanggnsModule {}
