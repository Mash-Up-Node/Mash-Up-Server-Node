import { Module } from '@nestjs/common';
import { SeminarController } from './seminar.controller';
import { SeminarRepository } from './seminar.repository';
import { SeminarService } from './seminar.service';

@Module({
  controllers: [SeminarController],
  providers: [SeminarService, SeminarRepository],
})
export class SeminarModule {}
