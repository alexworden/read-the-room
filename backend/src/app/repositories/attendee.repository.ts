import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { Attendee, AttendeeCurrentStatus } from '../types/meeting.types';
import { DbAttendee, DbAttendeeStatus } from './types/database.types';
import { DatabaseMapper } from './mappers/database.mapper';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

@Injectable()
export class AttendeeRepository {
  constructor(private db: DatabaseService) {}

  async createAttendee(name: string): Promise<Attendee> {
    const id = uuidv4();
    const result = await this.db.query<DbAttendee>(
      'INSERT INTO attendees (id, name) VALUES ($1, $2) RETURNING *',
      [id, name]
    );
    return DatabaseMapper.toAttendee(result.rows[0]);
  }

  async addAttendeeToMeeting(attendeeId: string, meeting_uuid: string): Promise<AttendeeCurrentStatus> {
    const meetingExists = await this.db.query(
      'SELECT 1 FROM meetings WHERE meeting_uuid = $1',
      [meeting_uuid]
    );

    if (!meetingExists.rowCount) {
      throw new Error(`Meeting with UUID ${meeting_uuid} not found`);
    }

    const id = uuidv4();
    const result = await this.db.query<DbAttendeeStatus>(
      'INSERT INTO attendee_current_status (id, attendee_id, meeting_uuid, status, last_heartbeat) ' +
      'VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ' +
      'ON CONFLICT (attendee_id, meeting_uuid) DO UPDATE SET last_heartbeat = CURRENT_TIMESTAMP ' +
      'RETURNING *',
      [id, attendeeId, meeting_uuid, 'engaged']
    );

    return DatabaseMapper.toAttendeeCurrentStatus(result.rows[0]);
  }

  async getAttendee(id: string): Promise<Attendee | null> {
    if (!isUUID(id)) {
      throw new Error(`Invalid attendee ID format: ${id}`);
    }

    const result = await this.db.query<DbAttendee>(
      'SELECT * FROM attendees WHERE id = $1',
      [id]
    );
    return result.rows[0] ? DatabaseMapper.toAttendee(result.rows[0]) : null;
  }

  async updateAttendeeStatus(attendeeId: string, meeting_uuid: string, status: string): Promise<void> {
    if (!isUUID(attendeeId)) {
      throw new Error(`Invalid attendee ID format: ${attendeeId}`);
    }

    const result = await this.db.query(
      'UPDATE attendee_current_status ' +
      'SET status = $1, updated_at = CURRENT_TIMESTAMP ' +
      'WHERE attendee_id = $2 AND meeting_uuid = $3',
      [status, attendeeId, meeting_uuid]
    );

    if (result.rowCount === 0) {
      throw new Error(`Attendee ${attendeeId} not found in meeting ${meeting_uuid}`);
    }
  }

  async updateAttendeeHeartbeat(attendeeId: string, meeting_uuid: string): Promise<void> {
    const result = await this.db.query(
      'UPDATE attendee_current_status SET last_heartbeat = CURRENT_TIMESTAMP ' +
      'WHERE attendee_id = $1 AND meeting_uuid = $2',
      [attendeeId, meeting_uuid]
    );

    if (result.rowCount === 0) {
      throw new Error(`Attendee ${attendeeId} not found in meeting ${meeting_uuid}`);
    }
  }

  async getMeetingAttendees(meeting_uuid: string): Promise<(Attendee & { current_status: string })[]> {
    const result = await this.db.query(
      'SELECT a.*, acs.status as current_status ' +
      'FROM attendees a ' +
      'LEFT JOIN attendee_current_status acs ON a.id = acs.attendee_id ' +
      'WHERE acs.meeting_uuid = $1',
      [meeting_uuid]
    );
    return result.rows.map(row => ({ ...DatabaseMapper.toAttendee(row), current_status: row.current_status }));
  }

  async getAttendeeCurrentStatus(attendeeId: string, meeting_uuid: string): Promise<AttendeeCurrentStatus | null> {
    const result = await this.db.query<DbAttendeeStatus>(
      'SELECT * FROM attendee_current_status WHERE attendee_id = $1 AND meeting_uuid = $2',
      [attendeeId, meeting_uuid]
    );
    return result.rows[0] ? DatabaseMapper.toAttendeeCurrentStatus(result.rows[0]) : null;
  }

  async deleteAttendee(id: string): Promise<void> {
    await this.db.query('DELETE FROM attendees WHERE id = $1', [id]);
  }
}
