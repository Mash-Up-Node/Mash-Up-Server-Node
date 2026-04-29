import { Module } from '@nestjs/common';
import { DanggnsController } from './danggns.controller';
import { RankingRepository } from './ranking.repository';
import { DanggnsRepository } from './danggns.repository';
import { DanggnsService } from './danggns.service';
import { DanggnsCacheRepository } from './danggns-cache.repository';

@Module({
  controllers: [DanggnsController],
  providers: [
    RankingRepository,
    DanggnsRepository,
    DanggnsCacheRepository,
    DanggnsService,
  ],
})
export class DanggnsModule {}
