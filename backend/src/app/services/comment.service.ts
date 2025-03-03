import { Injectable } from '@nestjs/common';
import { CommentRepository } from '../repositories/comment.repository';
import { Comment, CommentWithAttendeeName } from '../types/comment.types';

@Injectable()
export class CommentService {
  constructor(private commentRepository: CommentRepository) {}

  async getComments(meetingUuid: string): Promise<CommentWithAttendeeName[]> {
    return this.commentRepository.findByMeetingUuid(meetingUuid);
  }

  async createComment(meetingUuid: string, attendeeId: string, content: string): Promise<CommentWithAttendeeName> {
    const comment = await this.commentRepository.create(meetingUuid, attendeeId, content);
    const attendeeName = await this.commentRepository.findAttendeeNameById(attendeeId);
    
    return {
      ...comment,
      attendee_name: attendeeName || 'Unknown'
    };
  }
}
