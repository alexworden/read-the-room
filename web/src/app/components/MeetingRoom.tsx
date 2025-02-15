import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AttendeeStatus, Meeting, Attendee } from '../types/meeting.types';
import { io, Socket } from 'socket.io-client';
import { debounce } from 'lodash';

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
  const [isConnecting, setIsConnecting] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const joinUrl = `${window.location.origin}/join/${meeting.id}`;
  const socketRef = useRef<Socket | null>(null);

  // Debounced stats update to prevent rapid UI updates
  const updateStats = useCallback(
    debounce((newStats: Record<string, number>) => {
      setStats(newStats);
    }, 500),
    []
  );

  const connectSocket = useCallback(() => {
    const newSocket = io('http://localhost:3000', {
      query: { meetingId: meeting.id },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: MAX_RETRIES,
      reconnectionDelay: 1000,
    });

    const setupSocketListeners = (socket: Socket) => {
      socket.on('connect', () => {
        console.log('Socket connected, joining meeting room...');
        socket.emit('joinMeeting', { meetingId: meeting.id, attendeeId: attendee.id });
      });

      socket.on('error', (error: { message: string }) => {
        console.error('Socket error:', error);
      });

      socket.on('statusUpdated', (data: { attendeeId: string; status: string }) => {
        console.log('Received status update:', data);
        if (data.attendeeId === attendee.id) {
          console.log('Updating current status to:', data.status);
          setCurrentStatus(data.status as AttendeeStatus);
        }
      });

      socket.on('stats', (newStats: Record<string, number>) => {
        console.log('Received new stats:', newStats);
        updateStats(newStats);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setIsConnecting(true);
        
        if (retryCount >= MAX_RETRIES) {
          console.error('Could not connect to server after multiple attempts');
          setIsConnecting(false);
        } else {
          setRetryCount(prev => prev + 1);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnecting(true);
      });

      socket.on('joinedMeeting', () => {
        setRetryCount(0);
      });

      socket.on('transcription', (data: { text: string }) => {
        setTranscription(prev => [...prev, data.text]);
      });

      socket.on('attendeesUpdated', () => {
        fetchStats();
      });
    };

    setupSocketListeners(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnecting(false);
    });

    socketRef.current = newSocket;
    return newSocket;
  }, [meeting.id, attendee.id, retryCount, updateStats]);

  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const connect = () => {
      console.log('Connecting to Socket.IO server...');
      
      const socket = connectSocket();
      
      socket.on('connect', () => {
        console.log('Socket.IO connected successfully');
        
        // Start sending heartbeats
        heartbeatInterval = setInterval(() => {
          socketRef.current?.emit('heartbeat', { attendeeId: attendee.id });
        }, 15000);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connectSocket]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/meetings/${meeting.id}/stats`);
      if (response.ok) {
        const newStats = await response.json();
        setStats(newStats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const updateStatus = async (status: AttendeeStatus) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('Socket not connected');
      return;
    }

    console.log(`Sending status update - Meeting: ${meeting.id}, Attendee: ${attendee.id}, Status: ${status}`);
    try {
      socketRef.current.emit('updateStatus', {
        meetingId: meeting.id,
        attendeeId: attendee.id,
        status
      });
      console.log('Status update sent successfully');
    } catch (error) {
      console.error('Error sending status update:', error);
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

  if (isConnecting) {
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
  }

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
