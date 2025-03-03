export interface Comment {
  id: string;
  attendee_id: string;
  content: string;
  created_at: Date;
}

export interface CommentWithAttendeeName extends Comment {
  attendee_name: string;
}

export interface AttendeeResult {
  attendee_name: string;
}
