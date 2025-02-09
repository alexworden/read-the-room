import React, { useState, useEffect, useRef } from 'react';
import { AttendeeStatus, Meeting, Attendee } from '../types/meeting.types';
import { io, Socket } from 'socket.io-client';

interface MeetingRoomProps {
  meeting: Meeting;
  attendee: Attendee;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meeting, attendee }) => {
  const [currentStatus, setCurrentStatus] = useState<AttendeeStatus>(AttendeeStatus.ENGAGED);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({
    total: 0,
    engaged: 0,
    confused: 0,
    idea: 0,
    disagree: 0
  });
  const [showCopied, setShowCopied] = useState(false);
  const joinUrl = `${window.location.origin}/join/${meeting.id}`;
  const socketRef = useRef<Socket | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/stats`);
      if (response.ok) {
        const newStats = await response.json();
        setStats(newStats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const connect = () => {
      console.log('Connecting to Socket.IO server...');
      
      socketRef.current = io('http://localhost:3000', {
        query: { meetingId: meeting.id },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('Socket.IO connected successfully');
        
        // Start sending heartbeats
        heartbeatInterval = setInterval(() => {
          socketRef.current?.emit('heartbeat', { attendeeId: attendee.id });
        }, 15000);

        // Join the meeting room
        socketRef.current?.emit('joinMeeting', { meetingId: meeting.id, attendeeId: attendee.id });

        // Fetch initial stats
        fetchStats();
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
      });

      socketRef.current.on('transcription', (data: { text: string }) => {
        setTranscription(prev => [...prev, data.text]);
      });

      socketRef.current.on('stats', (newStats: Record<string, number>) => {
        console.log('Received new stats:', newStats);
        setStats(newStats);
      });

      socketRef.current.on('attendeesUpdated', () => {
        fetchStats();
      });
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [meeting.id, attendee.id]);

  const updateStatus = async (status: AttendeeStatus) => {
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/attendees/${attendee.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setCurrentStatus(status);
        // Emit status update via socket
        console.log('Emitting status update:', { meetingId: meeting.id, attendeeId: attendee.id, status });
        socketRef.current?.emit('updateStatus', { meetingId: meeting.id, attendeeId: attendee.id, status });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md">
        <div className="flex items-start justify-between space-x-8">
          <div className="flex-1 text-center">
            <h1 className="text-5xl font-bold mb-4">{meeting.title}</h1>
            <div className="flex items-center justify-center space-x-2">
              <a 
                href={joinUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-2xl text-indigo-600 hover:text-indigo-800 transition-colors inline-block"
              >
                {joinUrl}
              </a>
              <button
                onClick={copyToClipboard}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title={showCopied ? "Copied!" : "Copy to clipboard"}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-gray-500"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  {showCopied ? (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 13l4 4L19 7"
                    />
                  ) : (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
          <div>
            <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img 
                src={meeting.qrCode} 
                alt="Meeting QR Code" 
                className="w-80 h-80 cursor-pointer hover:opacity-80 transition-opacity"
                title="Click to open join URL" 
              />
            </a>
          </div>
        </div>
      </div>

      {/* Meeting Stats */}
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold mb-6">Meeting Stats</h2>
        <div className="grid grid-cols-5 gap-6">
          <div className="p-6 bg-gray-50 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-xl text-gray-600">Total</div>
          </div>
          <div className="p-6 bg-green-50 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.engaged}</div>
            <div className="text-xl text-gray-600">Engaged</div>
          </div>
          <div className="p-6 bg-yellow-50 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.confused}</div>
            <div className="text-xl text-gray-600">Confused</div>
          </div>
          <div className="p-6 bg-blue-50 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.idea}</div>
            <div className="text-xl text-gray-600">Ideas</div>
          </div>
          <div className="p-6 bg-red-50 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.disagree}</div>
            <div className="text-xl text-gray-600">Disagree</div>
          </div>
        </div>
      </div>

      {/* User Controls */}
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold mb-6">{attendee.name}'s Status Controls</h2>
        <p className="text-xl text-gray-600 mb-6">Use these buttons to indicate your current status in the meeting</p>
        <div className="grid grid-cols-4 gap-6">
          <button
            onClick={() => updateStatus(AttendeeStatus.ENGAGED)}
            className={`p-6 rounded-lg text-center text-xl ${
              currentStatus === AttendeeStatus.ENGAGED
                ? 'bg-green-600 text-white'
                : 'bg-green-100 hover:bg-green-200'
            }`}
          >
            Engaged
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.CONFUSED)}
            className={`p-6 rounded-lg text-center text-xl ${
              currentStatus === AttendeeStatus.CONFUSED
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-100 hover:bg-yellow-200'
            }`}
          >
            Confused
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.IDEA)}
            className={`p-6 rounded-lg text-center text-xl ${
              currentStatus === AttendeeStatus.IDEA
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 hover:bg-blue-200'
            }`}
          >
            Have an Idea
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.DISAGREE)}
            className={`p-6 rounded-lg text-center text-xl ${
              currentStatus === AttendeeStatus.DISAGREE
                ? 'bg-red-600 text-white'
                : 'bg-red-100 hover:bg-red-200'
            }`}
          >
            Disagree
          </button>
        </div>
      </div>
    </div>
  );
};
