export interface Meeting {
  meetingUuid: string;
  meetingCode: string;
  title: string;
  qrCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attendee {
  id: string;
  meetingUuid: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  currentStatus?: string;
}

export interface AttendeeCurrentStatus {
  attendeeId: string;
  meetingUuid: string;
  status: string;
  lastHeartbeat: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusUpdate {
  id: string;
  attendeeId: string;
  meetingUuid: string;
  status: string;
  context?: string;
  createdAt: string;
}

export interface MeetingStats {
  total: number;
  inactive: number;
  engaged: number;
  confused: number;
  agree: number;
  disagree: number;
}

export interface Comment {
  id: string;
  attendeeId: string;
  meetingUuid: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  attendeeName?: string; // Added when joining with attendees table
}

export const AttendeeStatus = {
  ENGAGED: 'engaged',
  CONFUSED: 'confused',
  IDEA: 'idea',
  DISAGREE: 'disagree'
} as const;

export type AttendeeStatus = typeof AttendeeStatus[keyof typeof AttendeeStatus];
