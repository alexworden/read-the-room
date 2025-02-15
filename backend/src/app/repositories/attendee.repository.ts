import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { Attendee, AttendeeCurrentStatus } from '../types/meeting.types';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

@Injectable()
export class AttendeeRepository {
  constructor(private db: DatabaseService) {}

  async createAttendee(name: string): Promise<Attendee> {
    const id = uuidv4();
    const result = await this.db.query<Attendee>(
      'INSERT INTO attendees (id, name) VALUES ($1, $2) RETURNING *',
      [id, name]
    );
    return result.rows[0];
  }

  async addAttendeeToMeeting(attendeeId: string, meetingId: string): Promise<AttendeeCurrentStatus> {
    const meetingResult = await this.db.query(
      'SELECT id FROM meetings WHERE id = $1',
      [meetingId]
    );

    if (meetingResult.rows.length === 0) {
      throw new Error(`Meeting with ID ${meetingId} not found`);
    }

    const id = uuidv4();
    const result = await this.db.query<AttendeeCurrentStatus>(
      'INSERT INTO attendee_current_status (id, attendee_id, meeting_id, status, last_heartbeat) ' +
      'VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ' +
      'ON CONFLICT (attendee_id, meeting_id) DO UPDATE SET last_heartbeat = CURRENT_TIMESTAMP ' +
      'RETURNING *',
      [id, attendeeId, meetingId, 'engaged']
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

  async updateAttendeeStatus(attendeeId: string, meetingId: string, status: string): Promise<void> {
    if (!isUUID(attendeeId)) {
      throw new Error(`Invalid attendee ID format: ${attendeeId}`);
    }

    const result = await this.db.query(
      'UPDATE attendee_current_status SET status = $1, last_heartbeat = CURRENT_TIMESTAMP ' +
      'WHERE attendee_id = $2 AND meeting_id = $3',
      [status, attendeeId, meetingId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Attendee ${attendeeId} not found in meeting ${meetingId}`);
    }
  }

  async updateAttendeeHeartbeat(attendeeId: string, meetingId: string): Promise<void> {
    const result = await this.db.query(
      'UPDATE attendee_current_status SET last_heartbeat = CURRENT_TIMESTAMP ' +
      'WHERE attendee_id = $1 AND meeting_id = $2',
      [attendeeId, meetingId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Attendee ${attendeeId} not found in meeting ${meetingId}`);
    }
  }

  async getMeetingAttendees(meetingId: string): Promise<(Attendee & { current_status: string })[]> {
    const result = await this.db.query(
      'SELECT a.*, acs.status as current_status ' +
      'FROM attendees a ' +
      'JOIN attendee_current_status acs ON a.id = acs.attendee_id ' +
      'WHERE acs.meeting_id = $1',
      [meetingId]
    );
    return result.rows;
  }

  async getAttendeeCurrentStatus(attendeeId: string, meetingId: string): Promise<AttendeeCurrentStatus | null> {
    const result = await this.db.query<AttendeeCurrentStatus>(
      'SELECT * FROM attendee_current_status WHERE attendee_id = $1 AND meeting_id = $2',
      [attendeeId, meetingId]
    );
    return result.rows[0] || null;
  }

  async deleteAttendee(id: string): Promise<void> {
    await this.db.query('DELETE FROM attendees WHERE id = $1', [id]);
  }
}
