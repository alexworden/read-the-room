import { Attendee, ATTENDEE_STATUS, AttendeeStatus } from '../types/meeting.types';

interface AttendeeData {
  id: string;
  name: string;
  meetingUuid: string;
  isHost?: boolean;
  createdAt: string;
  updatedAt: string;
  currentStatus?: AttendeeStatus;
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
