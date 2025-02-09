import { Injectable } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import OpenAI from 'openai';

@Injectable()
export class TranscriptionService {
  private openai: OpenAI;

  constructor(
    private meetingService: MeetingService,
  ) {
    const apiKey = process.env.READ_THE_ROOM_OPENAI_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async processTranscription(meetingId: string, attendeeId: string, text: string): Promise<void> {
    // Save the transcription
    await this.meetingService.addTranscription(meetingId, text);

    // Analyze sentiment and update attendee status
    const status = await this.analyzeTranscription(text);
    if (status) {
      await this.meetingService.updateAttendeeStatus(attendeeId, status, text);
    }
  }

  private async analyzeTranscription(text: string): Promise<string | null> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI that analyzes meeting transcriptions to determine the speaker's state. 
            Return ONLY ONE of these states: engaged, confused, idea, disagree. 
            If none apply, return null.
            
            Examples:
            "I have a suggestion" -> idea
            "I don't understand" -> confused
            "I disagree with that approach" -> disagree
            "That makes sense" -> engaged
            "The weather is nice" -> null`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      const result = response.choices[0]?.message?.content?.toLowerCase();
      if (result && ['engaged', 'confused', 'idea', 'disagree'].includes(result)) {
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error analyzing transcription:', error);
      return null;
    }
  }
}
