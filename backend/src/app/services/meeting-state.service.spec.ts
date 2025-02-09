import { Test, TestingModule } from '@nestjs/testing';
import { MeetingStateService } from './meeting-state.service';
import { Meeting } from '../types/meeting.types';

describe('MeetingStateService', () => {
  let service: MeetingStateService;
  let testMeeting: Meeting;
  const now = new Date();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeetingStateService],
    }).compile();

    service = module.get<MeetingStateService>(MeetingStateService);

    // Create a test meeting
    testMeeting = {
      id: 'test-meeting-id',
      title: 'Test Meeting',
      created_at: now,
      updated_at: now,
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMeeting', () => {
    it('should create a meeting and initialize heartbeats', () => {
      service.createMeeting(testMeeting);
      
      const storedMeeting = service.getMeeting(testMeeting.id);
      expect(storedMeeting).toEqual(testMeeting);
      
      // Test that heartbeats map is initialized
      const heartbeat = service.getLastHeartbeat(testMeeting.id, 'any-id');
      expect(heartbeat).toBeUndefined();
    });
  });

  describe('setLastHeartbeat', () => {
    it('should set heartbeat for attendee', () => {
      service.createMeeting(testMeeting);
      
      const attendeeId = 'test-attendee';
      const timestamp = now.toISOString();
      
      service.setLastHeartbeat(testMeeting.id, attendeeId, timestamp);
      const storedHeartbeat = service.getLastHeartbeat(testMeeting.id, attendeeId);
      expect(storedHeartbeat).toBe(timestamp);
    });

    it('should store heartbeats for multiple attendees', () => {
      service.createMeeting(testMeeting);
      
      const attendee1 = 'attendee-1';
      const attendee2 = 'attendee-2';
      const timestamp1 = now.toISOString();
      const timestamp2 = new Date(now.getTime() + 1000).toISOString(); // 1 second later
      
      service.setLastHeartbeat(testMeeting.id, attendee1, timestamp1);
      service.setLastHeartbeat(testMeeting.id, attendee2, timestamp2);
      
      expect(service.getLastHeartbeat(testMeeting.id, attendee1)).toBe(timestamp1);
      expect(service.getLastHeartbeat(testMeeting.id, attendee2)).toBe(timestamp2);
    });

    it('should update heartbeat for existing attendee', () => {
      service.createMeeting(testMeeting);
      
      const attendeeId = 'test-attendee';
      const timestamp1 = now.toISOString();
      const timestamp2 = new Date(now.getTime() + 1000).toISOString(); // 1 second later
      
      service.setLastHeartbeat(testMeeting.id, attendeeId, timestamp1);
      service.setLastHeartbeat(testMeeting.id, attendeeId, timestamp2);
      
      expect(service.getLastHeartbeat(testMeeting.id, attendeeId)).toBe(timestamp2);
    });
  });

  describe('removeMeeting', () => {
    it('should remove meeting and its heartbeats', () => {
      service.createMeeting(testMeeting);
      
      const attendeeId = 'test-attendee';
      const timestamp = now.toISOString();
      service.setLastHeartbeat(testMeeting.id, attendeeId, timestamp);
      
      service.removeMeeting(testMeeting.id);
      
      expect(service.getMeeting(testMeeting.id)).toBeUndefined();
      expect(service.getLastHeartbeat(testMeeting.id, attendeeId)).toBeUndefined();
    });
  });
});
