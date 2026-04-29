import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { RedisModule } from './redis/redis.module';
import { DanggnsModule } from './danggn/danggns.module';

@Module({
  imports: [DbModule, RedisModule, DanggnsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
