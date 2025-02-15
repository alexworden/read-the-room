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
    this.meetings.set(meeting.meeting_uuid, meeting);
    this.heartbeats.set(meeting.meeting_uuid, new Map());
    this.attendees.set(meeting.meeting_uuid, { attendees: new Set() });
  }

  getMeeting(meeting_uuid: string): Meeting | undefined {
    return this.meetings.get(meeting_uuid);
  }

  addMeeting(meeting: Meeting): void {
    this.meetings.set(meeting.meeting_uuid, meeting);
    this.heartbeats.set(meeting.meeting_uuid, new Map());
    this.attendees.set(meeting.meeting_uuid, { attendees: new Set() });
  }

  updateMeeting(meeting: Meeting): void {
    this.meetings.set(meeting.meeting_uuid, meeting);
  }

  removeMeeting(meeting_uuid: string): void {
    this.meetings.delete(meeting_uuid);
    this.heartbeats.delete(meeting_uuid);
    this.attendees.delete(meeting_uuid);
  }

  setLastHeartbeat(meeting_uuid: string, attendeeId: string, timestamp: string): void {
    let meetingHeartbeats = this.heartbeats.get(meeting_uuid);
    if (!meetingHeartbeats) {
      meetingHeartbeats = new Map();
      this.heartbeats.set(meeting_uuid, meetingHeartbeats);
    }
    meetingHeartbeats.set(attendeeId, timestamp);
  }

  getLastHeartbeat(meeting_uuid: string, attendeeId: string): string | undefined {
    return this.heartbeats.get(meeting_uuid)?.get(attendeeId);
  }

  addAttendee(meeting_uuid: string, attendeeId: string): void {
    if (!this.attendees.has(meeting_uuid)) {
      this.attendees.set(meeting_uuid, { attendees: new Set() });
    }
    this.attendees.get(meeting_uuid).attendees.add(attendeeId);
  }

  removeAttendee(meeting_uuid: string, attendeeId: string): void {
    if (this.attendees.has(meeting_uuid)) {
      this.attendees.get(meeting_uuid).attendees.delete(attendeeId);
    }
  }

  getMeetingAttendees(meeting_uuid: string): string[] {
    if (!this.attendees.has(meeting_uuid)) {
      return [];
    }
    return Array.from(this.attendees.get(meeting_uuid).attendees);
  }
}
