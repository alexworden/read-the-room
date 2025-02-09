export interface Attendee {
  id: string;
  name: string;
  currentStatus: AttendeeStatus;
  statusHistory: StatusUpdate[];
  lastSeen?: Date;
}

export interface StatusUpdate {
  status: AttendeeStatus;
  timestamp: Date;
}

export interface Meeting {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  attendees: Attendee[];
  transcription: string[];
}

export enum AttendeeStatus {
  ENGAGED = 'ENGAGED',
  CONFUSED = 'CONFUSED',
  IDEA = 'IDEA',
  DISAGREE = 'DISAGREE',
}
