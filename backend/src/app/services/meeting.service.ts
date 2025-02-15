import { Injectable, Logger } from '@nestjs/common';
import { MeetingRepository } from '../repositories/meeting.repository';
import { Meeting, Attendee, StatusUpdate, MeetingStats } from '../types/meeting.types';
import { QRService } from './qr.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MeetingService {
  private readonly logger: Logger;

  constructor(
    private readonly meetingRepository: MeetingRepository,
    private readonly qrService: QRService,
  ) {
    this.logger = new Logger(MeetingService.name);
  }

  async createMeeting(title: string): Promise<Meeting> {
    const meetingUuid = uuidv4();
    const meetingId = this.generateMeetingId();
    const meeting = await this.meetingRepository.createMeeting(title, meetingUuid, meetingId);
    const qrCode = await this.qrService.generateQRCode(meetingId);
    await this.meetingRepository.updateMeetingQrCode(meetingId, qrCode);
    return this.getMeeting(meetingId);
  }

  async getMeeting(meetingId: string): Promise<Meeting | null> {
    return this.meetingRepository.getMeeting(meetingId);
  }

  async addAttendee(meetingId: string, name: string): Promise<Attendee> {
    return this.meetingRepository.addAttendee(meetingId, name);
  }

  async getAttendee(attendeeId: string): Promise<Attendee & { currentStatus?: string }> {
    return this.meetingRepository.getAttendee(attendeeId);
  }

  async getMeetingAttendees(meetingId: string): Promise<Attendee[]> {
    return this.meetingRepository.getMeetingAttendees(meetingId);
  }

  async updateAttendeeStatus(attendeeId: string, meetingId: string, status: string): Promise<void> {
    this.logger.log(`Updating attendee status in service - Meeting: ${meetingId}, Attendee: ${attendeeId}, Status: ${status}`);
    
    try {
      // Update current status
      this.logger.log('Updating current status in database...');
      await this.meetingRepository.updateAttendeeStatus(attendeeId, meetingId, status);
      
      // Record status update
      this.logger.log('Recording status update history...');
      await this.meetingRepository.addStatusUpdate(attendeeId, meetingId, status);
      
      this.logger.log('Status update completed successfully');
    } catch (error) {
      this.logger.error('Error updating attendee status:', error);
      throw error;
    }
  }

  async updateAttendeeHeartbeat(attendeeId: string, meetingId: string): Promise<void> {
    await this.meetingRepository.updateAttendeeHeartbeat(attendeeId, meetingId);
  }

  async updateMeetingQrCode(meetingId: string, qrCode: string): Promise<void> {
    await this.meetingRepository.updateMeetingQrCode(meetingId, qrCode);
  }

  async generateQRCode(meetingId: string): Promise<string> {
    return this.qrService.generateQRCode(meetingId);
  }

  async getMeetingStats(meetingId: string): Promise<Record<string, number>> {
    this.logger.log(`Fetching stats for meeting ${meetingId}`);
    try {
      const attendees = await this.meetingRepository.getAttendees(meetingId);
      const stats = {
        total: attendees.length,
        engaged: attendees.filter(a => a.currentStatus === 'engaged').length,
        confused: attendees.filter(a => a.currentStatus === 'confused').length,
        idea: attendees.filter(a => a.currentStatus === 'idea').length,
        disagree: attendees.filter(a => a.currentStatus === 'disagree').length
      };
      this.logger.log(`Retrieved stats for meeting ${meetingId}:`, stats);
      return stats;
    } catch (error) {
      this.logger.error(`Error fetching stats for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  async getAttendeeStatusHistory(attendeeId: string, meetingId: string): Promise<StatusUpdate[]> {
    return this.meetingRepository.getStatusHistory(attendeeId, meetingId);
  }

  private generateSection(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let section = '';
    for (let i = 0; i < 3; i++) {
      section += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return section;
  }

  private generateMeetingId(): string {
    return `${this.generateSection()}-${this.generateSection()}-${this.generateSection()}`;
  }
}
