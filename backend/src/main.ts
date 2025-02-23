/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { AppModule } from './app/app.module';
import { config } from './app/config';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS
  app.enableCors();
  
  app.setGlobalPrefix('api');

  // Enable JSON body parsing
  app.use(json());
  
  // Configure WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(config.apiPort, config.apiHost);
  
  const url = config.apiUrl;
  Logger.log(`🚀 Application is running on: ${url}/api`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
