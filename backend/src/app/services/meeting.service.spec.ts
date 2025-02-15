import { Test, TestingModule } from '@nestjs/testing';
import { MeetingService } from './meeting.service';
import { DatabaseService } from './database.service';
import { TestDatabaseService } from './test-database.service';
import { MeetingRepository } from '../repositories/meeting.repository';
import { AttendeeRepository } from '../repositories/attendee.repository';
import { Meeting, Attendee, StatusUpdate, AttendeeCurrentStatus } from '../types/meeting.types';
import { v4 as uuidv4 } from 'uuid';
import { QRService } from './qr.service';

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
        QRService,
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
    await dbService.query('TRUNCATE meetings, attendees, attendee_current_status, status_updates CASCADE');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMeeting', () => {
    it('should create a meeting with a unique human-readable ID', async () => {
      const title = 'Test Meeting';
      const meeting = await service.createMeeting(title);

      expect(meeting).toBeDefined();
      expect(meeting.title).toBe(title);
      expect(meeting.meeting_id).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    });

    it('should throw error if meeting ID already exists', async () => {
      const title = 'Test Meeting';
      const meeting = await service.createMeeting(title);
      
      // Mock generateMeetingId to return the same ID
      jest.spyOn(service as any, 'generateMeetingId').mockReturnValue(meeting.meeting_id);
      
      await expect(service.createMeeting(title)).rejects.toThrow('Meeting ID already exists');
    });
  });

  describe('addAttendee', () => {
    it('should add an attendee to a meeting', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      const attendee = await service.addAttendee(meeting.meeting_id, 'John');

      expect(attendee).toBeDefined();
      expect(attendee.name).toBe('John');
      expect(attendee.meeting_id).toBe(meeting.meeting_id);
    });

    it('should throw error if meeting does not exist', async () => {
      await expect(service.addAttendee('non-existent-meeting', 'John'))
        .rejects.toThrow('Meeting not found');
    });
  });

  describe('updateAttendeeStatus', () => {
    it('should update attendee status', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      const attendee = await service.addAttendee(meeting.meeting_id, 'John');

      await service.updateAttendeeStatus(attendee.id, meeting.meeting_id, 'confused');
      const status = await service.getAttendee(attendee.id);
      expect(status?.currentStatus).toBe('confused');
    });

    it('should throw error if attendee not in meeting', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      await expect(service.updateAttendeeStatus('non-existent-attendee', meeting.meeting_id, 'confused'))
        .rejects.toThrow('Attendee not found in meeting');
    });
  });

  describe('getMeetingStats', () => {
    it('should return correct meeting stats', async () => {
      const meeting = await service.createMeeting('Test Meeting');
      await service.addAttendee(meeting.meeting_id, 'John');
      await service.addAttendee(meeting.meeting_id, 'Jane');
      await service.addAttendee(meeting.meeting_id, 'Bob');

      const stats = await service.getMeetingStats(meeting.meeting_id);

      expect(stats).toBeDefined();
      expect(stats.total).toBe(3);
      expect(stats.engaged).toBe(3);
      expect(stats.confused).toBe(0);
      expect(stats.idea).toBe(0);
      expect(stats.disagree).toBe(0);
    });

    it('should update stats correctly when attendee status changes', async () => {
      // Create meeting and add attendee
      const meeting = await service.createMeeting('Test Meeting');
      const attendee = await service.addAttendee(meeting.meeting_id, 'John');

      // Initial stats - should be engaged
      let stats = await service.getMeetingStats(meeting.meeting_id);
      expect(stats.total).toBe(1);
      expect(stats.engaged).toBe(1);
      expect(stats.confused).toBe(0);

      // Update to confused
      await service.updateAttendeeStatus(attendee.id, meeting.meeting_id, 'confused');
      stats = await service.getMeetingStats(meeting.meeting_id);
      expect(stats.total).toBe(1);
      expect(stats.engaged).toBe(0);
      expect(stats.confused).toBe(1);

      // Update back to engaged
      await service.updateAttendeeStatus(attendee.id, meeting.meeting_id, 'engaged');
      stats = await service.getMeetingStats(meeting.meeting_id);
      expect(stats.total).toBe(1);
      expect(stats.engaged).toBe(1);
      expect(stats.confused).toBe(0);
    });
  });
});
