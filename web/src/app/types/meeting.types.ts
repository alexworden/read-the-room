export enum AttendeeStatus {
  ENGAGED = 'engaged',
  CONFUSED = 'confused',
  IDEA = 'idea',
  DISAGREE = 'disagree'
}

export interface Meeting {
  id: string;
  uuid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  qrCode?: string;
  transcription?: string[];
  attendees?: Attendee[];
}

export interface Attendee {
  id: string;
  name: string;
  currentStatus: AttendeeStatus;
  statusHistory: StatusUpdate[];
  lastSeen?: Date;
}

export interface StatusUpdate {
  status: AttendeeStatus;
  timestamp: string;
  context: string;
}
