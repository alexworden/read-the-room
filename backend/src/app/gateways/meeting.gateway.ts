import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { MeetingStateService } from '../services/meeting-state.service';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: 'meetings',
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MeetingGateway.name);
  private clients: Map<string, Set<Socket>> = new Map(); // meetingId -> Set of clients

  @WebSocketServer()
  server: Server;

  constructor(private readonly meetingStateService: MeetingStateService) {
    this.logger.log('MeetingGateway initialized');
  }

  handleConnection(client: Socket) {
    const meetingId = client.handshake.query.meetingId as string;
    this.logger.log(`Client attempting to connect to meeting ${meetingId}`);

    if (!meetingId) {
      this.logger.error('No meeting ID provided in connection query');
      client.disconnect();
      return;
    }

    const meeting = this.meetingStateService.getMeeting(meetingId);
    if (!meeting) {
      this.logger.error(`Meeting ${meetingId} not found`);
      client.disconnect();
      return;
    }

    // Join the meeting room
    client.join(meetingId);
    
    // Add client to the meeting's client set
    if (!this.clients.has(meetingId)) {
      this.clients.set(meetingId, new Set());
    }
    this.clients.get(meetingId).add(client);

    this.logger.log(`Client connected to meeting ${meetingId}`);

    // Handle heartbeat
    client.on('heartbeat', (data: { attendeeId: string }) => {
      this.handleHeartbeat(meetingId, data.attendeeId);
    });
  }

  handleDisconnect(client: Socket) {
    const meetingId = client.handshake.query.meetingId as string;
    if (meetingId && this.clients.has(meetingId)) {
      this.clients.get(meetingId).delete(client);
      this.logger.log(`Client disconnected from meeting ${meetingId}`);
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(meetingId: string, attendeeId: string) {
    // Update attendee's last heartbeat time
    this.meetingStateService.updateAttendeeHeartbeat(meetingId, attendeeId);
    this.logger.debug(`Heartbeat received from attendee ${attendeeId} in meeting ${meetingId}`);
  }

  // Helper method to broadcast to all clients in a meeting
  broadcastToMeeting(meetingId: string, event: string, data: any) {
    this.server.to(meetingId).emit(event, data);
  }
}
