import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  DanggnsFeverRequestDto,
  DanggnsFeverRequestSchema,
} from './dto/danggns-fever-request.dto';
import {
  DanggnsShakeRequestDto,
  DanggnsShakeRequestSchema,
} from './dto/danggns-shake-request.dto';
import { DanggnsService } from './danggns.service';

@Controller('danggns')
export class DanggnsController {
  constructor(private readonly danggnsService: DanggnsService) {}

  @Get('rounds')
  getRounds() {
    return this.danggnsService.getRounds();
  }

  @Get('rounds/:roundId')
  getRound(@Param('roundId', ParseIntPipe) roundId: number) {
    return this.danggnsService.getRoundData(roundId);
  }

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

  @Post('fevers')
  createFever(
    @Body(new ZodValidationPipe(DanggnsFeverRequestSchema))
    body: DanggnsFeverRequestDto,
  ) {
    return this.danggnsService.handleFever(body.roundId);
  }
}
