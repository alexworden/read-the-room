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
import { MeetingRepository } from '../repositories/meeting.repository';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MeetingGateway.name);
  private readonly rooms = new Map<string, Set<string>>();

  constructor(
    private readonly meetingStateService: MeetingStateService,
    private readonly meetingService: MeetingService,
    private readonly meetingRepository: MeetingRepository,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up room membership
    for (const [roomId, members] of this.rooms.entries()) {
      if (members.has(client.id)) {
        members.delete(client.id);
        if (members.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }
  }

  private ensureRoomExists(meetingId: string) {
    if (!this.rooms.has(meetingId)) {
      this.rooms.set(meetingId, new Set());
    }
  }

  private addClientToRoom(meetingId: string, clientId: string) {
    this.ensureRoomExists(meetingId);
    this.rooms.get(meetingId).add(clientId);
  }

  private isClientInRoom(meetingId: string, clientId: string): boolean {
    return this.rooms.has(meetingId) && this.rooms.get(meetingId).has(clientId);
  }

  private async emitUpdatedStats(meetingId: string) {
    try {
      const stats = await this.meetingService.getMeetingStats(meetingId);
      this.server.to(meetingId).emit('stats', stats);
    } catch (error) {
      this.logger.error(`Failed to emit stats for meeting ${meetingId}:`, error);
    }
  }

  @SubscribeMessage('joinMeeting')
  async handleJoinMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string; attendeeId: string },
  ) {
    const { meetingId, attendeeId } = data;
    
    try {
      // Verify meeting exists
      const meeting = await this.meetingService.getMeeting(meetingId);
      if (!meeting) {
        client.emit('error', { message: 'Meeting not found' });
        return;
      }

      // Join socket.io room
      await client.join(meetingId);
      this.addClientToRoom(meetingId, client.id);
      this.logger.log(`Client ${client.id} joined meeting ${meetingId}`);

      // Add attendee to meeting state
      this.meetingStateService.addAttendee(meetingId, attendeeId);

      // Emit updated attendee list
      const attendees = await this.meetingService.getMeetingAttendees(meetingId);
      this.server.to(meetingId).emit('attendeesUpdated', attendees);

      // Send initial stats
      await this.emitUpdatedStats(meetingId);

      // Confirm join
      client.emit('joinedMeeting', { meetingId });
    } catch (error) {
      this.logger.error(`Error joining meeting ${meetingId}:`, error);
      client.emit('error', { message: 'Failed to join meeting' });
    }
  }

  @SubscribeMessage('leaveMeeting')
  async handleLeaveMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string; attendeeId: string },
  ) {
    const { meetingId, attendeeId } = data;
    
    try {
      // Leave socket.io room
      await client.leave(meetingId);
      if (this.rooms.has(meetingId)) {
        this.rooms.get(meetingId).delete(client.id);
      }
      this.logger.log(`Client ${client.id} left meeting ${meetingId}`);

      // Remove attendee from meeting state
      this.meetingStateService.removeAttendee(meetingId, attendeeId);

      // Emit updates
      const attendees = await this.meetingService.getMeetingAttendees(meetingId);
      this.server.to(meetingId).emit('attendeesUpdated', attendees);
      await this.emitUpdatedStats(meetingId);

      // Confirm leave
      client.emit('leftMeeting', { meetingId });
    } catch (error) {
      this.logger.error(`Error leaving meeting ${meetingId}:`, error);
      client.emit('error', { message: 'Failed to leave meeting' });
    }
  }

  @SubscribeMessage('updateStatus')
  async handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string; attendeeId: string; status: string }
  ): Promise<void> {
    const { meetingId, attendeeId, status } = data;
    
    this.logger.log(`Received status update request - Meeting: ${meetingId}, Attendee: ${attendeeId}, Status: ${status}`);
    
    try {
      // Verify client is in the room
      if (!this.isClientInRoom(meetingId, client.id)) {
        this.logger.error(`Client ${client.id} not in meeting room ${meetingId}`);
        client.emit('error', { message: 'Not in meeting room' });
        return;
      }

      this.logger.log(`Updating status in database - Meeting: ${meetingId}, Attendee: ${attendeeId}, Status: ${status}`);
      // Update status
      await this.meetingService.updateAttendeeStatus(attendeeId, meetingId, status);
      
      this.logger.log(`Status updated successfully, emitting to room ${meetingId}`);
      // Emit updates
      this.server.to(meetingId).emit('statusUpdated', { attendeeId, status });
      
      this.logger.log(`Fetching updated stats for meeting ${meetingId}`);
      const stats = await this.meetingService.getMeetingStats(meetingId);
      this.logger.log(`Emitting updated stats to room ${meetingId}:`, stats);
      this.server.to(meetingId).emit('stats', stats);
    } catch (error) {
      this.logger.error(`Error updating status in meeting ${meetingId}:`, error);
      client.emit('error', { message: 'Failed to update status' });
    }
  }
}
