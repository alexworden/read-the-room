import { Injectable, Logger } from '@nestjs/common';
import { CommentRepository } from '../repositories/comment.repository';
import { Comment, CommentWithAttendeeName } from '../types/comment.types';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(private commentRepository: CommentRepository) {}

  async getComments(meetingUuid: string): Promise<CommentWithAttendeeName[]> {
    return this.commentRepository.findByMeetingUuid(meetingUuid);
  }

  async createComment(meetingUuid: string, attendeeId: string, content: string): Promise<CommentWithAttendeeName> {
    this.logger.log(`[Comment] Creating comment in meeting ${meetingUuid}`);
    
    try {
      // First check if attendee exists
      const attendeeName = await this.commentRepository.findAttendeeNameById(attendeeId);
      if (!attendeeName) {
        this.logger.error(`[Comment] Attendee ${attendeeId} not found`);
        throw new Error('Attendee not found');
      }

      const comment = await this.commentRepository.create(meetingUuid, attendeeId, content);
      this.logger.log(`[Comment] Created comment ${comment.id} by ${attendeeName}`);
      
      return {
        ...comment,
        attendee_name: attendeeName
      };
    } catch (error) {
      this.logger.error(`[Comment] Failed to create comment: ${error.message}`);
      throw error;
    }
  }
}
