import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().trim().min(1),
    age: z.number().int().positive(),
  });

  it('valid payload를 schema parse 결과로 반환한다', () => {
    const pipe = new ZodValidationPipe(schema);

    expect(pipe.transform({ name: '  mashup  ', age: 1 })).toEqual({
      name: 'mashup',
      age: 1,
    });
  });

  it('invalid payload면 BadRequestException을 던진다', () => {
    const pipe = new ZodValidationPipe(schema);

    try {
      pipe.transform({ name: '', age: -1 });
      fail('Expected BadRequestException to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        fieldErrors: {
          name: expect.any(Array),
          age: expect.any(Array),
        },
      });
    }
  });
});
