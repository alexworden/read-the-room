import { Meeting, Attendee, Comment } from '../types/meeting.types';
import { DbMeeting, DbAttendee, DbComment } from '../types/database.types';

export class DatabaseMapper {
  static toMeeting(dbMeeting: DbMeeting): Meeting {
    return {
      meetingUuid: dbMeeting.meeting_uuid,
      meetingCode: dbMeeting.meeting_code,
      title: dbMeeting.title,
      qrCode: dbMeeting.qr_code,
      createdAt: new Date(dbMeeting.created_at),
      updatedAt: new Date(dbMeeting.updated_at)
    };
  }

  static toAttendee(dbAttendee: DbAttendee, currentStatus?: string): Attendee {
    return {
      id: dbAttendee.id,
      meetingUuid: dbAttendee.meeting_uuid,
      name: dbAttendee.name,
      currentStatus: currentStatus as any, // Type will be enforced by the database enum
      createdAt: new Date(dbAttendee.created_at),
      updatedAt: new Date(dbAttendee.updated_at)
    };
  }

  static toComment(dbComment: DbComment): Comment {
    return {
      id: dbComment.id,
      attendeeId: dbComment.attendee_id,
      meetingUuid: dbComment.meeting_uuid,
      content: dbComment.content,
      createdAt: new Date(dbComment.created_at),
      updatedAt: new Date(dbComment.updated_at)
    };
  }

  static toAttendeeWithStatus(dbAttendee: DbAttendee & { current_status?: string }): Attendee & { currentStatus: string } {
    return {
      ...this.toAttendee(dbAttendee),
      currentStatus: dbAttendee.current_status === null ? 'engaged' : dbAttendee.current_status
    };
  }
}
