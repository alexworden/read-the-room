import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { MeetingService } from './meeting.service';

@Injectable()
export class TranscriptionService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(private readonly meetingService: MeetingService) {
    const apiKey = process.env.READ_THE_ROOM_OPENAI_KEY;
    
    if (!apiKey) {
      const errorMessage = [
        '\n🚫 OpenAI API key not found!',
        '⚠️  Please set the READ_THE_ROOM_OPENAI_KEY environment variable.',
        '',
        '📝 Add this to your ~/.zshrc file:',
        '   export READ_THE_ROOM_OPENAI_KEY=your_openai_api_key_here',
        '',
        '✨ Then reload your shell:',
        '   source ~/.zshrc',
        '',
      ].join('\n');
      
      this.logger.error(errorMessage);
      throw new Error('OpenAI API key not found in environment variables');
    }

    this.openai = new OpenAI({
      apiKey,
    });
    this.logger.log('TranscriptionService initialized with OpenAI configuration');
  }

  async transcribeAudio(meetingId: string, audioBuffer: Buffer): Promise<void> {
    try {
      // Create a temporary file from the buffer
      const tempFile = new File([audioBuffer], 'audio.wav', { 
        type: 'audio/wav', 
        lastModified: Date.now() 
      });

      // Send to OpenAI's API
      const response = await this.openai.audio.transcriptions.create({
        file: tempFile,
        model: 'whisper-1',
      });

      // Update the meeting with the transcription
      const transcription = response.text;
      await this.meetingService.addTranscription(meetingId, transcription);
    } catch (error) {
      this.logger.error('Error transcribing audio:', error.message);
      throw error;
    }
  }
}
