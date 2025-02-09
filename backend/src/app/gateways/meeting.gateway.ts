import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MeetingStateService } from '../services/meeting-state.service';
import { MeetingService } from '../services/meeting.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly meetingStateService: MeetingStateService,
    private readonly meetingService: MeetingService,
  ) {}

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('joinMeeting')
  async handleJoinMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string; attendeeId: string },
  ) {
    const { meetingId, attendeeId } = data;
    client.join(meetingId);

    // Add attendee to meeting state
    this.meetingStateService.addAttendee(meetingId, attendeeId);

    // Emit updated attendee list to all clients in the meeting
    const attendees = await this.meetingService.getMeetingAttendees(meetingId);
    this.server.to(meetingId).emit('attendeesUpdated', attendees);

    // Send initial stats
    const stats = await this.meetingService.getMeetingStats(meetingId);
    this.server.to(meetingId).emit('stats', stats);
  }

  @SubscribeMessage('leaveMeeting')
  async handleLeaveMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string; attendeeId: string },
  ) {
    const { meetingId, attendeeId } = data;
    client.leave(meetingId);

    // Remove attendee from meeting state
    this.meetingStateService.removeAttendee(meetingId, attendeeId);

    // Emit updated attendee list to all clients in the meeting
    const attendees = await this.meetingService.getMeetingAttendees(meetingId);
    this.server.to(meetingId).emit('attendeesUpdated', attendees);

    // Send updated stats
    const stats = await this.meetingService.getMeetingStats(meetingId);
    this.server.to(meetingId).emit('stats', stats);
  }

  @SubscribeMessage('updateStatus')
  async handleStatusUpdate(
    @MessageBody() data: { meetingId: string; attendeeId: string; status: string },
  ) {
    const { meetingId, attendeeId, status } = data;
    await this.meetingService.updateAttendeeStatus(attendeeId, status);

    // Emit updated attendee list to all clients in the meeting
    const attendees = await this.meetingService.getMeetingAttendees(meetingId);
    this.server.to(meetingId).emit('attendeesUpdated', attendees);

    // Send updated stats
    const stats = await this.meetingService.getMeetingStats(meetingId);
    this.server.to(meetingId).emit('stats', stats);
  }
}
