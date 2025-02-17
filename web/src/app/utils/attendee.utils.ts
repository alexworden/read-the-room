import { Attendee, AttendeeStatus } from '../types/meeting.types';

interface AttendeeData {
  id: string;
  name: string;
  meeting_id: string;
  is_host: boolean;
  created_at: string;
  updated_at: string;
  current_status?: string;
}

export const convertAttendeeData = (attendeeData: AttendeeData): Attendee => {
  return {
    id: attendeeData.id,
    name: attendeeData.name,
    meetingId: attendeeData.meeting_id,
    isHost: attendeeData.is_host,
    createdAt: attendeeData.created_at,
    updatedAt: attendeeData.updated_at,
    currentStatus: (attendeeData.current_status as AttendeeStatus) || AttendeeStatus.ENGAGED
  };
};
