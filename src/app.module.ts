import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [DbModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
