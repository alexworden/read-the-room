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

  Logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.log(`Frontend URL: ${config.webUrl}`);

  // Configure CORS
  app.enableCors({
    origin: config.webUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  Logger.log(`CORS enabled with origin: ${config.webUrl}`);
  
  app.setGlobalPrefix('api');

  // Enable JSON body parsing
  app.use(json());
  
  // Configure WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  // In production, bind to all network interfaces
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : config.apiHost;
  const port = config.apiPort;
  Logger.log(`Binding to ${host}:${port}`);
  await app.listen(port, host);
  
  const url = process.env.NODE_ENV === 'production'
    ? `https://${process.env.RTR_API_HOST}`
    : config.apiUrl;
  Logger.log(`🚀 Application is running on: ${url}/api`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
