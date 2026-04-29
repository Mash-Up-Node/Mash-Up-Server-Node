import { Injectable } from '@nestjs/common';
import { SeminarRepository } from './seminar.repository';

@Injectable()
export class SeminarService {
  constructor(private readonly seminarRepository: SeminarRepository) {}

  // TODO(seminar): 후속 커밋에서 구현
  async getWeekly() {
    return null;
  }

  // TODO(seminar): 후속 커밋에서 구현
  async getList() {
    return null;
  }

  // TODO(seminar): 후속 커밋에서 구현
  async getDetail(seminarId: number) {
    return { seminarId };
  }
}
