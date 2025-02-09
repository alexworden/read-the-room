import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { Attendee } from '../types/meeting.types';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

@Injectable()
export class AttendeeRepository {
  constructor(private db: DatabaseService) {}

  async createAttendee(meetingId: string, name: string): Promise<Attendee> {
    const meetingResult = await this.db.query(
      'SELECT id FROM meetings WHERE id = $1',
      [meetingId]
    );

    if (meetingResult.rows.length === 0) {
      throw new Error(`Meeting with ID ${meetingId} not found`);
    }

    const id = uuidv4();
    const result = await this.db.query<Attendee>(
      'INSERT INTO attendees (id, name, meeting_id) VALUES ($1, $2, $3) RETURNING *',
      [id, name, meetingId]
    );
    return result.rows[0];
  }

  async getAttendee(id: string): Promise<Attendee | null> {
    if (!isUUID(id)) {
      throw new Error(`Invalid attendee ID format: ${id}`);
    }

    const result = await this.db.query<Attendee>(
      'SELECT * FROM attendees WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async updateAttendeeStatus(id: string, status: string): Promise<void> {
    if (!isUUID(id)) {
      throw new Error(`Invalid attendee ID format: ${id}`);
    }

    const result = await this.db.query(
      'UPDATE attendees SET current_status = $1, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    if (result.rowCount === 0) {
      throw new Error(`Attendee with ID ${id} not found`);
    }
  }

  async deleteAttendee(id: string): Promise<void> {
    await this.db.query('DELETE FROM attendees WHERE id = $1', [id]);
  }

  async getMeetingAttendees(meetingId: string): Promise<Attendee[]> {
    const result = await this.db.query<Attendee>(
      'SELECT * FROM attendees WHERE meeting_id = $1',
      [meetingId]
    );
    return result.rows;
  }
}
