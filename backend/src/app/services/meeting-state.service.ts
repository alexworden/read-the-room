import { Injectable } from '@nestjs/common';
import { Meeting } from '../types/meeting.types';

interface MeetingState {
  attendees: Set<string>;
}

@Injectable()
export class MeetingStateService {
  private meetings = new Map<string, Meeting>();
  private heartbeats = new Map<string, Map<string, string>>();
  private attendees = new Map<string, MeetingState>();

  createMeeting(meeting: Meeting): void {
    this.meetings.set(meeting.id, meeting);
    this.heartbeats.set(meeting.id, new Map());
    this.attendees.set(meeting.id, { attendees: new Set() });
  }

  getMeeting(id: string): Meeting | undefined {
    return this.meetings.get(id);
  }

  removeMeeting(id: string): void {
    this.meetings.delete(id);
    this.heartbeats.delete(id);
    this.attendees.delete(id);
  }

  setLastHeartbeat(meetingId: string, attendeeId: string, timestamp: string): void {
    let meetingHeartbeats = this.heartbeats.get(meetingId);
    if (!meetingHeartbeats) {
      meetingHeartbeats = new Map();
      this.heartbeats.set(meetingId, meetingHeartbeats);
    }
    meetingHeartbeats.set(attendeeId, timestamp);
  }

  getLastHeartbeat(meetingId: string, attendeeId: string): string | undefined {
    return this.heartbeats.get(meetingId)?.get(attendeeId);
  }

  addAttendee(meetingId: string, attendeeId: string): void {
    if (!this.attendees.has(meetingId)) {
      this.attendees.set(meetingId, { attendees: new Set() });
    }
    this.attendees.get(meetingId).attendees.add(attendeeId);
  }

  removeAttendee(meetingId: string, attendeeId: string): void {
    if (this.attendees.has(meetingId)) {
      this.attendees.get(meetingId).attendees.delete(attendeeId);
    }
  }

  getMeetingAttendees(meetingId: string): string[] {
    if (!this.attendees.has(meetingId)) {
      return [];
    }
    return Array.from(this.attendees.get(meetingId).attendees);
  }
}
