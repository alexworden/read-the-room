import { Controller, Get, Post, Put, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingService } from '../services/meeting.service';
import { TranscriptionService } from '../services/transcription.service';
import { QRService } from '../services/qr.service';
import { Meeting, Attendee, MeetingStats } from '../types/meeting.types';

@Controller('meetings')
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly transcriptionService: TranscriptionService,
    private readonly qrService: QRService,
  ) {}

  @Post()
  async createMeeting(@Body('title') title: string): Promise<Meeting> {
    return await this.meetingService.createMeeting(title);
  }

  @Get(':id')
  async getMeeting(@Param('id') id: string): Promise<Meeting> {
    const meeting = await this.meetingService.getMeeting(id);
    if (!meeting) {
      throw new Error(`Meeting with ID ${id} not found`);
    }
    return meeting;
  }

  @Get(':id/qr')
  async getMeetingQR(@Param('id') id: string): Promise<{ qrCode: string }> {
    const qrCode = await this.qrService.generateMeetingQR(id);
    return { qrCode };
  }

  @Get(':id/attendees')
  async getMeetingAttendees(@Param('id') id: string): Promise<Attendee[]> {
    return await this.meetingService.getMeetingAttendees(id);
  }

  @Get(':id/stats')
  async getMeetingStats(@Param('id') id: string): Promise<MeetingStats> {
    return await this.meetingService.getMeetingStats(id);
  }

  @Get(':meetingId/attendees/:attendeeId')
  async getAttendee(
    @Param('meetingId') meetingId: string,
    @Param('attendeeId') attendeeId: string,
  ): Promise<Attendee> {
    const attendee = await this.meetingService.getAttendee(attendeeId);
    if (!attendee || attendee.meeting_id !== meetingId) {
      throw new Error(`Attendee ${attendeeId} not found in meeting ${meetingId}`);
    }
    return attendee;
  }

  @Post(':id/attendees')
  async addAttendee(
    @Param('id') meetingId: string,
    @Body('name') name: string,
  ): Promise<Attendee> {
    return await this.meetingService.addAttendee(meetingId, name);
  }

  @Put(':meetingId/attendees/:attendeeId/status')
  async updateAttendeeStatus(
    @Param('meetingId') meetingId: string,
    @Param('attendeeId') attendeeId: string,
    @Body('status') status: string,
  ): Promise<Attendee> {
    await this.meetingService.updateAttendeeStatus(attendeeId, status);
    return await this.meetingService.getAttendee(attendeeId);
  }

  @Post(':id/transcriptions')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadTranscription(
    @Param('id') meetingId: string,
    @Body('attendeeId') attendeeId: string,
    @Body('text') text: string,
  ): Promise<void> {
    await this.transcriptionService.processTranscription(meetingId, attendeeId, text);
  }
}
