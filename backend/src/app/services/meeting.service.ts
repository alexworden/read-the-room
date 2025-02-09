import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Meeting, Attendee, AttendeeStatus, StatusUpdate } from '../types/meeting.types';
import { MeetingStateService } from './meeting-state.service';
import { EventsService } from './events.service';
import { v4 as uuidv4 } from 'uuid';

const ATTENDEE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class MeetingService implements OnModuleDestroy {
  private timeoutInterval: NodeJS.Timeout;

  constructor(
    private readonly eventsService: EventsService,
    private readonly meetingStateService: MeetingStateService
  ) {
    // Start the timeout checker
    this.timeoutInterval = setInterval(() => this.checkTimeouts(), 15000); // Check every 15 seconds
  }

  onModuleDestroy() {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
    }
  }

  private checkTimeouts(): void {
    const now = new Date();
    // Check timeouts and remove inactive attendees
    const meetings = Array.from(this.meetingStateService.getMeetings().values());
    meetings.forEach(meeting => {
      let hasTimeouts = false;
      meeting.attendees.forEach(attendee => {
        if (attendee.lastSeen && now.getTime() - attendee.lastSeen.getTime() > ATTENDEE_TIMEOUT_MS) {
          this.meetingStateService.removeAttendee(meeting.id, attendee.id);
          hasTimeouts = true;
        }
      });
      if (hasTimeouts) {
        this.broadcastStats(meeting.id);
      }
    });
  }

  createMeeting(title: string): Meeting {
    const now = new Date().toISOString();
    const meeting: Meeting = {
      id: uuidv4(),
      title,
      createdAt: now,
      updatedAt: now,
      transcription: [],
      attendees: [],
    };

    this.meetingStateService.createMeeting(meeting);
    return meeting;
  }

  getMeeting(meetingId: string): Meeting | undefined {
    return this.meetingStateService.getMeeting(meetingId);
  }

  addTranscription(meetingId: string, text: string): void {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    meeting.transcription.push(text);
    this.eventsService.onTranscriptionReceived(meetingId, text);
  }

  addAttendee(meetingId: string, name: string): Attendee {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const now = new Date();
    const attendee: Attendee = {
      id: uuidv4(),
      name,
      currentStatus: AttendeeStatus.ENGAGED,
      statusHistory: [{
        status: AttendeeStatus.ENGAGED,
        timestamp: now,
      }],
      lastSeen: now,
    };

    meeting.attendees.push(attendee);
    this.meetingStateService.updateMeeting(meetingId, meeting);
    this.broadcastStats(meetingId);
    return attendee;
  }

  updateAttendeeStatus(meetingId: string, attendeeId: string, status: AttendeeStatus): void {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const attendee = meeting.attendees.find(a => a.id === attendeeId);
    if (!attendee) {
      throw new Error('Attendee not found');
    }

    if (attendee.currentStatus !== status) {
      attendee.currentStatus = status;
      attendee.statusHistory.push({
        status,
        timestamp: new Date(),
      });

      // Calculate and broadcast updated stats
      const stats = this.calculateMeetingStats(meeting);
      this.eventsService.onStatsUpdated(meetingId, stats);
    }
  }

  private calculateMeetingStats(meeting: Meeting): Record<string, number> {
    const stats = {
      total: meeting.attendees.length,
      engaged: meeting.attendees.filter(a => a.currentStatus === AttendeeStatus.ENGAGED).length,
      confused: meeting.attendees.filter(a => a.currentStatus === AttendeeStatus.CONFUSED).length,
      idea: meeting.attendees.filter(a => a.currentStatus === AttendeeStatus.IDEA).length,
      disagree: meeting.attendees.filter(a => a.currentStatus === AttendeeStatus.DISAGREE).length,
    };

    return stats;
  }

  getMeetingStats(meetingId: string): Record<string, number> {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    return this.calculateMeetingStats(meeting);
  }

  private broadcastStats(meetingId: string): void {
    const meeting = this.meetingStateService.getMeeting(meetingId);
    if (!meeting) return;

    const stats = this.calculateMeetingStats(meeting);

    // Broadcast stats to all clients in the meeting
    this.eventsService.onStatsUpdated(meetingId, stats);
  }
}
