import { Controller, Get, Post, Put, Body, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { MeetingService } from '../services/meeting.service';
import { Meeting, Attendee, MeetingStats } from '../types/meeting.types';

@Controller('meetings')
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
  ) {}

  @Post()
  async createMeeting(@Body() body: { title: string }): Promise<Meeting> {
    if (!body.title) {
      throw new BadRequestException('Title is required');
    }
    return this.meetingService.createMeeting(body.title);
  }

  @Get(':id')
  async getMeeting(@Param('id') id: string): Promise<Meeting> {
    const meeting = await this.meetingService.getMeeting(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return meeting;
  }

  @Get(':id/qr')
  async getMeetingQR(@Param('id') id: string): Promise<{ qrCode: string }> {
    const meeting = await this.meetingService.getMeeting(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    if (!meeting.qr_code) {
      // Generate QR code if it doesn't exist
      const qrCode = await this.meetingService.generateQRCode(id);
      await this.meetingService.updateMeetingQrCode(id, qrCode);
      return { qrCode };
    }
    return { qrCode: meeting.qr_code };
  }

  @Post(':id/attendees')
  async addAttendee(
    @Param('id') id: string,
    @Body() body: { name: string },
  ): Promise<Attendee> {
    try {
      return await this.meetingService.addAttendee(id, body.name);
    } catch (error) {
      if (error.message === 'Meeting does not exist') {
        throw new NotFoundException('Meeting not found');
      }
      throw error;
    }
  }

  @Put(':id/attendees/:attendeeId/heartbeat')
  async updateAttendeeHeartbeat(
    @Param('id') id: string,
    @Param('attendeeId') attendeeId: string,
  ): Promise<{ success: boolean }> {
    const meeting = await this.meetingService.getMeeting(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const attendee = await this.meetingService.getAttendee(attendeeId);
    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    await this.meetingService.updateAttendeeHeartbeat(attendeeId, id);
    return { success: true };
  }

  @Get(':id/stats')
  async getMeetingStats(@Param('id') id: string): Promise<MeetingStats> {
    return this.meetingService.getMeetingStats(id);
  }

  @Get(':id/attendees')
  async getMeetingAttendees(@Param('id') id: string) {
    return this.meetingService.getMeetingAttendees(id);
  }

  @Get(':id/comments')
  async getMeetingComments(@Param('id') id: string) {
    return this.meetingService.getComments(id);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body() body: { attendeeId: string; content: string },
  ) {
    if (!body.attendeeId || !body.content) {
      throw new BadRequestException('Attendee ID and content are required');
    }
    return this.meetingService.addComment(body.attendeeId, id, body.content);
  }
}
