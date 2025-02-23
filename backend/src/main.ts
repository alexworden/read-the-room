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

  Logger.log('=== DEBUG START ===');
  // Debug environment variables
  Logger.log('Environment variables:', JSON.stringify({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    RTR_API_HOST: process.env.RTR_API_HOST,
    RTR_API_PORT: process.env.RTR_API_PORT,
    RTR_API_PROTOCOL: process.env.RTR_API_PROTOCOL,
    RTR_WEB_HOST: process.env.RTR_WEB_HOST,
    RTR_WEB_PROTOCOL: process.env.RTR_WEB_PROTOCOL,
  }, null, 2));
  Logger.log('=== DEBUG END ===');

  Logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.log(`Frontend URL: ${config.webUrl}`);
  Logger.log(`API Host: ${process.env.RTR_API_HOST || 'localhost'}`);

  // Configure CORS - more permissive in development
  const corsOptions = process.env.NODE_ENV === 'production' 
    ? {
        origin: config.webUrl,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        preflightContinue: false,
        optionsSuccessStatus: 204,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      }
    : {
        origin: true, // Allow all origins in development
        credentials: true,
      };

  app.enableCors(corsOptions);
  Logger.log(`CORS configured with origin: ${process.env.NODE_ENV === 'production' ? config.webUrl : 'all origins (development)'}`);
  
  app.setGlobalPrefix('api');

  // Enable JSON body parsing
  app.use(json());
  
  // Configure WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  // In production, bind to all network interfaces
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : config.apiHost;
  const port = process.env.NODE_ENV === 'production'
    ? parseInt(process.env.PORT, 10)
    : config.apiPort;

  if (!port) {
    throw new Error('Port is not configured! Set PORT in production or RTR_API_PORT in development.');
  }

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
