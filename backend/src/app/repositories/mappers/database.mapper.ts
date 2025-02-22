import { Meeting, Attendee, Comment, AttendeeCurrentStatus } from '../../types/meeting.types';
import { DbMeeting, DbAttendee, DbComment, DbAttendeeStatus } from '../types/database.types';

export class DatabaseMapper {
  static toMeeting(dbMeeting: DbMeeting): Meeting {
    return {
      meetingUuid: dbMeeting.meeting_uuid,
      meetingCode: dbMeeting.meeting_code,
      title: dbMeeting.title,
      qrCode: dbMeeting.qr_code,
      createdAt: new Date(dbMeeting.created_at).toISOString(),
      updatedAt: new Date(dbMeeting.updated_at).toISOString()
    };
  }

  static toAttendee(dbAttendee: DbAttendee, currentStatus?: string): Attendee {
    return {
      id: dbAttendee.id,
      meetingUuid: dbAttendee.meeting_uuid,
      name: dbAttendee.name,
      currentStatus: currentStatus as any, // Type will be enforced by the database enum
      createdAt: new Date(dbAttendee.created_at).toISOString(),
      updatedAt: new Date(dbAttendee.updated_at).toISOString()
    };
  }

  static toComment(dbComment: DbComment): Comment {
    return {
      id: dbComment.id,
      attendeeId: dbComment.attendee_id,
      meetingUuid: dbComment.meeting_uuid,
      content: dbComment.content,
      createdAt: new Date(dbComment.created_at).toISOString(),
      updatedAt: new Date(dbComment.updated_at).toISOString()
    };
  }

  static toAttendeeCurrentStatus(dbStatus: DbAttendeeStatus): AttendeeCurrentStatus {
    return {
      attendeeId: dbStatus.attendee_id,
      meetingUuid: dbStatus.meeting_uuid,
      status: dbStatus.status,
      lastHeartbeat: new Date(dbStatus.last_heartbeat).toISOString(),
      createdAt: new Date(dbStatus.created_at).toISOString(),
      updatedAt: new Date(dbStatus.updated_at).toISOString()
    };
  }

  static toAttendeeWithStatus(dbAttendee: DbAttendee & { current_status?: string }): Attendee & { currentStatus: string } {
    return {
      ...this.toAttendee(dbAttendee),
      currentStatus: dbAttendee.current_status === null ? 'engaged' : dbAttendee.current_status
    };
  }
}
