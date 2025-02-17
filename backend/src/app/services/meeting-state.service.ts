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
    this.meetings.set(meeting.meetingUuid, meeting);
    this.heartbeats.set(meeting.meetingUuid, new Map());
    this.attendees.set(meeting.meetingUuid, { attendees: new Set() });
  }

  getMeeting(meetingUuid: string): Meeting | undefined {
    return this.meetings.get(meetingUuid);
  }

  addMeeting(meeting: Meeting): void {
    this.meetings.set(meeting.meetingUuid, meeting);
    this.heartbeats.set(meeting.meetingUuid, new Map());
    this.attendees.set(meeting.meetingUuid, { attendees: new Set() });
  }

  updateMeeting(meeting: Meeting): void {
    this.meetings.set(meeting.meetingUuid, meeting);
    this.heartbeats.set(meeting.meetingUuid, new Map());
    this.attendees.set(meeting.meetingUuid, { attendees: new Set() });
  }

  removeMeeting(meetingUuid: string): void {
    this.meetings.delete(meetingUuid);
    this.heartbeats.delete(meetingUuid);
    this.attendees.delete(meetingUuid);
  }

  setLastHeartbeat(meetingUuid: string, attendeeId: string, timestamp: string): void {
    let meetingHeartbeats = this.heartbeats.get(meetingUuid);
    if (!meetingHeartbeats) {
      meetingHeartbeats = new Map();
      this.heartbeats.set(meetingUuid, meetingHeartbeats);
    }
    meetingHeartbeats.set(attendeeId, timestamp);
  }

  getLastHeartbeat(meetingUuid: string, attendeeId: string): string | undefined {
    return this.heartbeats.get(meetingUuid)?.get(attendeeId);
  }

  addAttendee(meetingUuid: string, attendeeId: string): void {
    const meetingAttendees = this.attendees.get(meetingUuid);
    if (meetingAttendees) {
      meetingAttendees.attendees.add(attendeeId);
    }
  }

  removeAttendee(meetingUuid: string, attendeeId: string): void {
    const meetingAttendees = this.attendees.get(meetingUuid);
    if (meetingAttendees) {
      meetingAttendees.attendees.delete(attendeeId);
    }
  }

  getAttendees(meetingUuid: string): Set<string> | undefined {
    const meetingAttendees = this.attendees.get(meetingUuid);
    return meetingAttendees?.attendees;
  }

  updateHeartbeat(meetingUuid: string, attendeeId: string): void {
    const meetingHeartbeats = this.heartbeats.get(meetingUuid);
    if (meetingHeartbeats) {
      meetingHeartbeats.set(attendeeId, new Date().toISOString());
    }
  }

  getHeartbeat(meetingUuid: string, attendeeId: string): string | undefined {
    const meetingHeartbeats = this.heartbeats.get(meetingUuid);
    return meetingHeartbeats?.get(attendeeId);
  }
}
