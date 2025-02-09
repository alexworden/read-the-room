import { Injectable } from '@nestjs/common';
import { MeetingRepository } from '../repositories/meeting.repository';
import { AttendeeRepository } from '../repositories/attendee.repository';
import { TranscriptionRepository } from '../repositories/transcription.repository';
import { Meeting, Attendee, Transcription, MeetingStats, StatusUpdate } from '../types/meeting.types';
import * as QRCode from 'qrcode';

@Injectable()
export class MeetingService {
  constructor(
    private meetingRepository: MeetingRepository,
    private attendeeRepository: AttendeeRepository,
    private transcriptionRepository: TranscriptionRepository,
  ) {}

  private generateShortId(): string {
    // Generate 6 random alphanumeric characters (3-3 format)
    // Note: Database supports up to 12 characters for future extensibility
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Insert hyphen after first 3 characters
    const shortId = `${result.slice(0, 3)}-${result.slice(3)}`;
    if (shortId.length > 12) {
      throw new Error('Meeting ID cannot be longer than 12 characters');
    }
    return shortId;
  }

  async createMeeting(title: string): Promise<Meeting> {
    const shortId = this.generateShortId();
    return await this.meetingRepository.createMeeting(title, shortId);
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    return this.meetingRepository.getMeeting(id);
  }

  async addAttendee(meetingId: string, name: string): Promise<Attendee> {
    return this.attendeeRepository.createAttendee(meetingId, name);
  }

  async getAttendee(id: string): Promise<Attendee | null> {
    return this.attendeeRepository.getAttendee(id);
  }

  async updateAttendeeStatus(attendeeId: string, status: string, context?: string): Promise<void> {
    await this.attendeeRepository.updateAttendeeStatus(attendeeId, status);
    if (context) {
      // Add to status history
      await this.meetingRepository.addStatusUpdate(attendeeId, status, context);
    }
  }

  async getAttendeeStatusHistory(attendeeId: string): Promise<StatusUpdate[]> {
    return this.meetingRepository.getStatusHistory(attendeeId);
  }

  async addTranscription(meetingId: string, text: string): Promise<Transcription> {
    return this.transcriptionRepository.createTranscription(meetingId, text);
  }

  async getTranscriptions(meetingId: string): Promise<Transcription[]> {
    return this.transcriptionRepository.getMeetingTranscriptions(meetingId);
  }

  async getMeetingAttendees(meetingId: string): Promise<Attendee[]> {
    return this.attendeeRepository.getMeetingAttendees(meetingId);
  }

  async generateQRCode(meetingId: string): Promise<string> {
    const joinUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/join/${meetingId}`;
    const qrCode = await QRCode.toDataURL(joinUrl);
    await this.meetingRepository.updateMeetingQrCode(meetingId, qrCode);
    return qrCode;
  }

  async getMeetingStats(meetingId: string): Promise<MeetingStats> {
    const attendees = await this.attendeeRepository.getMeetingAttendees(meetingId);
    const stats = {
      total: attendees.length,
      engaged: 0,
      confused: 0,
      idea: 0,
      disagree: 0,
    };

    for (const attendee of attendees) {
      switch (attendee.current_status?.toLowerCase()) {
        case 'engaged':
          stats.engaged++;
          break;
        case 'confused':
          stats.confused++;
          break;
        case 'idea':
          stats.idea++;
          break;
        case 'disagree':
          stats.disagree++;
          break;
      }
    }

    return stats;
  }
}
