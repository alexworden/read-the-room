export interface DbMeeting {
  meeting_uuid: string;
  meeting_code: string;
  title: string;
  qr_code: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbAttendee {
  id: string;
  meeting_uuid: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbAttendeeStatus {
  id: string;
  attendee_id: string;
  meeting_uuid: string;
  status: string;
  last_heartbeat: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DbComment {
  id: string;
  attendee_id: string;
  meeting_uuid: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbReaction {
  id: string;
  attendee_id: string;
  meeting_uuid: string;
  type: string;
  created_at: Date;
}
