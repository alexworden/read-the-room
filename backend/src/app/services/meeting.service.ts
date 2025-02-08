import { Injectable } from '@nestjs/common';
import { Meeting, Attendee, AttendeeStatus, StatusUpdate } from '../models/meeting.model';
import { MeetingGateway } from '../gateways/meeting.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MeetingService {
  private meetings: Map<string, Meeting> = new Map();

  constructor(private readonly meetingGateway: MeetingGateway) {}

  createMeeting(title: string): Meeting {
    const meeting: Meeting = {
      id: uuidv4(),
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      transcription: [],
      attendees: []
    };

    this.meetings.set(meeting.id, meeting);
    return meeting;
  }

  getMeeting(id: string): Meeting | undefined {
    return this.meetings.get(id);
  }

  addAttendee(meetingId: string, name: string): Attendee {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const attendee: Attendee = {
      id: uuidv4(),
      name,
      currentStatus: AttendeeStatus.ENGAGED,
      statusHistory: []
    };

    meeting.attendees.push(attendee);
    this.meetings.set(meetingId, meeting);
    
    // Broadcast updated stats
    this.broadcastStats(meetingId);
    
    return attendee;
  }

  updateAttendeeStatus(
    meetingId: string,
    attendeeId: string,
    status: AttendeeStatus,
    context: string
  ): StatusUpdate {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const attendee = meeting.attendees.find(a => a.id === attendeeId);
    if (!attendee) {
      throw new Error('Attendee not found');
    }

    const statusUpdate: StatusUpdate = {
      status,
      timestamp: new Date(),
      context
    };

    attendee.statusHistory.push(statusUpdate);
    attendee.currentStatus = status;
    this.meetings.set(meetingId, meeting);

    // Broadcast updated stats
    this.broadcastStats(meetingId);

    return statusUpdate;
  }

  addTranscription(meetingId: string, text: string): void {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    meeting.transcription.push(text);
    meeting.updatedAt = new Date();
    this.meetings.set(meetingId, meeting);

    // Broadcast transcription update
    this.meetingGateway.broadcastTranscription(meetingId, text);
  }

  private broadcastStats(meetingId: string): void {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      return;
    }

    const stats = Object.values(AttendeeStatus).reduce(
      (acc, status) => {
        acc[status] = meeting.attendees.filter(a => a.currentStatus === status).length;
        return acc;
      },
      {} as Record<AttendeeStatus, number>
    );

    this.meetingGateway.broadcastStats(meetingId, stats);
  }
}
