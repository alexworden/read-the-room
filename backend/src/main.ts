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

  // Debug environment variables
  Logger.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    RTR_API_HOST: process.env.RTR_API_HOST,
    RTR_API_PORT: process.env.RTR_API_PORT,
    RTR_API_PROTOCOL: process.env.RTR_API_PROTOCOL,
    RTR_WEB_HOST: process.env.RTR_WEB_HOST,
    RTR_WEB_PROTOCOL: process.env.RTR_WEB_PROTOCOL,
  });

  Logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.log(`Frontend URL: ${config.webUrl}`);
  Logger.log(`API Host: ${process.env.RTR_API_HOST || 'localhost'}`);

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
  const port = parseInt(process.env.PORT || '80', 10);
  Logger.log(`PORT env var: ${process.env.PORT}`);
  Logger.log(`Binding to ${host}:${port}`);
  await app.listen(port, host);
  
  // In production, use Railway's domain
  const apiHost = process.env.RTR_API_HOST;
  if (process.env.NODE_ENV === 'production' && !apiHost) {
    Logger.warn('RTR_API_HOST is not set in production!');
  }
  const url = process.env.NODE_ENV === 'production' && apiHost
    ? `https://${apiHost}`
    : config.apiUrl;
  Logger.log(`🚀 Application is running on: ${url}/api`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
