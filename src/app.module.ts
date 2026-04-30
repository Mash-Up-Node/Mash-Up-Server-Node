import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DanggnsModule } from './danggn/danggns.module';
import { DbModule } from './db/db.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [DbModule, RedisModule, DanggnsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
