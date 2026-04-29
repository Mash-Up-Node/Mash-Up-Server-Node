import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { MashongController } from './mashong.controller';
import { MashongService } from './mashong.service';

@Module({
  imports: [DbModule],
  controllers: [MashongController],
  providers: [MashongService],
})
export class MashongModule {}
