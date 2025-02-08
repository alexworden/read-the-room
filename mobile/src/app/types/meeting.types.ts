export enum AttendeeStatus {
  ENGAGED = 'ENGAGED',
  CONFUSED = 'CONFUSED',
  IDEA = 'IDEA',
  DISAGREE = 'DISAGREE'
}

export interface Meeting {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  transcription: string[];
  attendees: Attendee[];
}

export interface Attendee {
  id: string;
  name: string;
  currentStatus: AttendeeStatus;
  statusHistory: StatusUpdate[];
}

export interface StatusUpdate {
  status: AttendeeStatus;
  timestamp: Date;
  context: string;
}
