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
import { CommentService } from '../services/comment.service';
import { Logger, OnModuleInit } from '@nestjs/common';
import { config } from '../config';

@WebSocketGateway({
  cors: {
    origin: [
      config.webUrl,
      'http://localhost:19000', // Keep this for Expo development
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MeetingGateway.name);
  private readonly rooms = new Map<string, Set<string>>();

  constructor(
    private readonly meetingStateService: MeetingStateService,
    private readonly meetingService: MeetingService,
    private readonly meetingRepository: MeetingRepository,
    private readonly commentService: CommentService,
  ) {}

  onModuleInit() {
    this.logger.log('WebSocket Gateway initialized');
    this.meetingStateService.setServer(this.server);
  }

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

  private ensureRoomExists(meetingUuid: string) {
    if (!this.rooms.has(meetingUuid)) {
      this.rooms.set(meetingUuid, new Set());
    }
  }

  private addClientToRoom(meetingUuid: string, clientId: string) {
    this.ensureRoomExists(meetingUuid);
    this.rooms.get(meetingUuid).add(clientId);
  }

  private isClientInRoom(meetingUuid: string, clientId: string): boolean {
    return this.rooms.has(meetingUuid) && this.rooms.get(meetingUuid).has(clientId);
  }

  private async emitUpdatedStats(meetingUuid: string) {
    try {
      const stats = await this.meetingService.getMeetingStats(meetingUuid);
      this.server.to(meetingUuid).emit('stats', stats);
    } catch (error) {
      this.logger.error(`Failed to emit stats for meeting ${meetingUuid}:`, error);
    }
  }

  @SubscribeMessage('joinMeeting')
  async handleJoinMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingUuid: string; attendeeId: string },
  ) {
    const { meetingUuid, attendeeId } = data;
    
    try {
      // Get the meeting from repository using UUID
      const meeting = await this.meetingRepository.getMeetingByUuid(meetingUuid);
      if (!meeting) {
        this.logger.error(`Meeting ${meetingUuid} not found`);
        return;
      }

      // Always create/update meeting state when a client joins
      this.logger.log(`Creating/updating meeting state for ${meetingUuid}`);
      this.meetingStateService.createMeeting(meeting);

      // Join socket.io room using meeting_uuid
      await client.join(meetingUuid);
      this.addClientToRoom(meetingUuid, client.id);
      this.logger.log(`Client ${client.id} joined meeting ${meetingUuid}`);

      // Add attendee to meeting state
      this.meetingStateService.addAttendee(meetingUuid, attendeeId);

      // Get attendee with current status
      const attendee = await this.meetingService.getAttendee(attendeeId);
      
      // Emit updated attendee list
      const attendees = await this.meetingService.getMeetingAttendees(meetingUuid);
      this.server.to(meetingUuid).emit('attendeesUpdated', attendees);

      // Send initial stats
      await this.emitUpdatedStats(meetingUuid);

      // Confirm join and send current status
      client.emit('joinedMeeting', { currentStatus: attendee.currentStatus });
    } catch (error) {
      this.logger.error(`Error joining meeting ${meetingUuid}:`, error);
      client.emit('error', { message: 'Failed to join meeting' });
    }
  }

  @SubscribeMessage('leaveMeeting')
  async handleLeaveMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingUuid: string; attendeeId: string },
  ) {
    const { meetingUuid, attendeeId } = data;
    
    try {
      // Leave socket.io room
      await client.leave(meetingUuid);
      if (this.rooms.has(meetingUuid)) {
        this.rooms.get(meetingUuid).delete(client.id);
      }
      this.logger.log(`Client ${client.id} left meeting ${meetingUuid}`);

      // Remove attendee from meeting state
      this.meetingStateService.removeAttendee(meetingUuid, attendeeId);

      // Emit updates
      const attendees = await this.meetingService.getMeetingAttendees(meetingUuid);
      this.server.to(meetingUuid).emit('attendeesUpdated', attendees);
      await this.emitUpdatedStats(meetingUuid);

      // Confirm leave
      client.emit('leftMeeting');
    } catch (error) {
      this.logger.error(`Error leaving meeting ${meetingUuid}:`, error);
      client.emit('error', { message: 'Failed to leave meeting' });
    }
  }

  @SubscribeMessage('updateStatus')
  async handleStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingUuid: string; attendeeId: string; status: string },
  ) {
    const { meetingUuid, attendeeId, status } = data;
    
    try {
      if (!this.isClientInRoom(meetingUuid, client.id)) {
        this.logger.error(`Client ${client.id} not in meeting room ${meetingUuid}`);
        client.emit('error', { message: 'Not in meeting room' });
        return;
      }

      this.logger.debug(`Updating status in database - Meeting: ${meetingUuid}, Attendee: ${attendeeId}, Status: ${status}`);
      
      // Update status
      await this.meetingService.updateAttendeeStatus(attendeeId, meetingUuid, status);
      
      this.logger.debug(`Status updated successfully, emitting to room ${meetingUuid}`);
      // Emit updates
      this.server.to(meetingUuid).emit('statusUpdated', { attendeeId, status });
      
      this.logger.debug(`Fetching updated stats for meeting ${meetingUuid}`);
      const stats = await this.meetingService.getMeetingStats(meetingUuid);
      this.logger.debug(`Emitting updated stats to room ${meetingUuid}:`, stats);
      this.server.to(meetingUuid).emit('stats', stats);
    } catch (error) {
      this.logger.error(`Error updating status in meeting ${meetingUuid}:`, error);
      client.emit('error', { message: 'Failed to update status' });
    }
  }

  @SubscribeMessage('getComments')
  async handleGetComments(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingUuid: string },
  ) {
    const { meetingUuid } = data;
    
    try {
      if (!this.isClientInRoom(meetingUuid, client.id)) {
        this.logger.error(`Client ${client.id} not in meeting room ${meetingUuid}`);
        client.emit('error', { message: 'Not in meeting room' });
        return;
      }

      const comments = await this.commentService.getComments(meetingUuid);
      
      // Emit to requesting client
      client.emit('comments', comments);
      
      // Also emit to all clients in the room for consistency
      this.server.to(meetingUuid).emit('commentsUpdated', comments);
    } catch (error) {
      this.logger.error(`Error getting comments for meeting ${meetingUuid}:`, error);
      client.emit('error', { message: 'Failed to get comments' });
    }
  }

  @SubscribeMessage('comment')
  async handleComment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingUuid: string; attendeeId: string; content: string },
  ) {
    const { meetingUuid, attendeeId, content } = data;
    
    try {
      this.logger.log(`[Comment] Received new comment from ${attendeeId} in meeting ${meetingUuid}`);
      
      if (!this.isClientInRoom(meetingUuid, client.id)) {
        this.logger.error(`Client ${client.id} not in meeting room ${meetingUuid}`);
        client.emit('error', { message: 'Not in meeting room' });
        return;
      }

      const comment = await this.commentService.createComment(meetingUuid, attendeeId, content);
      this.logger.log(`[Comment] Created comment ${comment.id}`);
      
      // Emit new comment to all clients
      const formattedComment = {
        ...comment,
        id: comment.id,
        attendeeId: comment.attendee_id,
        content: comment.content,
        createdAt: comment.created_at,
        attendeeName: comment.attendee_name
      };
      this.server.to(meetingUuid).emit('newComment', formattedComment);
      
      // Get and emit updated comments to maintain consistency
      const comments = await this.commentService.getComments(meetingUuid);
      const formattedComments = comments.map(c => ({
        ...c,
        id: c.id,
        attendeeId: c.attendee_id,
        content: c.content,
        createdAt: c.created_at,
        attendeeName: c.attendee_name
      }));
      this.server.to(meetingUuid).emit('commentsUpdated', formattedComments);
    } catch (error) {
      this.logger.error(`[Comment] Error creating comment: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to create comment' });
    }
  }

  @SubscribeMessage('reaction')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingUuid: string; attendeeId: string; reaction: { type: string } },
  ) {
    const { meetingUuid, attendeeId, reaction } = data;

    try {
      await this.meetingService.addReaction(attendeeId, meetingUuid, reaction.type);
      await this.emitUpdatedStats(meetingUuid);
    } catch (error) {
      this.logger.error(`Error handling reaction in meeting ${meetingUuid}:`, error);
      client.emit('error', { message: 'Failed to add reaction' });
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingUuid: string; attendeeId: string },
  ) {
    const { meetingUuid, attendeeId } = data;
    
    try {
      await this.meetingService.updateAttendeeHeartbeat(attendeeId, meetingUuid);
    } catch (error) {
      this.logger.error(`Error updating heartbeat for attendee ${attendeeId} in meeting ${meetingUuid}:`, error);
      client.emit('error', { message: 'Failed to update heartbeat' });
    }
  }
}
