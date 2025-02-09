import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptionService } from './transcription.service';
import { MeetingService } from './meeting.service';
import { DatabaseService } from './database.service';
import { TestDatabaseService } from './test-database.service';
import { MeetingRepository } from '../repositories/meeting.repository';
import { AttendeeRepository } from '../repositories/attendee.repository';
import { TranscriptionRepository } from '../repositories/transcription.repository';

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let meetingService: MeetingService;
  let dbService: TestDatabaseService;

  beforeAll(async () => {
    dbService = new TestDatabaseService();
    await dbService.setupTestDatabase();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        MeetingService,
        MeetingRepository,
        AttendeeRepository,
        TranscriptionRepository,
        {
          provide: DatabaseService,
          useValue: dbService,
        },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
    meetingService = module.get<MeetingService>(MeetingService);
  });

  afterAll(async () => {
    await dbService.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await dbService.query('TRUNCATE meetings, attendees, status_updates, transcriptions CASCADE');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processTranscription', () => {
    it('should process transcription and update attendee status', async () => {
      // Create a meeting and attendee first
      const meeting = await meetingService.createMeeting('Test Meeting');
      const attendee = await meetingService.addAttendee(meeting.id, 'Test Attendee');

      // Process a transcription that should trigger a status update
      await service.processTranscription(meeting.id, attendee.id, 'I am confused about this');

      // Verify transcription was saved
      const transcriptions = await meetingService.getTranscriptions(meeting.id);
      expect(transcriptions.length).toBe(1);
      expect(transcriptions[0].text).toBe('I am confused about this');

      // Verify attendee status was updated
      const updatedAttendee = await meetingService.getAttendee(attendee.id);
      expect(updatedAttendee?.current_status).toBe('confused');
    });

    it('should handle multiple transcriptions', async () => {
      // Create a meeting and attendee first
      const meeting = await meetingService.createMeeting('Test Meeting');
      const attendee = await meetingService.addAttendee(meeting.id, 'Test Attendee');

      // Process multiple transcriptions
      await service.processTranscription(meeting.id, attendee.id, 'I am confused about this');
      await service.processTranscription(meeting.id, attendee.id, 'Now I have an idea!');

      // Verify transcriptions were saved
      const transcriptions = await meetingService.getTranscriptions(meeting.id);
      expect(transcriptions.length).toBe(2);
      expect(transcriptions[0].text).toBe('I am confused about this');
      expect(transcriptions[1].text).toBe('Now I have an idea!');

      // Verify attendee status was updated to the latest
      const updatedAttendee = await meetingService.getAttendee(attendee.id);
      expect(updatedAttendee?.current_status).toBe('idea');
    });
  });
});
