import { Module } from '@nestjs/common';
import { DanggnsController } from './danggns.controller';
import { DanggnsRepository } from './danggns.repository';
import { DanggnsService } from './danggns.service';

@Module({
  controllers: [DanggnsController],
  providers: [DanggnsService, DanggnsRepository],
})
export class DanggnsModule {}
