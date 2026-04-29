import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  DanggnsFeverRequestDto,
  DanggnsFeverRequestSchema,
} from './dto/danggns-fever-request.dto';
import { DanggnsService } from './danggns.service';

@Controller('danggns')
export class DanggnsController {
  constructor(private readonly danggnsService: DanggnsService) {}

  @Post('fevers')
  createFever(
    @Body(new ZodValidationPipe(DanggnsFeverRequestSchema))
    body: DanggnsFeverRequestDto,
  ) {
    return this.danggnsService.handleFever(body.roundId);
  }
}
