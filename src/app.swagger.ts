import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function swaggerConfig(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('MashUp Node Server')
    .setDescription('MashUp 서버 Node로 만들기 API 문서입니다.')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    explorer: true, // API 검색
    swaggerOptions: {
      persistAuthorization: true, // 인증 정보 유지 옵션
      displayRequestDuration: true, // try 했을 때 요청 시간 노출
      operationSorter: 'method', // 컨트롤러 정렬
    },
  });
}
