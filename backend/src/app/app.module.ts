import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeetingController } from './controllers/meeting.controller';
import { MeetingService } from './services/meeting.service';
import { MeetingGateway } from './gateways/meeting.gateway';
import { TranscriptionService } from './services/transcription.service';
import { QRService } from './services/qr.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, MeetingController],
  providers: [
    AppService,
    MeetingService,
    MeetingGateway,
    TranscriptionService,
    QRService,
  ],
})
export class AppModule {}
