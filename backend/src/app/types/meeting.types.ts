export interface Meeting {
  meeting_uuid: string;
  meeting_id: string;
  title: string;
  qr_code?: string;
  created_at: Date;
  updated_at: Date;
  attendees: Attendee[];
}

export interface Attendee {
  id: string;
  meeting_id: string;
  name: string;
  created_at: Date;
  currentStatus: string;
  statusHistory: StatusUpdate[];
}

export interface AttendeeCurrentStatus {
  attendee_id: string;
  meeting_id: string;
  status: string;
  last_heartbeat: Date;
}

export interface StatusUpdate {
  id: string;
  attendee_id: string;
  meeting_id: string;
  status: string;
  context?: string;
  created_at: Date;
}

export interface MeetingStats {
  total: number;
  engaged: number;
  confused: number;
  idea: number;
  disagree: number;
}

export const AttendeeStatus = {
  ENGAGED: 'engaged',
  CONFUSED: 'confused',
  IDEA: 'idea',
  DISAGREE: 'disagree'
} as const;

export type AttendeeStatus = typeof AttendeeStatus[keyof typeof AttendeeStatus];
