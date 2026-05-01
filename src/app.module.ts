import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { MashongModule } from './mashong/mashong.module';
import { RedisModule } from './redis/redis.module';
import { SeminarModule } from './seminar/seminar.module';

@Module({
  imports: [DbModule, RedisModule, AuthModule, MashongModule, SeminarModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
