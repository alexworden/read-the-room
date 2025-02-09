import { Injectable } from '@nestjs/common';
import { Meeting, Attendee, AttendeeStatus } from '../types/meeting.types';

@Injectable()
export class MeetingStateService {
  private meetings: Map<string, Meeting> = new Map();
  private heartbeats: Map<string, Map<string, Date>> = new Map(); // meetingId -> (attendeeId -> lastHeartbeat)

  createMeeting(meeting: Meeting): void {
    this.meetings.set(meeting.id, meeting);
    this.heartbeats.set(meeting.id, new Map());
  }

  getMeeting(meetingId: string): Meeting | undefined {
    return this.meetings.get(meetingId);
  }

  getMeetings(): Map<string, Meeting> {
    return this.meetings;
  }

  updateMeeting(meetingId: string, meeting: Meeting): void {
    this.meetings.set(meetingId, meeting);
  }

  setLastHeartbeat(meetingId: string, attendeeId: string, timestamp: Date): void {
    if (!this.heartbeats.has(meetingId)) {
      this.heartbeats.set(meetingId, new Map());
    }
    this.heartbeats.get(meetingId)?.set(attendeeId, timestamp);
  }

  getLastHeartbeat(meetingId: string, attendeeId: string): Date | undefined {
    return this.heartbeats.get(meetingId)?.get(attendeeId);
  }

  removeAttendee(meetingId: string, attendeeId: string): void {
    const meeting = this.meetings.get(meetingId);
    if (meeting) {
      meeting.attendees = meeting.attendees.filter(a => a.id !== attendeeId);
      this.meetings.set(meetingId, meeting);
      
      // Clean up heartbeat
      const heartbeats = this.heartbeats.get(meetingId);
      if (heartbeats) {
        heartbeats.delete(attendeeId);
      }
    }
  }

  updateAttendeeHeartbeat(meetingId: string, attendeeId: string) {
    const meeting = this.getMeeting(meetingId);
    if (meeting) {
      const attendee = meeting.attendees.find(a => a.id === attendeeId);
      if (attendee) {
        attendee.lastSeen = new Date();
      }
    }
  }

  broadcastToMeeting(meetingId: string, data: any): void {
    // This will be implemented by the WebSocket gateway
  }
}
