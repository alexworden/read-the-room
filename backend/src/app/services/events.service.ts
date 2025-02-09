import { Injectable } from '@nestjs/common';
import { MeetingGateway } from '../gateways/meeting.gateway';
import { MeetingStats } from '../types/meeting.types';

@Injectable()
export class EventsService {
  constructor(private readonly meetingGateway: MeetingGateway) {}

  emitTranscription(meetingId: string, attendeeId: string, text: string): void {
    this.meetingGateway.server.to(meetingId).emit('transcription', {
      attendeeId,
      text,
    });
  }

  emitMeetingStats(meetingId: string, stats: MeetingStats): void {
    this.meetingGateway.server.to(meetingId).emit('stats', stats);
  }
}
