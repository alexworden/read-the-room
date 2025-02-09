import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { Transcription } from '../types/meeting.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TranscriptionRepository {
  constructor(private db: DatabaseService) {}

  async createTranscription(meetingId: string, text: string): Promise<Transcription> {
    const id = uuidv4();
    const result = await this.db.query<Transcription>(
      'INSERT INTO transcriptions (id, meeting_id, text) VALUES ($1, $2, $3) RETURNING *',
      [id, meetingId, text]
    );
    return result.rows[0];
  }

  async getTranscription(id: string): Promise<Transcription | null> {
    const result = await this.db.query<Transcription>(
      'SELECT * FROM transcriptions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getMeetingTranscriptions(meetingId: string): Promise<Transcription[]> {
    const result = await this.db.query<Transcription>(
      'SELECT * FROM transcriptions WHERE meeting_id = $1 ORDER BY created_at ASC',
      [meetingId]
    );
    return result.rows;
  }

  async deleteTranscription(id: string): Promise<void> {
    await this.db.query('DELETE FROM transcriptions WHERE id = $1', [id]);
  }
}
