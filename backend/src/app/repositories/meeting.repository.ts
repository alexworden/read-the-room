import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Meeting, Attendee, StatusUpdate, MeetingStats, Comment } from '../types/meeting.types';
import { DbMeeting, DbAttendee, DbAttendeeStatus, DbComment } from './types/database.types';
import { DatabaseMapper } from './mappers/database.mapper';
import { DatabaseService } from '../services/database.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MeetingRepository {
  constructor(private db: DatabaseService) {}

  async createMeeting(title: string, meetingUuid: string, meetingCode: string, qrCode: string): Promise<Meeting> {
    // Check if meeting code already exists
    const existingMeeting = await this.db.query<{ meeting_code: string }>(
      'SELECT meeting_code FROM meetings WHERE meeting_code = $1',
      [meetingCode]
    );
    if (existingMeeting.rows.length > 0) {
      throw new ConflictException('Meeting code already exists');
    }

    const result = await this.db.query<DbMeeting>(
      'INSERT INTO meetings (meeting_uuid, meeting_code, title, qr_code, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [meetingUuid, meetingCode, title, qrCode]
    );

    return DatabaseMapper.toMeeting(result.rows[0]);
  }

  async getMeeting(meetingCode: string): Promise<Meeting | null> {
    const result = await this.db.query<DbMeeting>(
      'SELECT * FROM meetings WHERE meeting_code = $1',
      [meetingCode]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return DatabaseMapper.toMeeting(result.rows[0]);
  }

  async getMeetingByUuid(meetingUuid: string): Promise<Meeting | null> {
    const result = await this.db.query<DbMeeting>(
      'SELECT * FROM meetings WHERE meeting_uuid = $1',
      [meetingUuid]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return DatabaseMapper.toMeeting(result.rows[0]);
  }

  async addAttendee(meetingUuid: string, name: string): Promise<Attendee> {
    const attendeeId = uuidv4();
    const result = await this.db.query<DbAttendee>(
      'INSERT INTO attendees (id, meeting_uuid, name, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [attendeeId, meetingUuid, name]
    );

    // Create initial status
    await this.db.query(
      'INSERT INTO attendee_current_status (attendee_id, meeting_uuid, status, last_heartbeat, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW(), NOW())',
      [attendeeId, meetingUuid, 'engaged']
    );

    return DatabaseMapper.toAttendee(result.rows[0], 'engaged');
  }

  async getAttendee(attendeeId: string): Promise<Attendee & { currentStatus?: string }> {
    const result = await this.db.query<{
      id: string;
      meeting_uuid: string;
      name: string;
      created_at: Date;
      updated_at: Date;
      current_status?: string;
    }>(
      `SELECT a.*, acs.status as current_status 
       FROM attendees a
       LEFT JOIN attendee_current_status acs ON a.id = acs.attendee_id
       WHERE a.id = $1`,
      [attendeeId]
    );
    if (result.rows.length === 0) {
      return null;
    }
    const attendee = result.rows[0];
    return DatabaseMapper.toAttendeeWithStatus(attendee);
  }

  async getAttendees(meetingUuid: string): Promise<Array<Attendee & { currentStatus: string }>> {
    const result = await this.db.query<{
      id: string;
      meeting_uuid: string;
      name: string;
      created_at: Date;
      updated_at: Date;
      current_status: string;
    }>(
      `SELECT a.*, acs.status as current_status 
       FROM attendees a
       LEFT JOIN attendee_current_status acs ON a.id = acs.attendee_id
       WHERE a.meeting_uuid = $1`,
      [meetingUuid]
    );
    return result.rows.map(row => DatabaseMapper.toAttendeeWithStatus(row));
  }

  async getMeetingAttendees(meetingUuid: string): Promise<Attendee[]> {
    const result = await this.db.query<DbAttendee>(
      'SELECT * FROM attendees WHERE meeting_uuid = $1',
      [meetingUuid]
    );
    return result.rows.map(row => DatabaseMapper.toAttendee(row));
  }

  async updateAttendeeStatus(attendeeId: string, meetingUuid: string, status: string): Promise<void> {
    await this.db.transaction(async (client) => {
      // First check if attendee exists
      const attendee = await client.query(
        'SELECT * FROM attendees WHERE id = $1 AND meeting_uuid = $2',
        [attendeeId, meetingUuid]
      );

      if (attendee.rows.length === 0) {
        throw new NotFoundException('Attendee not found');
      }

      const lowerStatus = status.toLowerCase();

      // Update or insert current status
      const currentStatus = await client.query(
        'SELECT * FROM attendee_current_status WHERE attendee_id = $1 AND meeting_uuid = $2',
        [attendeeId, meetingUuid]
      );

      if (currentStatus.rows.length > 0) {
        await client.query(
          'UPDATE attendee_current_status SET status = $1, updated_at = NOW() WHERE attendee_id = $2 AND meeting_uuid = $3',
          [lowerStatus, attendeeId, meetingUuid]
        );
      } else {
        await client.query(
          'INSERT INTO attendee_current_status (attendee_id, meeting_uuid, status, last_heartbeat, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW(), NOW())',
          [attendeeId, meetingUuid, lowerStatus]
        );
      }

      // Add status update record
      await client.query(
        'INSERT INTO status_updates (id, attendee_id, meeting_uuid, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [uuidv4(), attendeeId, meetingUuid, lowerStatus]
      );
    });
  }

  async updateAttendeeHeartbeat(attendeeId: string, meetingUuid: string): Promise<void> {
    await this.db.query(
      'UPDATE attendee_current_status SET last_heartbeat = NOW(), updated_at = NOW() WHERE attendee_id = $1 AND meeting_uuid = $2',
      [attendeeId, meetingUuid]
    );
  }

  async addStatusUpdate(attendeeId: string, meetingUuid: string, status: string, context?: string): Promise<void> {
    await this.db.query(
      'INSERT INTO status_updates (id, attendee_id, meeting_uuid, status, context, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [uuidv4(), attendeeId, meetingUuid, status, context]
    );
  }

  async getStatusHistory(attendeeId: string, meetingUuid: string): Promise<StatusUpdate[]> {
    const result = await this.db.query<{
      id: string;
      attendee_id: string;
      meeting_uuid: string;
      status: string;
      context?: string;
      created_at: Date;
    }>(
      'SELECT * FROM status_updates WHERE attendee_id = $1 AND meeting_uuid = $2 ORDER BY created_at DESC',
      [attendeeId, meetingUuid]
    );
    return result.rows.map(row => ({
      id: row.id,
      attendeeId: row.attendee_id,
      meetingUuid: row.meeting_uuid,
      status: row.status,
      context: row.context,
      createdAt: row.created_at
    }));
  }

  async getMeetingStats(meetingUuid: string): Promise<MeetingStats> {
    const [statusResult, reactionResult] = await Promise.all([
      this.db.query<{
        total: string;
        engaged: string;
        confused: string;
        inactive: string;
      }>(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN acs.status = 'engaged' OR acs.status IS NULL THEN 1 END) as engaged,
          COUNT(CASE WHEN acs.status = 'confused' THEN 1 END) as confused,
          COUNT(CASE WHEN acs.status = 'inactive' THEN 1 END) as inactive
        FROM attendees a
        LEFT JOIN attendee_current_status acs ON a.id = acs.attendee_id
        WHERE a.meeting_uuid = $1`,
        [meetingUuid]
      ),
      this.db.query<{ type: string; count: string }>(
        `SELECT type, COUNT(*) as count 
         FROM reactions 
         WHERE meeting_uuid = $1 AND expires_at > NOW() 
         GROUP BY type`,
        [meetingUuid]
      )
    ]);

    const stats = statusResult.rows[0];
    const reactionCounts: { [key: string]: number } = {
      agree: 0,
      disagree: 0
    };

    // Update counts for reactions that exist
    reactionResult.rows.forEach(row => {
      reactionCounts[row.type] = parseInt(row.count, 10);
    });

    return {
      total: parseInt(stats.total),
      engaged: parseInt(stats.engaged),
      confused: parseInt(stats.confused),
      inactive: parseInt(stats.inactive),
      agree: reactionCounts.agree,
      disagree: reactionCounts.disagree
    };
  }

  async addComment(attendeeId: string, meetingUuid: string, content: string): Promise<Comment> {
    const result = await this.db.query<DbComment>(
      'INSERT INTO comments (id, attendee_id, meeting_uuid, content, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [uuidv4(), attendeeId, meetingUuid, content]
    );
    const comment = result.rows[0];
    return DatabaseMapper.toComment(comment);
  }

  async getComments(meetingUuid: string): Promise<Comment[]> {
    const result = await this.db.query<DbComment>(
      'SELECT * FROM comments WHERE meeting_uuid = $1 ORDER BY created_at DESC',
      [meetingUuid]
    );
    return result.rows.map(row => DatabaseMapper.toComment(row));
  }

  async addReaction(attendeeId: string, meetingUuid: string, type: string, expiresAt: Date): Promise<void> {
    await this.db.transaction(async (client) => {
      // First check if attendee exists
      const attendee = await client.query(
        'SELECT * FROM attendees WHERE id = $1 AND meeting_uuid = $2',
        [attendeeId, meetingUuid]
      );

      if (attendee.rows.length === 0) {
        throw new NotFoundException('Attendee not found');
      }

      // Cancel any existing reactions of this type
      await client.query(
        'UPDATE reactions SET expires_at = NOW() WHERE attendee_id = $1 AND meeting_uuid = $2 AND type = $3 AND expires_at > NOW()',
        [attendeeId, meetingUuid, type]
      );

      // Cancel opposite reactions
      const oppositeType = type === 'agree' ? 'disagree' : 'agree';
      await client.query(
        'UPDATE reactions SET expires_at = NOW() WHERE attendee_id = $1 AND meeting_uuid = $2 AND type = $3 AND expires_at > NOW()',
        [attendeeId, meetingUuid, oppositeType]
      );

      await client.query(
        'INSERT INTO reactions (id, attendee_id, meeting_uuid, type, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [uuidv4(), attendeeId, meetingUuid, type, expiresAt]
      );
    });
  }

  async getActiveReactionCounts(meetingUuid: string): Promise<{ [key: string]: number }> {
    const result = await this.db.query<{ type: string; count: string }>(
      `SELECT type, COUNT(*) as count 
       FROM reactions 
       WHERE meeting_uuid = $1 AND expires_at > NOW() 
       GROUP BY type`,
      [meetingUuid]
    );
    
    // Initialize all reaction types with 0
    const counts: { [key: string]: number } = {
      agree: 0,
      disagree: 0
    };

    // Update counts for reactions that exist
    result.rows.forEach(row => {
      counts[row.type] = parseInt(row.count, 10);
    });
    return counts;
  }
}
