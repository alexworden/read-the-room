import { Injectable } from '@nestjs/common';
import { Meeting, Attendee, StatusUpdate, MeetingStats, Comment } from '../types/meeting.types';
import { DatabaseService } from '../services/database.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MeetingRepository {
  constructor(private db: DatabaseService) {}

  async createMeeting(title: string, meetingUuid: string, meetingId: string): Promise<Meeting> {
    // Check if meeting_id already exists
    const existingMeeting = await this.db.query<Meeting>(
      'SELECT * FROM meetings WHERE meeting_id = $1',
      [meetingId]
    );
    if (existingMeeting.rows.length > 0) {
      throw new Error('Meeting ID already exists');
    }

    const result = await this.db.query<Meeting>(
      'INSERT INTO meetings (meeting_uuid, meeting_id, title, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [meetingUuid, meetingId, title]
    );
    return result.rows[0];
  }

  async getMeeting(meetingId: string): Promise<Meeting | null> {
    const result = await this.db.query<Meeting>(
      'SELECT * FROM meetings WHERE meeting_id = $1',
      [meetingId]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  async addAttendee(meetingId: string, name: string): Promise<Attendee> {
    // Check if meeting exists
    const meeting = await this.getMeeting(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const attendeeId = uuidv4();
    const result = await this.db.query<Attendee>(
      'INSERT INTO attendees (id, meeting_id, name) VALUES ($1, $2, $3) RETURNING *',
      [attendeeId, meetingId, name]
    );

    // Create initial status
    await this.db.query(
      'INSERT INTO attendee_current_status (attendee_id, meeting_id, status) VALUES ($1, $2, $3)',
      [attendeeId, meetingId, 'engaged']
    );

    return result.rows[0];
  }

  async getAttendee(attendeeId: string): Promise<Attendee & { currentStatus?: string }> {
    const result = await this.db.query<Attendee>(
      'SELECT a.*, acs.status as current_status FROM attendees a LEFT JOIN attendee_current_status acs ON a.id = acs.attendee_id WHERE a.id = $1',
      [attendeeId]
    );
    if (result.rows.length === 0) {
      throw new Error('Attendee not found');
    }
    const attendee = result.rows[0];
    return {
      ...attendee,
      currentStatus: result.rows[0].current_status
    };
  }

  async getAttendees(meetingId: string): Promise<Array<Attendee & { currentStatus: string }>> {
    const result = await this.db.query<Attendee & { current_status: string | null }>(
      'SELECT a.*, acs.status as current_status FROM attendees a LEFT JOIN attendee_current_status acs ON a.id = acs.attendee_id WHERE a.meeting_id = $1',
      [meetingId]
    );
    return result.rows.map(row => ({
      ...row,
      currentStatus: row.current_status === null ? 'engaged' : row.current_status
    }));
  }

  async getMeetingAttendees(meetingId: string): Promise<Attendee[]> {
    const result = await this.db.query<Attendee>(
      'SELECT * FROM attendees WHERE meeting_id = $1',
      [meetingId]
    );
    return result.rows;
  }

  async updateAttendeeStatus(attendeeId: string, meetingId: string, status: string): Promise<void> {
    const lowerStatus = status.toLowerCase();

    await this.db.transaction(async (client) => {
      // Check if attendee exists in this meeting
      const attendee = await client.query(
        'SELECT * FROM attendees WHERE id = $1 AND meeting_id = $2',
        [attendeeId, meetingId]
      );
      if (attendee.rows.length === 0) {
        throw new Error('Attendee not found in meeting');
      }

      // Update or insert status
      const existingStatus = await client.query(
        'SELECT * FROM attendee_current_status WHERE attendee_id = $1 AND meeting_id = $2',
        [attendeeId, meetingId]
      );

      if (existingStatus.rows.length > 0) {
        await client.query(
          'UPDATE attendee_current_status SET status = $1, updated_at = NOW() WHERE attendee_id = $2 AND meeting_id = $3',
          [lowerStatus, attendeeId, meetingId]
        );
      } else {
        await client.query(
          'INSERT INTO attendee_current_status (attendee_id, meeting_id, status) VALUES ($1, $2, $3)',
          [attendeeId, meetingId, lowerStatus]
        );
      }

      // Add status update record
      await client.query(
        'INSERT INTO status_updates (id, attendee_id, meeting_id, status) VALUES ($1, $2, $3, $4)',
        [uuidv4(), attendeeId, meetingId, lowerStatus]
      );
    });
  }

  async updateAttendeeHeartbeat(attendeeId: string, meetingId: string): Promise<void> {
    await this.db.query(
      `UPDATE attendee_current_status 
       SET last_heartbeat = NOW(), updated_at = NOW()
       WHERE attendee_id = $1 AND meeting_id = $2`,
      [attendeeId, meetingId]
    );
  }

  async addStatusUpdate(attendeeId: string, meetingId: string, status: string, context?: string): Promise<void> {
    await this.db.query(
      'INSERT INTO status_updates (id, attendee_id, meeting_id, status, context) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), attendeeId, meetingId, status, context]
    );
  }

  async getStatusHistory(attendeeId: string, meetingId: string): Promise<StatusUpdate[]> {
    const result = await this.db.query<StatusUpdate>(
      'SELECT * FROM status_updates WHERE attendee_id = $1 AND meeting_id = $2 ORDER BY created_at DESC',
      [attendeeId, meetingId]
    );
    return result.rows;
  }

  async updateMeetingQrCode(meetingId: string, qrCode: string): Promise<void> {
    await this.db.query(
      'UPDATE meetings SET qr_code = $1, updated_at = NOW() WHERE meeting_id = $2',
      [qrCode, meetingId]
    );
  }

  async getMeetingStats(meetingId: string): Promise<MeetingStats> {
    const result = await this.db.query(
      `SELECT 
        COUNT(DISTINCT a.id) as total,
        COUNT(DISTINCT CASE WHEN LOWER(acs.status) = 'engaged' THEN a.id END) as engaged,
        COUNT(DISTINCT CASE WHEN LOWER(acs.status) = 'confused' THEN a.id END) as confused,
        COUNT(DISTINCT CASE WHEN LOWER(acs.status) = 'inactive' THEN a.id END) as inactive
      FROM attendees a
      LEFT JOIN attendee_current_status acs ON a.id = acs.attendee_id
      WHERE a.meeting_id = $1`,
      [meetingId]
    );

    const stats = result.rows[0];
    return {
      total: Number(stats.total),
      engaged: Number(stats.engaged),
      confused: Number(stats.confused),
      inactive: Number(stats.inactive)
    };
  }

  async getComments(meetingId: string): Promise<Comment[]> {
    const result = await this.db.query<Comment>(
      'SELECT c.*, a.name as attendee_name FROM comments c JOIN attendees a ON c.attendee_id = a.id WHERE c.meeting_id = $1 ORDER BY c.created_at DESC',
      [meetingId]
    );
    return result.rows;
  }

  async addComment(attendeeId: string, meetingId: string, content: string): Promise<Comment> {
    const commentId = uuidv4();
    const result = await this.db.query<Comment>(
      'INSERT INTO comments (id, attendee_id, meeting_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [commentId, attendeeId, meetingId, content]
    );
    return result.rows[0];
  }
}
