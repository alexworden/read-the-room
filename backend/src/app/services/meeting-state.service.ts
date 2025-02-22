import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Meeting } from '../types/meeting.types';
import { Server } from 'socket.io';
import { MeetingService } from './meeting.service';

interface MeetingState {
  attendees: Set<string>;
}

@Injectable()
export class MeetingStateService implements OnModuleDestroy {
  private readonly logger = new Logger(MeetingStateService.name);
  private meetings = new Map<string, Meeting>();
  private heartbeats = new Map<string, Map<string, string>>();
  private meetingStates = new Map<string, MeetingState>();
  private lastActivity = new Map<string, number>();
  private statsIntervals = new Map<string, NodeJS.Timeout>();
  private server: Server;

  private readonly STATS_INTERVAL = 2000; // 2 seconds
  private readonly INACTIVE_TIMEOUT = 30000; // 30 seconds

  constructor(private readonly meetingService: MeetingService) {}

  setServer(server: Server) {
    this.server = server;
  }

  createMeeting(meeting: Meeting): void {
    this.logger.log(`Creating meeting ${meeting.meetingUuid}`);
    this.meetings.set(meeting.meetingUuid, meeting);
    this.heartbeats.set(meeting.meetingUuid, new Map());
    this.meetingStates.set(meeting.meetingUuid, { attendees: new Set() });
    this.updateLastActivity(meeting.meetingUuid);
    // Start stats updates immediately
    this.startStatsUpdates(meeting.meetingUuid);
  }

  getMeeting(meetingUuid: string): Meeting | undefined {
    return this.meetings.get(meetingUuid);
  }

  addMeeting(meeting: Meeting): void {
    this.logger.log(`Adding meeting ${meeting.meetingUuid}`);
    this.meetings.set(meeting.meetingUuid, meeting);
    this.heartbeats.set(meeting.meetingUuid, new Map());
    this.meetingStates.set(meeting.meetingUuid, { attendees: new Set() });
    // Start stats updates immediately
    this.startStatsUpdates(meeting.meetingUuid);
  }

  updateMeeting(meeting: Meeting): void {
    this.logger.log(`Updating meeting ${meeting.meetingUuid}`);
    this.meetings.set(meeting.meetingUuid, meeting);
    this.heartbeats.set(meeting.meetingUuid, new Map());
    this.meetingStates.set(meeting.meetingUuid, { attendees: new Set() });
    // Start stats updates immediately
    this.startStatsUpdates(meeting.meetingUuid);
  }

  removeMeeting(meetingUuid: string): void {
    this.meetings.delete(meetingUuid);
    this.heartbeats.delete(meetingUuid);
    this.meetingStates.delete(meetingUuid);
    this.stopStatsUpdates(meetingUuid);
  }

  setLastHeartbeat(meetingUuid: string, attendeeId: string, timestamp: string): void {
    let meetingHeartbeats = this.heartbeats.get(meetingUuid);
    if (!meetingHeartbeats) {
      meetingHeartbeats = new Map();
      this.heartbeats.set(meetingUuid, meetingHeartbeats);
    }
    meetingHeartbeats.set(attendeeId, timestamp);
  }

  getLastHeartbeat(meetingUuid: string, attendeeId: string): string | undefined {
    return this.heartbeats.get(meetingUuid)?.get(attendeeId);
  }

  addAttendee(meetingUuid: string, attendeeId: string): void {
    this.logger.log(`Adding attendee ${attendeeId} to meeting ${meetingUuid}`);
    
    // Create meeting state if it doesn't exist
    if (!this.meetingStates.has(meetingUuid)) {
      this.logger.log(`Creating meeting state for ${meetingUuid}`);
      this.meetingStates.set(meetingUuid, { attendees: new Set() });
      this.heartbeats.set(meetingUuid, new Map());
    }

    const meetingState = this.meetingStates.get(meetingUuid);
    meetingState.attendees.add(attendeeId);
    this.logger.log(`Added attendee ${attendeeId} to meeting ${meetingUuid}. Total attendees: ${meetingState.attendees.size}`);
    this.updateLastActivity(meetingUuid);
    
    // Ensure stats updates are running
    this.startStatsUpdates(meetingUuid);
  }

  removeAttendee(meetingUuid: string, attendeeId: string): void {
    const meetingState = this.meetingStates.get(meetingUuid);
    if (meetingState) {
      meetingState.attendees.delete(attendeeId);
      this.updateLastActivity(meetingUuid);
      
      // If no attendees left, stop stats updates
      if (meetingState.attendees.size === 0) {
        this.stopStatsUpdates(meetingUuid);
      }
    }
  }

  getAttendees(meetingUuid: string): Set<string> | undefined {
    const meetingState = this.meetingStates.get(meetingUuid);
    return meetingState?.attendees;
  }

  updateHeartbeat(meetingUuid: string, attendeeId: string): void {
    const meetingHeartbeats = this.heartbeats.get(meetingUuid);
    if (meetingHeartbeats) {
      meetingHeartbeats.set(attendeeId, new Date().toISOString());
      this.updateLastActivity(meetingUuid);
    }
  }

  getHeartbeat(meetingUuid: string, attendeeId: string): string | undefined {
    const meetingHeartbeats = this.heartbeats.get(meetingUuid);
    return meetingHeartbeats?.get(attendeeId);
  }

  private updateLastActivity(meetingUuid: string): void {
    this.lastActivity.set(meetingUuid, Date.now());
  }

  private async startStatsUpdates(meetingUuid: string) {
    // Log the current state of intervals
    this.logger.log(`Current stats intervals: ${Array.from(this.statsIntervals.keys()).join(', ')}`);
    
    // Don't create duplicate intervals
    if (this.statsIntervals.has(meetingUuid)) {
      this.logger.log(`Stats updates already running for meeting ${meetingUuid}. Interval: ${this.statsIntervals.get(meetingUuid)}`);
      // Check if the interval is actually still valid
      const interval = this.statsIntervals.get(meetingUuid);
      if (interval) {
        try {
          clearInterval(interval);
          this.logger.log('Cleared old interval');
        } catch (e) {
          this.logger.error('Error clearing interval:', e);
        }
      }
      this.statsIntervals.delete(meetingUuid);
    }

    // Initialize meeting state if it doesn't exist
    if (!this.meetingStates.has(meetingUuid)) {
      this.logger.log(`Initializing meeting state for ${meetingUuid}`);
      this.meetingStates.set(meetingUuid, { attendees: new Set() });
    }

    this.logger.log(`Initializing stats updates for meeting ${meetingUuid} with interval ${this.STATS_INTERVAL}ms`);
    
    // Do an immediate update
    await this.broadcastStats(meetingUuid);
    
    // Create a recurring interval that won't be blocked by async operations
    const interval = setInterval(() => {
      // Use void to explicitly ignore the promise
      void this.broadcastStats(meetingUuid).catch(error => {
        this.logger.error(`Error in stats broadcast interval for meeting ${meetingUuid}:`, error);
      });
    }, this.STATS_INTERVAL);

    // Keep the interval active
    interval.unref();

    this.statsIntervals.set(meetingUuid, interval);
    this.logger.log(`Started stats interval for meeting ${meetingUuid}. Active intervals: ${this.statsIntervals.size}`);
  }

  // Public method to restart stats updates
  restartStatsUpdates(meetingUuid: string): void {
    this.logger.log(`Restarting stats updates for meeting ${meetingUuid}`);
    this.startStatsUpdates(meetingUuid);
  }

  // Public method to mark meeting as active
  markMeetingActive(meetingUuid: string): void {
    this.logger.log(`Marking meeting ${meetingUuid} as active`);
    this.updateLastActivity(meetingUuid);
  }

  private async broadcastStats(meetingUuid: string) {
    const meetingState = this.meetingStates.get(meetingUuid);
    if (!meetingState) {
      this.logger.warn(`No meeting state found for meeting ${meetingUuid}, stopping stats updates`);
      this.stopStatsUpdates(meetingUuid);
      return;
    }

    // Get and broadcast stats even if there are no attendees yet
    // this.logger.log(`Broadcasting stats for meeting ${meetingUuid}. Attendees: ${meetingState.attendees.size}`);
    const stats = await this.meetingService.getMeetingStats(meetingUuid);
    
    if (!this.server) {
      this.logger.error(`No Socket.IO server instance available for meeting ${meetingUuid}`);
      return;
    }

    this.server.to(meetingUuid).emit('stats', stats);
    // this.logger.log(`Stats broadcast complete for meeting ${meetingUuid}`);
  }

  private stopStatsUpdates(meetingUuid: string) {
    const interval = this.statsIntervals.get(meetingUuid);
    if (interval) {
      clearInterval(interval);
      this.statsIntervals.delete(meetingUuid);
      this.logger.log(`Stopped stats updates for meeting ${meetingUuid}`);
    }
  }

  onModuleDestroy() {
    // Clean up all intervals when the service is destroyed
    for (const [meetingUuid, interval] of this.statsIntervals) {
      clearInterval(interval);
    }
    this.statsIntervals.clear();
  }
}
