import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Put,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingService } from '../services/meeting.service';
import { TranscriptionService } from '../services/transcription.service';
import { QRService } from '../services/qr.service';
import { Meeting, Attendee, AttendeeStatus, StatusUpdate } from '../models/meeting.model';

@Controller('api/meetings')
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly transcriptionService: TranscriptionService,
    private readonly qrService: QRService
  ) {}

  @Post()
  async createMeeting(@Body('title') title: string): Promise<Meeting> {
    const meeting = this.meetingService.createMeeting(title);
    const qrCode = await this.qrService.generateMeetingQR(meeting.id);
    return { ...meeting, qrCode };
  }

  @Get(':id')
  getMeeting(@Param('id') id: string): Meeting {
    const meeting = this.meetingService.getMeeting(id);
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    return meeting;
  }

  @Get(':id/qr')
  getQRCode(@Param('id') id: string) {
    return this.qrService.generateMeetingQR(id);
  }

  @Post(':id/attendees')
  addAttendee(
    @Param('id') meetingId: string,
    @Body('name') name: string
  ): Attendee {
    return this.meetingService.addAttendee(meetingId, name);
  }

  @Put(':id/attendees/:attendeeId/status')
  updateAttendeeStatus(
    @Param('id') meetingId: string,
    @Param('attendeeId') attendeeId: string,
    @Body('status') status: AttendeeStatus,
    @Body('context') context: string
  ): StatusUpdate {
    return this.meetingService.updateAttendeeStatus(
      meetingId,
      attendeeId,
      status,
      context
    );
  }

  @Post(':id/transcription')
  addTranscription(
    @Param('id') meetingId: string,
    @Body('text') text: string
  ): void {
    this.meetingService.addTranscription(meetingId, text);
  }

  @Post(':id/audio')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadAudio(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.transcriptionService.transcribeAudio(id, file.buffer);
    return { message: 'Audio transcribed successfully' };
  }
}
