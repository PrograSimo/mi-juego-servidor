import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { GameGateway } from './game/game.gateway.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, GameGateway],
})
export class AppModule {}
