import { Test, TestingModule } from '@nestjs/testing';
import { MeetingService } from './meeting.service';
import { MeetingStateService } from './meeting-state.service';
import { EventsService } from './events.service';
import { Meeting, AttendeeStatus } from '../models/meeting.model';

class EventsServiceStub {
  emitTranscription() {}
  emitStats() {}
}

describe('MeetingService', () => {
  let module: TestingModule;
  let service: MeetingService;
  let stateService: MeetingStateService;
  let eventsService: EventsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        MeetingService, 
        MeetingStateService,
        {
          provide: EventsService,
          useClass: EventsServiceStub,
        },
      ],
    }).compile();

    service = module.get<MeetingService>(MeetingService);
    stateService = module.get<MeetingStateService>(MeetingStateService);
    eventsService = module.get<EventsService>(EventsService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMeeting', () => {
    it('should create a meeting with correct initial state', () => {
      const title = 'Test Meeting';
      const meeting = service.createMeeting(title);

      expect(meeting).toBeDefined();
      expect(meeting.id).toBeDefined();
      expect(meeting.title).toBe(title);
      expect(meeting.attendees).toEqual([]);
      expect(meeting.transcription).toEqual([]);
      expect(new Date(meeting.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
      expect(new Date(meeting.updatedAt).getTime()).toBeLessThanOrEqual(Date.now());

      // Verify meeting is stored in state service
      const storedMeeting = stateService.getMeeting(meeting.id);
      expect(storedMeeting).toEqual(meeting);
    });
  });

  describe('addAttendee', () => {
    let meeting: Meeting;

    beforeEach(() => {
      meeting = service.createMeeting('Test Meeting');
    });

    it('should add an attendee with correct initial state', () => {
      const name = 'Test Attendee';
      const attendee = service.addAttendee(meeting.id, name);

      expect(attendee).toBeDefined();
      expect(attendee.id).toBeDefined();
      expect(attendee.name).toBe(name);
      expect(attendee.currentStatus).toBe(AttendeeStatus.ENGAGED);
      expect(attendee.statusHistory).toHaveLength(1);
      expect(attendee.statusHistory[0]).toEqual({
        attendeeId: attendee.id,
        status: AttendeeStatus.ENGAGED,
        timestamp: expect.any(String),
        context: 'Initial status'
      });

      // Verify attendee is added to meeting
      const updatedMeeting = stateService.getMeeting(meeting.id);
      expect(updatedMeeting.attendees).toContainEqual(attendee);
    });

    it('should throw error for non-existent meeting', () => {
      expect(() => service.addAttendee('non-existent', 'Test')).toThrow('Meeting not found');
    });
  });

  describe('updateAttendeeStatus', () => {
    let meeting: Meeting;
    let attendee: any;

    beforeEach(() => {
      meeting = service.createMeeting('Test Meeting');
      attendee = service.addAttendee(meeting.id, 'Test Attendee');
    });

    it('should update attendee status and add to history', () => {
      const newStatus = AttendeeStatus.CONFUSED;
      const context = 'Test context';

      service.updateAttendeeStatus(meeting.id, attendee.id, newStatus, context);

      const updatedMeeting = stateService.getMeeting(meeting.id);
      const updatedAttendee = updatedMeeting.attendees[0];

      expect(updatedAttendee.currentStatus).toBe(newStatus);
      expect(updatedAttendee.statusHistory).toHaveLength(2);
      expect(updatedAttendee.statusHistory[1]).toEqual({
        attendeeId: attendee.id,
        status: newStatus,
        timestamp: expect.any(String),
        context
      });
    });

    it('should not update status if same as current', () => {
      service.updateAttendeeStatus(meeting.id, attendee.id, AttendeeStatus.ENGAGED);

      const updatedMeeting = stateService.getMeeting(meeting.id);
      const updatedAttendee = updatedMeeting.attendees[0];

      expect(updatedAttendee.statusHistory).toHaveLength(1);
    });

    it('should throw error for non-existent meeting', () => {
      expect(() => 
        service.updateAttendeeStatus('non-existent', attendee.id, AttendeeStatus.CONFUSED)
      ).toThrow('Meeting not found');
    });

    it('should throw error for non-existent attendee', () => {
      expect(() => 
        service.updateAttendeeStatus(meeting.id, 'non-existent', AttendeeStatus.CONFUSED)
      ).toThrow('Attendee not found');
    });
  });

  describe('addTranscription', () => {
    let meeting: Meeting;

    beforeEach(() => {
      meeting = service.createMeeting('Test Meeting');
    });

    it('should add transcription text to meeting', () => {
      const text = 'Test transcription';
      service.addTranscription(meeting.id, text);

      const updatedMeeting = stateService.getMeeting(meeting.id);
      expect(updatedMeeting.transcription).toContain(text);
    });

    it('should throw error for non-existent meeting', () => {
      expect(() => 
        service.addTranscription('non-existent', 'Test')
      ).toThrow('Meeting not found');
    });
  });
});
