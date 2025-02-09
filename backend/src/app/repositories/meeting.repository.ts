import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { Meeting, Attendee, StatusUpdate, Transcription } from '../types/meeting.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MeetingRepository {
  constructor(private db: DatabaseService) {}

  async createMeeting(title: string): Promise<Meeting> {
    const id = uuidv4();
    const result = await this.db.query<Meeting>(
      'INSERT INTO meetings (id, title) VALUES ($1, $2) RETURNING *',
      [id, title]
    );
    return result.rows[0];
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    const result = await this.db.query<Meeting>(
      'SELECT * FROM meetings WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async addAttendee(meetingId: string, name: string): Promise<Attendee> {
    const id = uuidv4();
    const result = await this.db.query<Attendee>(
      'INSERT INTO attendees (id, meeting_id, name) VALUES ($1, $2, $3) RETURNING *',
      [id, meetingId, name]
    );
    return result.rows[0];
  }

  async updateAttendeeStatus(attendeeId: string, status: string, context?: string): Promise<void> {
    await this.db.transaction(async (client) => {
      // Update attendee status
      await client.query(
        'UPDATE attendees SET current_status = $1, last_seen = NOW() WHERE id = $2',
        [status, attendeeId]
      );

      // Add status update record
      const statusUpdateId = uuidv4();
      await client.query(
        'INSERT INTO status_updates (id, attendee_id, status, context) VALUES ($1, $2, $3, $4)',
        [statusUpdateId, attendeeId, status, context]
      );
    });
  }

  async getAttendeeStatusHistory(attendeeId: string): Promise<StatusUpdate[]> {
    const result = await this.db.query<StatusUpdate>(
      'SELECT * FROM status_updates WHERE attendee_id = $1 ORDER BY created_at DESC',
      [attendeeId]
    );
    return result.rows;
  }

  async addTranscription(meetingId: string, text: string): Promise<Transcription> {
    const id = uuidv4();
    const result = await this.db.query<Transcription>(
      'INSERT INTO transcriptions (id, meeting_id, text) VALUES ($1, $2, $3) RETURNING *',
      [id, meetingId, text]
    );
    return result.rows[0];
  }

  async getTranscriptions(meetingId: string): Promise<Transcription[]> {
    const result = await this.db.query<Transcription>(
      'SELECT * FROM transcriptions WHERE meeting_id = $1 ORDER BY created_at ASC',
      [meetingId]
    );
    return result.rows;
  }

  async getMeetingAttendees(meetingId: string): Promise<Attendee[]> {
    const result = await this.db.query<Attendee>(
      'SELECT * FROM attendees WHERE meeting_id = $1',
      [meetingId]
    );
    return result.rows;
  }

  async updateMeetingQrCode(meetingId: string, qrCode: string): Promise<void> {
    await this.db.query(
      'UPDATE meetings SET qr_code = $1 WHERE id = $2',
      [qrCode, meetingId]
    );
  }

  async getMeetingStats(meetingId: string): Promise<{ total: number; engaged: number; confused: number; idea: number; disagree: number }> {
    const result = await this.db.query<{ status: string; count: string }[]>(`
      SELECT current_status as status, COUNT(*) as count
      FROM attendees
      WHERE meeting_id = $1
      GROUP BY current_status
    `, [meetingId]);

    const stats = {
      total: 0,
      engaged: 0,
      confused: 0,
      idea: 0,
      disagree: 0
    };

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      stats.total += count;
      stats[row.status as keyof typeof stats] = count;
    });

    return stats;
  }

  async addStatusUpdate(attendeeId: string, status: string, context: string): Promise<void> {
    const id = uuidv4();
    await this.db.query(
      'INSERT INTO status_updates (id, attendee_id, status, context) VALUES ($1, $2, $3, $4)',
      [id, attendeeId, status, context]
    );
  }

  async getStatusHistory(attendeeId: string): Promise<StatusUpdate[]> {
    const result = await this.db.query<StatusUpdate>(
      'SELECT * FROM status_updates WHERE attendee_id = $1 ORDER BY created_at DESC',
      [attendeeId]
    );
    return result.rows;
  }
}
