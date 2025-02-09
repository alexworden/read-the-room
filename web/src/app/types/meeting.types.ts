export enum AttendeeStatus {
  ENGAGED = 'ENGAGED',
  CONFUSED = 'CONFUSED',
  IDEA = 'IDEA',
  DISAGREE = 'DISAGREE'
}

export interface Meeting {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  transcription: string[];
  attendees: Attendee[];
  qrCode?: string;
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
