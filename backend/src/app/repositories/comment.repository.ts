import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { Comment, CommentWithAttendeeName, AttendeeResult } from '../types/comment.types';

@Injectable()
export class CommentRepository {
  constructor(private databaseService: DatabaseService) {}

  async findByMeetingUuid(meetingUuid: string): Promise<CommentWithAttendeeName[]> {
    const query = `
      SELECT c.id, c.attendee_id, c.content, c.created_at, a.name as attendee_name
      FROM comments c
      JOIN attendees a ON c.attendee_id = a.id
      WHERE c.meeting_uuid = $1
      ORDER BY c.created_at DESC
    `;
    
    const result = await this.databaseService.query<CommentWithAttendeeName>(query, [meetingUuid]);
    return result.rows;
  }

  async create(meetingUuid: string, attendeeId: string, content: string): Promise<Comment> {
    const query = `
      INSERT INTO comments (meeting_uuid, attendee_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, attendee_id, content, created_at
    `;
    
    const result = await this.databaseService.query<Comment>(query, [meetingUuid, attendeeId, content]);
    return result.rows[0];
  }

  async findAttendeeNameById(attendeeId: string): Promise<string | undefined> {
    const query = `
      SELECT name as attendee_name
      FROM attendees
      WHERE id = $1
    `;
    const result = await this.databaseService.query<AttendeeResult>(query, [attendeeId]);
    return result.rows[0]?.attendee_name;
  }
}
