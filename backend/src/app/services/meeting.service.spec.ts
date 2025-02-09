import { Test, TestingModule } from '@nestjs/testing';
import { MeetingService } from './meeting.service';
import { DatabaseService } from './database.service';
import { TestDatabaseService } from './test-database.service';
import { MeetingRepository } from '../repositories/meeting.repository';
import { AttendeeRepository } from '../repositories/attendee.repository';
import { TranscriptionRepository } from '../repositories/transcription.repository';
import { Meeting, Attendee, StatusUpdate } from '../types/meeting.types';
import { v4 as uuidv4 } from 'uuid';

describe('MeetingService', () => {
  let service: MeetingService;
  let dbService: TestDatabaseService;

  beforeAll(async () => {
    dbService = new TestDatabaseService();
    await dbService.setupTestDatabase();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
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

    service = module.get<MeetingService>(MeetingService);
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

  describe('createMeeting', () => {
    it('should create a meeting', async () => {
      const title = 'Test Meeting';
      const meeting = await service.createMeeting(title);

      expect(meeting).toBeDefined();
      expect(meeting.title).toBe(title);
      expect(meeting.id).toMatch(/^[a-z0-9]{3}-[a-z0-9]{3}$/);
    });
  });

  describe('addAttendee', () => {
    it('should add an attendee to a meeting', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      const name = 'John Doe';

      const attendee = await service.addAttendee(meeting.id, name);

      expect(attendee).toBeDefined();
      expect(attendee.name).toBe(name);
      expect(attendee.meeting_id).toBe(meeting.id);
    });

    it('should throw error if meeting does not exist', async () => {
      const nonExistentId = 'xxx-yyy';
      await expect(service.addAttendee(nonExistentId, 'John Doe')).rejects.toThrow();
    });
  });

  describe('updateAttendeeStatus', () => {
    it('should update attendee status', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      const attendee = await service.addAttendee(meeting.id, 'John Doe');
      const newStatus = 'confused';

      await service.updateAttendeeStatus(attendee.id, newStatus);

      const updatedAttendee = await service.getAttendee(attendee.id);
      expect(updatedAttendee?.current_status).toBe(newStatus);
    });
  });

  describe('getMeetingStats', () => {
    it('should return correct meeting stats', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      await service.addAttendee(meeting.id, 'John');
      await service.addAttendee(meeting.id, 'Jane');
      await service.addAttendee(meeting.id, 'Bob');

      const stats = await service.getMeetingStats(meeting.id);

      expect(stats).toBeDefined();
      expect(stats.total).toBe(3);
      expect(stats.engaged).toBe(3);
      expect(stats.confused).toBe(0);
      expect(stats.idea).toBe(0);
      expect(stats.disagree).toBe(0);
    });
  });
});
