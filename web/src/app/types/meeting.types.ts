export const ATTENDEE_STATUS = {
  INACTIVE: 'inactive',
  ENGAGED: 'engaged',
  CONFUSED: 'confused'
} as const;

export const REACTION_TYPE = {
  AGREE: 'agree',
  DISAGREE: 'disagree'
} as const;

export type AttendeeStatus = typeof ATTENDEE_STATUS[keyof typeof ATTENDEE_STATUS];
export type ReactionType = typeof REACTION_TYPE[keyof typeof REACTION_TYPE];

export interface Meeting {
  meetingCode: string;
  meetingUuid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  qrCode?: string;
  transcription?: string[];
  attendees?: Attendee[];
  comments?: Comment[];
}

export interface Attendee {
  id: string;
  name: string;
  meetingUuid: string;
  currentStatus?: AttendeeStatus;
  statusHistory?: StatusUpdate[];
  lastSeen?: Date;
  isHost?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StatusUpdate {
  status: AttendeeStatus;
  timestamp: Date;
}

export interface Reaction {
  type: ReactionType;
  timestamp: Date;
}

export interface Comment {
  id: string;
  attendeeId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  attendeeName?: string;
}

export interface MeetingStats {
  total: number;
  inactive: number;
  engaged: number;
  confused: number;
  agree: number;
  disagree: number;
}
