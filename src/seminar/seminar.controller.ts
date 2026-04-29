import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { SeminarService } from './seminar.service';

@Controller('seminars')
export class SeminarController {
  constructor(private readonly seminarService: SeminarService) {}

  // 'weekly' 라우트는 ':seminarId'보다 먼저 정의되어야 매칭 충돌이 없음
  @Get('weekly')
  getWeekly() {
    return this.seminarService.getWeekly();
  }

  @Get()
  getList() {
    return this.seminarService.getList();
  }

  @Get(':seminarId')
  getDetail(@Param('seminarId', ParseIntPipe) seminarId: number) {
    return this.seminarService.getDetail(seminarId);
  }
}
