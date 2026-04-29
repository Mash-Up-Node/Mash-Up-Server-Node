import { Controller, Get, HttpCode, Param } from '@nestjs/common';
import { MashongService } from './mashong.service';

@Controller('mashong')
// TODO: AuthGuard 추가
export class MashongController {
  constructor(private readonly mashongService: MashongService) {}

  @HttpCode(200)
  @Get(':platform')
  async getMashongInfo(@Param('platform') platform: string) {
    const generationId = 1; // 임시 테스트용, 가드 들어오고 삭제 예정
    return this.mashongService.getMashongInfo(platform, generationId);
  }
}
