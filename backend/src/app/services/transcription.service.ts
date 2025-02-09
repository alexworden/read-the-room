import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { MeetingService } from './meeting.service';

@Injectable()
export class TranscriptionService {
  private openai: OpenAI;

  constructor(private meetingService: MeetingService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribeAudio(meetingId: string, audioBuffer: Buffer): Promise<void> {
    try {
      // Create a temporary file from the buffer
      const tempFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav', lastModified: Date.now() });
      
      // Send to OpenAI's API
      const response = await this.openai.audio.transcriptions.create({
        file: tempFile,
        model: 'whisper-1',
      });

      // Update the meeting with the transcription
      const transcription = response.text;
      await this.meetingService.addTranscription(meetingId, transcription);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }
}
