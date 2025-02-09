export interface Meeting {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  transcription: string[];
  attendees: Attendee[];
  qrCode?: string; // Optional QR code URL for meeting access
}

export interface Attendee {
  id: string;
  name: string;
  currentStatus: string;
  statusHistory: StatusUpdate[];
  lastSeen?: Date;
}

export interface StatusUpdate {
  attendeeId: string;
  status: string;
  timestamp: Date;
  context: string; // The transcribed text around when the status was updated
}

export const AttendeeStatus = {
  ENGAGED: 'engaged',
  CONFUSED: 'confused',
  IDEA: 'idea',
  DISAGREE: 'disagree'
} as const;
