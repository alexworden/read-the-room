import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MeetingRepository } from '../repositories/meeting.repository';
import { Meeting, Attendee, StatusUpdate, MeetingStats, Comment } from '../types/meeting.types';
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

  private generateMeetingCode(): string {
    // Generate a random 9-character code in XXX-XXX-XXX format
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Generate three groups of three characters
    for (let group = 0; group < 3; group++) {
      for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // Add hyphen between groups, but not after the last group
      if (group < 2) {
        code += '-';
      }
    }
    return code;
  }

  async createMeeting(title: string): Promise<Meeting> {
    try {
      const meetingUuid = uuidv4();
      const meetingCode = this.generateMeetingCode();
      const qrCode = await this.qrService.generateQRCode(meetingCode);
      return await this.meetingRepository.createMeeting(title, meetingUuid, meetingCode, qrCode);
    } catch (error) {
      this.logger.error('Failed to create meeting in service:', error);
      throw error;
    }
  }

  async getMeeting(meetingCode: string): Promise<Meeting | null> {
    return this.meetingRepository.getMeeting(meetingCode);
  }

  async addAttendee(meetingCode: string, name: string): Promise<Attendee> {
    const meeting = await this.getMeeting(meetingCode);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return this.meetingRepository.addAttendee(meeting.meetingUuid, name);
  }

  async getAttendee(attendeeId: string): Promise<Attendee & { currentStatus?: string }> {
    return this.meetingRepository.getAttendee(attendeeId);
  }

  async getMeetingAttendees(meetingUuid: string): Promise<Attendee[]> {
    return this.meetingRepository.getMeetingAttendees(meetingUuid);
  }

  async updateAttendeeStatus(attendeeId: string, meetingUuid: string, status: string): Promise<void> {
    this.logger.log(`Updating attendee status - Meeting: ${meetingUuid}, Attendee: ${attendeeId}, Status: ${status}`);
    await this.meetingRepository.updateAttendeeStatus(attendeeId, meetingUuid, status);
  }

  async updateAttendeeHeartbeat(attendeeId: string, meetingUuid: string): Promise<void> {
    await this.meetingRepository.updateAttendeeHeartbeat(attendeeId, meetingUuid);
  }

  async getMeetingStats(meetingUuid: string): Promise<MeetingStats> {
    return this.meetingRepository.getMeetingStats(meetingUuid);
  }

  async getAttendeeStatusHistory(attendeeId: string, meetingUuid: string): Promise<StatusUpdate[]> {
    return this.meetingRepository.getStatusHistory(attendeeId, meetingUuid);
  }

  async getComments(meetingUuid: string): Promise<Comment[]> {
    return this.meetingRepository.getComments(meetingUuid);
  }

  async addComment(attendeeId: string, meetingUuid: string, content: string): Promise<Comment> {
    return this.meetingRepository.addComment(attendeeId, meetingUuid, content);
  }

  async addReaction(attendeeId: string, meetingUuid: string, type: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 10); // 10 second expiration
    this.logger.log(`Adding reaction - Meeting: ${meetingUuid}, Attendee: ${attendeeId}, Type: ${type}`);
    await this.meetingRepository.addReaction(attendeeId, meetingUuid, type, expiresAt);
  }

  async getReactionCounts(meetingUuid: string): Promise<{ [key: string]: number }> {
    return this.meetingRepository.getActiveReactionCounts(meetingUuid);
  }

  async generateQRCode(meetingCode: string): Promise<string> {
    return this.qrService.generateQRCode(meetingCode);
  }
}
