import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingService } from '../services/meeting.service';
import { Meeting, Attendee, AttendeeStatus } from '../types/meeting.types';
import { TranscriptionService } from '../services/transcription.service';
import { QRService } from '../services/qr.service';

@Controller('meetings')
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly transcriptionService: TranscriptionService,
    private readonly qrService: QRService
  ) {}

  @Post()
  async createMeeting(@Body('title') title: string): Promise<Meeting> {
    try {
      Logger.log(`Received request to create meeting with title: ${title}`);
      Logger.log(`Request body:`, JSON.stringify({ title }));
      
      if (!title) {
        Logger.error('Title is required for creating a meeting');
        throw new BadRequestException('Title is required');
      }
      
      Logger.log(`Creating meeting with title: ${title}`);
      const meeting = this.meetingService.createMeeting(title);
      Logger.log(`Created meeting:`, JSON.stringify(meeting));
      
      Logger.log(`Generating QR code for meeting: ${meeting.id}`);
      const qrCode = await this.qrService.generateMeetingQR(meeting.id);
      Logger.log(`Generated QR code successfully`);
      
      const response = { ...meeting, qrCode };
      Logger.log(`Sending response:`, JSON.stringify(response));
      return response;
    } catch (error) {
      Logger.error(`Error creating meeting:`, {
        error: error.message,
        stack: error.stack,
        title,
      });
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  getMeeting(@Param('id') id: string): Meeting {
    const meeting = this.meetingService.getMeeting(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return meeting;
  }

  @Get(':id/qr')
  getQRCode(@Param('id') id: string) {
    return this.qrService.generateMeetingQR(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') meetingId: string) {
    try {
      return this.meetingService.getMeetingStats(meetingId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post(':id/attendees')
  addAttendee(
    @Param('id') meetingId: string,
    @Body('name') name: string
  ): Attendee {
    try {
      return this.meetingService.addAttendee(meetingId, name);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Put(':id/attendees/:attendeeId/heartbeat')
  updateHeartbeat(
    @Param('id') meetingId: string,
    @Param('attendeeId') attendeeId: string
  ) {
    try {
      this.meetingService.updateAttendeeStatus(
        meetingId,
        attendeeId,
        AttendeeStatus.ENGAGED
      );
      return { success: true };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Put(':id/attendees/:attendeeId/status')
  updateAttendeeStatus(
    @Param('id') meetingId: string,
    @Param('attendeeId') attendeeId: string,
    @Body() body: { status: AttendeeStatus }
  ) {
    try {
      this.meetingService.updateAttendeeStatus(meetingId, attendeeId, body.status);
      return { success: true };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post(':id/transcription')
  addTranscription(
    @Param('id') meetingId: string,
    @Body() transcriptionData: { text: string }
  ) {
    this.meetingService.addTranscription(meetingId, transcriptionData.text);
    return { success: true };
  }

  @Post(':id/audio')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadAudio(
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer }
  ) {
    try {
      await this.transcriptionService.transcribeAudio(id, file.buffer);
      return { message: 'Audio transcribed successfully' };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
