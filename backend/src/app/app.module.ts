import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeetingController } from './controllers/meeting.controller';
import { MeetingService } from './services/meeting.service';
import { MeetingStateService } from './services/meeting-state.service';
import { DatabaseService } from './services/database.service';
import { MeetingGateway } from './gateways/meeting.gateway';
import { EventsService } from './services/events.service';
import { MeetingRepository } from './repositories/meeting.repository';
import { AttendeeRepository } from './repositories/attendee.repository';
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
    MeetingStateService,
    DatabaseService,
    MeetingGateway,
    EventsService,
    MeetingRepository,
    AttendeeRepository,
    QRService,
  ],
  exports: [MeetingService],
})
export class AppModule {}
