import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { DanggnsService } from './danggns.service';

@Controller('danggns')
export class DanggnsController {
  constructor(private readonly danggnsService: DanggnsService) {}

  @Get('rounds/:roundId')
  getRound(@Param('roundId', ParseIntPipe) roundId: number) {
    return this.danggnsService.getRoundData(roundId);
  }
}
