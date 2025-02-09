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
      expect(meeting.id).toBeDefined();
      expect(meeting.created_at).toBeDefined();
      expect(meeting.updated_at).toBeDefined();
    });
  });

  describe('addAttendee', () => {
    it('should add an attendee to a meeting', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      const attendee = await service.addAttendee(meeting.id, 'Test Attendee');

      expect(attendee).toBeDefined();
      expect(attendee.name).toBe('Test Attendee');
      expect(attendee.meeting_id).toBe(meeting.id);
      expect(attendee.current_status).toBe('engaged');
    });

    it('should throw error for non-existent meeting', async () => {
      const nonExistentId = uuidv4();
      await expect(service.addAttendee(nonExistentId, 'Test'))
        .rejects
        .toThrow(`Meeting with ID ${nonExistentId} not found`);
    });
  });

  describe('updateAttendeeStatus', () => {
    it('should update attendee status', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      const attendee = await service.addAttendee(meeting.id, 'Test Attendee');
      
      await service.updateAttendeeStatus(attendee.id, 'confused', 'Test context');
      
      const history = await service.getAttendeeStatusHistory(attendee.id);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].status).toBe('confused');
      expect(history[0].context).toBe('Test context');

      const updatedAttendee = await service.getAttendee(attendee.id);
      expect(updatedAttendee?.current_status).toBe('confused');
    });

    it('should throw error for non-existent attendee', async () => {
      const nonExistentId = uuidv4();
      await expect(
        service.updateAttendeeStatus(nonExistentId, 'confused', 'Test context'),
      ).rejects.toThrow(`Attendee with ID ${nonExistentId} not found`);
    });
  });

  describe('getMeetingStats', () => {
    it('should return correct meeting stats', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      
      // Add multiple attendees with different statuses
      const attendee1 = await service.addAttendee(meeting.id, 'Attendee 1');
      const attendee2 = await service.addAttendee(meeting.id, 'Attendee 2');
      const attendee3 = await service.addAttendee(meeting.id, 'Attendee 3');
      
      await service.updateAttendeeStatus(attendee1.id, 'confused');
      await service.updateAttendeeStatus(attendee2.id, 'idea');
      // attendee3 remains engaged
      
      const stats = await service.getMeetingStats(meeting.id);
      
      expect(stats.total).toBe(3);
      expect(stats.engaged).toBe(1);
      expect(stats.confused).toBe(1);
      expect(stats.idea).toBe(1);
      expect(stats.disagree).toBe(0);
    });
  });
});
