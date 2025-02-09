import { Injectable } from '@nestjs/common';
import { MeetingGateway } from '../gateways/meeting.gateway';
import { MeetingStateService } from './meeting-state.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly meetingGateway: MeetingGateway,
    private readonly meetingStateService: MeetingStateService
  ) {}

  onTranscriptionReceived(meetingId: string, text: string) {
    this.meetingGateway.broadcastToMeeting(meetingId, 'transcription', {
      type: 'transcription',
      text,
    });
  }

  onStatsUpdated(meetingId: string, stats: Record<string, number>) {
    this.meetingGateway.broadcastToMeeting(meetingId, 'stats', {
      type: 'stats',
      stats,
    });
  }
}
