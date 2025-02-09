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

  async createMeeting(title: string): Promise<Meeting> {
    return this.meetingRepository.createMeeting(title);
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
    const qrCode = await QRCode.toDataURL(meetingId);
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
