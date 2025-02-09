import React, { useState, useEffect, useRef } from 'react';
import { AttendeeStatus, Meeting, Attendee } from '../types/meeting.types';
import { io, Socket } from 'socket.io-client';

interface MeetingRoomProps {
  meetingId: string;
  attendeeId: string;
  meeting: Meeting;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meetingId, attendeeId, meeting }) => {
  const [currentStatus, setCurrentStatus] = useState<AttendeeStatus>(AttendeeStatus.ENGAGED);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({
    total: 0,
    engaged: 0,
    confused: 0,
    idea: 0,
    disagree: 0
  });
  const [qrCode, setQrCode] = useState<string>('');
  const [attendeeName, setAttendeeName] = useState<string>('');
  const [showCopied, setShowCopied] = useState(false);
  const joinUrl = `${window.location.origin}/join/${meetingId}`;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchQrCode = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/qr`);
        if (response.ok) {
          const { qrCode } = await response.json();
          setQrCode(qrCode);
        }
      } catch (error) {
        console.error('Failed to fetch QR code:', error);
      }
    };
    fetchQrCode();
  }, [meetingId]);

  useEffect(() => {
    const fetchAttendee = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/attendees/${attendeeId}`);
        if (response.ok) {
          const attendee: Attendee = await response.json();
          setAttendeeName(attendee.name);
        }
      } catch (error) {
        console.error('Failed to fetch attendee:', error);
      }
    };
    fetchAttendee();
  }, [meetingId, attendeeId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/stats`);
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
        query: { meetingId },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('Socket.IO connected successfully');
        
        // Start sending heartbeats
        heartbeatInterval = setInterval(() => {
          socketRef.current?.emit('heartbeat', { attendeeId });
        }, 15000);

        // Join the meeting room
        socketRef.current?.emit('joinMeeting', { meetingId, attendeeId });

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
  }, [meetingId, attendeeId]);

  const updateStatus = async (status: AttendeeStatus) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/attendees/${attendeeId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setCurrentStatus(status);
        // Emit status update via socket
        console.log('Emitting status update:', { meetingId, attendeeId, status });
        socketRef.current?.emit('updateStatus', { meetingId, attendeeId, status });
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
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Header Section with Meeting Title and QR Code */}
      <div className="flex justify-between items-start mb-8 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold">{meeting.title}</h1>
          <p className="text-gray-600 mt-2">Meeting ID: {meetingId}</p>
        </div>
        <div className="flex flex-col items-center">
          <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img 
              src={qrCode} 
              alt="Meeting QR Code" 
              className="w-80 h-80 cursor-pointer hover:opacity-80 transition-opacity" 
              title="Click to open join URL"
            />
          </a>
          <p className="text-sm text-gray-600 mt-2">Share this QR code to invite attendees</p>
          <div className="mt-2 flex items-center space-x-2">
            <a 
              href={joinUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Link to join meeting
            </a>
            <button
              onClick={copyToClipboard}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Copy to clipboard"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-gray-500"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {showCopied ? (
                  // Checkmark icon
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  // Copy icon
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                )}
              </svg>
            </button>
            {showCopied && (
              <span className="text-sm text-green-600 absolute mt-8">
                Copied!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meeting Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Meeting Stats</h2>
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.engaged}</div>
            <div className="text-sm text-gray-600">Engaged</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.confused}</div>
            <div className="text-sm text-gray-600">Confused</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.idea}</div>
            <div className="text-sm text-gray-600">Ideas</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.disagree}</div>
            <div className="text-sm text-gray-600">Disagree</div>
          </div>
        </div>
      </div>

      {/* Transcriptions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Transcriptions</h2>
        <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
          {transcription.map((text, index) => (
            <div key={index} className="mb-2 last:mb-0">
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* User Controls Section */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">
          {attendeeName ? `${attendeeName}'s Status Controls` : 'Your Status Controls'}
        </h2>
        <p className="text-gray-600 mb-4">Use these buttons to indicate your current status in the meeting</p>
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => updateStatus(AttendeeStatus.ENGAGED)}
            className={`p-4 rounded-lg text-center ${
              currentStatus === AttendeeStatus.ENGAGED
                ? 'bg-green-600 text-white'
                : 'bg-green-100 hover:bg-green-200'
            }`}
          >
            Engaged
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.CONFUSED)}
            className={`p-4 rounded-lg text-center ${
              currentStatus === AttendeeStatus.CONFUSED
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-100 hover:bg-yellow-200'
            }`}
          >
            Confused
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.IDEA)}
            className={`p-4 rounded-lg text-center ${
              currentStatus === AttendeeStatus.IDEA
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 hover:bg-blue-200'
            }`}
          >
            Have an Idea
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.DISAGREE)}
            className={`p-4 rounded-lg text-center ${
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
