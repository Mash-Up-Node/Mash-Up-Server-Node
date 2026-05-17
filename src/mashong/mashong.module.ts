import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { MashongController } from './mashong.controller';
import { MashongRepository } from './mashong.repository';
import { MashongService } from './mashong.service';

@Module({
  imports: [DbModule],
  controllers: [MashongController],
  providers: [MashongRepository, MashongService],
})
export class MashongModule {}
