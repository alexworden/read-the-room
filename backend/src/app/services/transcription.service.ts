import { Injectable } from '@nestjs/common';
import { Configuration, OpenAIApi } from 'openai';
import { MeetingService } from './meeting.service';

@Injectable()
export class TranscriptionService {
  private openai: OpenAIApi;

  constructor(
    private readonly meetingService: MeetingService
  ) {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async transcribeAudio(meetingId: string, audioBuffer: Buffer): Promise<void> {
    try {
      // Convert audio buffer to a format compatible with OpenAI's API
      const response = await this.openai.createTranscription(
        audioBuffer,
        'whisper-1'
      );

      if (response.data.text) {
        // Add transcription to the meeting
        this.meetingService.addTranscription(meetingId, response.data.text);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }
}
