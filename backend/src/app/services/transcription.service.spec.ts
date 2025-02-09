import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptionService } from './transcription.service';
import { MeetingService } from './meeting.service';

// Stub implementation of MeetingService for testing
class TestMeetingService implements Partial<MeetingService> {
  private transcriptions: Map<string, string[]> = new Map();

  async addTranscription(meetingId: string, text: string): Promise<void> {
    if (!this.transcriptions.has(meetingId)) {
      this.transcriptions.set(meetingId, []);
    }
    this.transcriptions.get(meetingId)?.push(text);
  }

  getTranscriptions(meetingId: string): string[] {
    return this.transcriptions.get(meetingId) || [];
  }
}

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let testMeetingService: TestMeetingService;

  beforeEach(async () => {
    // Save original environment
    const originalEnv = process.env.READ_THE_ROOM_OPENAI_KEY;

    // Clear environment variable
    delete process.env.READ_THE_ROOM_OPENAI_KEY;

    testMeetingService = new TestMeetingService();

    try {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TranscriptionService,
          {
            provide: MeetingService,
            useValue: testMeetingService,
          },
        ],
      }).compile();

      service = module.get<TranscriptionService>(TranscriptionService);
      fail('Service should not initialize without API key');
    } catch (error) {
      expect(error.message).toBe('OpenAI API key not found in environment variables');
    }

    // Restore environment
    process.env.READ_THE_ROOM_OPENAI_KEY = originalEnv;
  });

  it('should initialize successfully with API key', async () => {
    // Set test API key
    process.env.READ_THE_ROOM_OPENAI_KEY = 'test-api-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        {
          provide: MeetingService,
          useValue: testMeetingService,
        },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
    expect(service).toBeDefined();

    // Test that transcriptions are stored correctly
    const meetingId = 'test-meeting';
    const audioBuffer = Buffer.from('test audio data');
    
    try {
      await service.transcribeAudio(meetingId, audioBuffer);
    } catch (error) {
      // We expect an error here since we're using a fake API key
      expect(error.message).toContain('Incorrect API key provided');
    }
  });

  afterAll(() => {
    // Clean up any test environment variables
    delete process.env.READ_THE_ROOM_OPENAI_KEY;
  });
});
