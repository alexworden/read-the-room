import { Test, TestingModule } from '@nestjs/testing';
import { MeetingStateService } from './meeting-state.service';
import { Meeting, AttendeeStatus } from '../models/meeting.model';

describe('MeetingStateService', () => {
  let service: MeetingStateService;
  let testMeeting: Meeting;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeetingStateService],
    }).compile();

    service = module.get<MeetingStateService>(MeetingStateService);

    // Create a test meeting
    testMeeting = {
      id: 'test-meeting-id',
      title: 'Test Meeting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcription: [],
      attendees: [{
        id: 'test-attendee-id',
        name: 'Test Attendee',
        currentStatus: AttendeeStatus.ENGAGED,
        statusHistory: [{
          attendeeId: 'test-attendee-id',
          status: AttendeeStatus.ENGAGED,
          timestamp: new Date().toISOString(),
          context: 'Initial status'
        }]
      }],
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

  describe('getMeetings', () => {
    it('should return all meetings', () => {
      service.createMeeting(testMeeting);
      
      const meetings = service.getMeetings();
      expect(meetings.size).toBe(1);
      expect(meetings.get(testMeeting.id)).toEqual(testMeeting);
    });

    it('should return empty map when no meetings exist', () => {
      const meetings = service.getMeetings();
      expect(meetings.size).toBe(0);
    });
  });

  describe('updateMeeting', () => {
    it('should update an existing meeting', () => {
      service.createMeeting(testMeeting);
      
      const updatedMeeting = {
        ...testMeeting,
        title: 'Updated Title',
      };
      
      service.updateMeeting(testMeeting.id, updatedMeeting);
      const storedMeeting = service.getMeeting(testMeeting.id);
      expect(storedMeeting).toEqual(updatedMeeting);
    });
  });

  describe('heartbeat management', () => {
    it('should track heartbeats for attendees', () => {
      service.createMeeting(testMeeting);
      
      const attendeeId = 'test-attendee';
      const timestamp = new Date();
      
      service.setLastHeartbeat(testMeeting.id, attendeeId, timestamp);
      const storedHeartbeat = service.getLastHeartbeat(testMeeting.id, attendeeId);
      
      expect(storedHeartbeat).toEqual(timestamp);
    });

    it('should handle multiple attendees heartbeats', () => {
      service.createMeeting(testMeeting);
      
      const attendee1 = 'attendee-1';
      const attendee2 = 'attendee-2';
      const timestamp1 = new Date();
      const timestamp2 = new Date(timestamp1.getTime() + 1000); // 1 second later
      
      service.setLastHeartbeat(testMeeting.id, attendee1, timestamp1);
      service.setLastHeartbeat(testMeeting.id, attendee2, timestamp2);
      
      expect(service.getLastHeartbeat(testMeeting.id, attendee1)).toEqual(timestamp1);
      expect(service.getLastHeartbeat(testMeeting.id, attendee2)).toEqual(timestamp2);
    });

    it('should handle non-existent meeting or attendee heartbeats', () => {
      expect(service.getLastHeartbeat('non-existent', 'any-id')).toBeUndefined();
      
      service.createMeeting(testMeeting);
      expect(service.getLastHeartbeat(testMeeting.id, 'non-existent')).toBeUndefined();
    });
  });

  describe('removeAttendee', () => {
    it('should remove attendee and their heartbeat', () => {
      service.createMeeting(testMeeting);
      const attendeeId = testMeeting.attendees[0].id;
      const timestamp = new Date();
      
      // Set a heartbeat
      service.setLastHeartbeat(testMeeting.id, attendeeId, timestamp);
      
      // Remove the attendee
      service.removeAttendee(testMeeting.id, attendeeId);
      
      // Check attendee is removed
      const meeting = service.getMeeting(testMeeting.id);
      expect(meeting.attendees).toHaveLength(0);
      
      // Check heartbeat is removed
      const heartbeat = service.getLastHeartbeat(testMeeting.id, attendeeId);
      expect(heartbeat).toBeUndefined();
    });

    it('should handle non-existent meeting or attendee', () => {
      // Should not throw when meeting doesn't exist
      expect(() => service.removeAttendee('non-existent', 'any-id')).not.toThrow();
      
      service.createMeeting(testMeeting);
      // Should not throw when attendee doesn't exist
      expect(() => service.removeAttendee(testMeeting.id, 'non-existent')).not.toThrow();
    });
  });
});
