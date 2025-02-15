import { Test, TestingModule } from '@nestjs/testing';
import { MeetingStateService } from './meeting-state.service';
import { Meeting } from '../types/meeting.types';

describe('MeetingStateService', () => {
  let service: MeetingStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeetingStateService],
    }).compile();

    service = module.get<MeetingStateService>(MeetingStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should manage meeting state', () => {
    const now = new Date();
    const meeting: Meeting = {
      meeting_uuid: '123',
      meeting_id: 'ABC-DEF-GHI',
      title: 'Test Meeting',
      qr_code: 'test-qr',
      created_at: now,
      updated_at: now,
      attendees: []
    };

    // Add meeting
    service.addMeeting(meeting);
    expect(service.getMeeting('123')).toEqual(meeting);

    // Update meeting
    const updatedMeeting = { ...meeting, title: 'Updated Meeting' };
    service.updateMeeting(updatedMeeting);
    expect(service.getMeeting('123')).toEqual(updatedMeeting);

    // Remove meeting
    service.removeMeeting('123');
    expect(service.getMeeting('123')).toBeUndefined();
  });
});
