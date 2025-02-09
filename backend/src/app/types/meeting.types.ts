export interface Meeting {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  qr_code?: string;
}

export interface Attendee {
  id: string;
  meeting_id: string;
  name: string;
  current_status: string;
  last_seen?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface StatusUpdate {
  id: string;
  attendee_id: string;
  status: string;
  context?: string;
  created_at: Date;
}

export interface Transcription {
  id: string;
  meeting_id: string;
  text: string;
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
