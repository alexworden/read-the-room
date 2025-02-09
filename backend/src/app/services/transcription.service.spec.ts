import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptionService } from './transcription.service';
import { DatabaseService } from './database.service';
import { TestDatabaseService } from './test-database.service';
import { MeetingService } from './meeting.service';
import { MeetingRepository } from '../repositories/meeting.repository';
import { AttendeeRepository } from '../repositories/attendee.repository';
import { TranscriptionRepository } from '../repositories/transcription.repository';
import { Meeting, Attendee, Transcription } from '../types/meeting.types';

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

  describe('processTranscription', () => {
    it('should process transcription and update attendee status', async () => {
      const meeting = await meetingService.createMeeting('Test Meeting');
      const attendee = await meetingService.addAttendee(meeting.id, 'John');

      await service.processTranscription(meeting.id, attendee.id, 'I am confused about this topic');

      // Check that the transcription was saved
      const transcriptions = await meetingService.getTranscriptions(meeting.id);
      expect(transcriptions.length).toBe(1);
      expect(transcriptions[0].text).toBe('I am confused about this topic');
      expect(transcriptions[0].meeting_id).toBe(meeting.id);

      // Check that the attendee status was updated
      const updatedAttendee = await meetingService.getAttendee(attendee.id);
      expect(updatedAttendee?.current_status).toBe('confused');
    });

    it('should handle multiple transcriptions', async () => {
      const meeting = await meetingService.createMeeting('Test Meeting');
      const attendee = await meetingService.addAttendee(meeting.id, 'John');

      await service.processTranscription(meeting.id, attendee.id, 'I am confused about this');
      await service.processTranscription(meeting.id, attendee.id, 'I have an idea about this');
      await service.processTranscription(meeting.id, attendee.id, 'I disagree with that');

      // Check that all transcriptions were saved
      const transcriptions = await meetingService.getTranscriptions(meeting.id);
      expect(transcriptions.length).toBe(3);
      expect(transcriptions[0].text).toBe('I am confused about this');
      expect(transcriptions[1].text).toBe('I have an idea about this');
      expect(transcriptions[2].text).toBe('I disagree with that');

      // Check that the attendee status was updated to the latest
      const updatedAttendee = await meetingService.getAttendee(attendee.id);
      expect(updatedAttendee?.current_status).toBe('disagree');
    });
  });
});
