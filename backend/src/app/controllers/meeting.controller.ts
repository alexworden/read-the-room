import { Controller, Get, Post, Put, Body, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { MeetingService } from '../services/meeting.service';
import { Meeting, Attendee, MeetingStats } from '../types/meeting.types';
import { Logger } from '@nestjs/common';

@Controller('meetings')
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
  ) {}

  @Post()
  async createMeeting(@Body() body: { title: string }): Promise<Meeting> {
    try {
      if (!body.title) {
        throw new BadRequestException('Title is required');
      }
      return await this.meetingService.createMeeting(body.title);
    } catch (error) {
      Logger.error('Failed to create meeting:', error);
      throw error;
    }
  }

  @Get(':code')
  async getMeeting(@Param('code') code: string): Promise<Meeting> {
    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return meeting;
  }

  @Get(':code/qr')
  async getMeetingQR(@Param('code') code: string): Promise<{ qrCode: string }> {
    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    if (!meeting.qrCode) {
      throw new BadRequestException('Meeting QR code not found');
    }
    return { qrCode: meeting.qrCode };
  }

  @Post(':code/attendees')
  async addAttendee(
    @Param('code') code: string,
    @Body() body: { name: string },
  ): Promise<Attendee> {
    return await this.meetingService.addAttendee(code, body.name);
  }

  @Put(':code/attendees/:attendeeId/heartbeat')
  async updateAttendeeHeartbeat(
    @Param('code') code: string,
    @Param('attendeeId') attendeeId: string,
  ): Promise<{ success: boolean }> {
    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const attendee = await this.meetingService.getAttendee(attendeeId);
    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    await this.meetingService.updateAttendeeHeartbeat(attendeeId, meeting.meetingUuid);
    return { success: true };
  }

  @Get(':code/stats')
  async getMeetingStats(@Param('code') code: string): Promise<MeetingStats> {
    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return this.meetingService.getMeetingStats(meeting.meetingUuid);
  }

  @Get(':code/attendees')
  async getMeetingAttendees(@Param('code') code: string): Promise<Attendee[]> {
    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return this.meetingService.getMeetingAttendees(meeting.meetingUuid);
  }

  @Get(':code/comments')
  async getMeetingComments(@Param('code') code: string) {
    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return this.meetingService.getComments(meeting.meetingUuid);
  }

  @Post(':code/comments')
  async addComment(
    @Param('code') code: string,
    @Body() body: { attendeeId: string; content: string },
  ) {
    if (!body.attendeeId || !body.content) {
      throw new BadRequestException('AttendeeId and content are required');
    }

    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return this.meetingService.addComment(body.attendeeId, meeting.meetingUuid, body.content);
  }

  @Post(':code/attendees/:attendeeId/reactions')
  async addReaction(
    @Param('code') code: string,
    @Param('attendeeId') attendeeId: string,
    @Body() body: { type: string },
  ) {
    if (!body.type) {
      throw new BadRequestException('Type is required');
    }

    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    await this.meetingService.addReaction(attendeeId, meeting.meetingUuid, body.type);
    return { success: true };
  }

  @Get(':code/reactions')
  async getReactionCounts(@Param('code') code: string) {
    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return this.meetingService.getReactionCounts(meeting.meetingUuid);
  }

  @Put(':code/attendees/:attendeeId/status')
  async updateAttendeeStatus(
    @Param('code') code: string,
    @Param('attendeeId') attendeeId: string,
    @Body() body: { status: string; context?: string },
  ) {
    if (!body.status) {
      throw new BadRequestException('Status is required');
    }

    const meeting = await this.meetingService.getMeeting(code);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    await this.meetingService.updateAttendeeStatus(attendeeId, meeting.meetingUuid, body.status);
    return { success: true };
  }
}
