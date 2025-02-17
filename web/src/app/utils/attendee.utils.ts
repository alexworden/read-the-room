import { Attendee, ATTENDEE_STATUS } from '../types/meeting.types';

interface AttendeeData {
  id: string;
  name: string;
  meetingUuid: string;
  isHost?: boolean;
  createdAt: string;
  updatedAt: string;
  currentStatus?: string;
}

export const convertAttendeeData = (attendeeData: AttendeeData): Attendee => {
  return {
    id: attendeeData.id,
    name: attendeeData.name,
    meetingUuid: attendeeData.meetingUuid,
    isHost: attendeeData.isHost || false,
    createdAt: attendeeData.createdAt,
    updatedAt: attendeeData.updatedAt,
    currentStatus: attendeeData.currentStatus || ATTENDEE_STATUS.ENGAGED
  };
};
