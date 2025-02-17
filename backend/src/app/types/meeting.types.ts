export interface Meeting {
  meetingUuid: string;
  meetingCode: string;
  title: string;
  qrCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendee {
  id: string;
  meetingUuid: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  currentStatus?: string;
}

export interface AttendeeCurrentStatus {
  attendeeId: string;
  meetingUuid: string;
  status: string;
  lastHeartbeat: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusUpdate {
  id: string;
  attendeeId: string;
  meetingUuid: string;
  status: string;
  context?: string;
  createdAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
  attendeeName?: string; // Added when joining with attendees table
}

export const AttendeeStatus = {
  ENGAGED: 'engaged',
  CONFUSED: 'confused',
  IDEA: 'idea',
  DISAGREE: 'disagree'
} as const;

export type AttendeeStatus = typeof AttendeeStatus[keyof typeof AttendeeStatus];
