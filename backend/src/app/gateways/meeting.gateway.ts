import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MeetingService } from '../services/meeting.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: Map<string, Set<Socket>> = new Map();

  constructor(private readonly meetingService: MeetingService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove client from all rooms
    this.rooms.forEach((clients, roomId) => {
      if (clients.has(client)) {
        clients.delete(client);
        if (clients.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    });
  }

  @SubscribeMessage('joinMeeting')
  handleJoinMeeting(client: Socket, meetingId: string) {
    // Add client to room
    if (!this.rooms.has(meetingId)) {
      this.rooms.set(meetingId, new Set());
    }
    this.rooms.get(meetingId).add(client);

    // Send current meeting state
    const meeting = this.meetingService.getMeeting(meetingId);
    if (meeting) {
      client.emit('meetingState', meeting);
    }
  }

  broadcastTranscription(meetingId: string, text: string) {
    const clients = this.rooms.get(meetingId);
    if (clients) {
      const data = { type: 'transcription', text };
      clients.forEach(client => client.emit('message', data));
    }
  }

  broadcastStats(meetingId: string, stats: Record<string, number>) {
    const clients = this.rooms.get(meetingId);
    if (clients) {
      const data = { type: 'stats', stats };
      clients.forEach(client => client.emit('message', data));
    }
  }
}
