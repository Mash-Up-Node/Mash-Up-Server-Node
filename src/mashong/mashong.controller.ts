import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { MashongService } from './mashong.service';

@Controller('mashong')
// TODO: AuthGuard 추가
export class MashongController {
  constructor(private readonly mashongService: MashongService) {}

  @HttpCode(200)
  @Post('attendance')
  async checkAttendance(@Req() req: Request) {
    const memeberId = req.member.id;
    return this.mashongService.checkAttendance(memeberId);
  }
}
