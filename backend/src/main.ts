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

  // Configure CORS - must come before setGlobalPrefix
  const origins = [
    config.webUrl,
    'http://localhost:19000', // Keep this for Expo development
  ];
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  app.setGlobalPrefix('api');

  // Enable JSON body parsing
  app.use(json());
  
  // Configure WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(config.apiPort, config.apiHost);
  
  const url = config.apiUrl;
  Logger.log(`🚀 Application is running on: ${url}/api`);
  Logger.log(`🌐 Allowed origins: ${origins.join(', ')}`);
  Logger.log(`📝 Environment: NODE_ENV=${process.env.NODE_ENV}`);
  Logger.log(`🔒 Web URL Config: RTR_WEB_HOST=${process.env.RTR_WEB_HOST}`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
