import { Controller, Get } from '@nestjs/common';
import { DanggnsService } from './danggns.service';

@Controller('danggns')
export class DanggnsController {
  constructor(private readonly danggnsService: DanggnsService) {}

  @Get('rounds')
  getRounds() {
    return this.danggnsService.getRounds();
  }
}
