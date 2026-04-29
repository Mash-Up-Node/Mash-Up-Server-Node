import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  DanggnsShakeRequestDto,
  DanggnsShakeRequestSchema,
} from './dto/danggns-shake-request.dto';
import { DanggnsService } from './danggns.service';

@Controller('danggns')
export class DanggnsController {
  constructor(private readonly danggnsService: DanggnsService) {}

  @Post('shakes')
  createShake(
    @Body(new ZodValidationPipe(DanggnsShakeRequestSchema))
    body: DanggnsShakeRequestDto,
  ) {
    return this.danggnsService.handleShake(
      body.roundId,
      body.shakeCount,
      body.sentAt,
      body.isFever,
    );
  }
}
