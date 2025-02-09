export interface Meeting {
  id: string;
  title: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  transcription: string[];
  attendees: Attendee[];
  qrCode?: string; // Optional QR code URL for meeting access
}

export interface Attendee {
  id: string;
  name: string;
  currentStatus: AttendeeStatus;
  statusHistory: StatusUpdate[];
}

export interface StatusUpdate {
  attendeeId: string;
  status: AttendeeStatus;
  timestamp: string; // ISO date string
  context: string; // The transcribed text around when the status was updated
}

export enum AttendeeStatus {
  ENGAGED = 'ENGAGED',
  CONFUSED = 'CONFUSED',
  IDEA = 'IDEA',
  DISAGREE = 'DISAGREE'
}
