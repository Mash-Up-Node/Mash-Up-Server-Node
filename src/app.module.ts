import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { RedisModule } from './redis/redis.module';
import { SeminarModule } from './seminar/seminar.module';

@Module({
  imports: [DbModule, RedisModule, SeminarModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
