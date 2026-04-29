import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { SeminarService } from './seminar.service';

// TODO(seminar): 인증(AccessTokenGuard) 통합 후 request.member.id 로 교체
const STUB_VIEWER_ID = 1;

@Controller('seminars')
export class SeminarController {
  constructor(private readonly seminarService: SeminarService) {}

  // 'weekly' 라우트는 ':seminarId'보다 먼저 정의되어야 매칭 충돌이 없음
  @Get('weekly')
  getThisWeek() {
    return this.seminarService.getThisWeek();
  }

  @Get()
  getSchedules() {
    return this.seminarService.getSchedules(STUB_VIEWER_ID);
  }

  @Get(':seminarId')
  getDetail(@Param('seminarId', ParseIntPipe) seminarId: number) {
    return this.seminarService.getDetail(seminarId);
  }
}
