import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AttendeeStatus, Meeting, Attendee } from '../types/meeting.types';
import { io, Socket } from 'socket.io-client';
import { debounce } from 'lodash';
import { config } from '../config';

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
    const newSocket = io(config.apiUrl, {
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
      const response = await fetch(`${config.apiUrl}/api/meetings/${meeting.id}/stats`);
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
      <div className="space-y-4">
        {/* Meeting Info and QR Code */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:space-x-8">
            <div className="flex-1 text-center mb-4 sm:mb-0">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">{meeting.title}</h2>
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-gray-600">Share this link with others:</p>
                <div className="flex items-center justify-center space-x-2">
                  <input
                    type="text"
                    value={joinUrl}
                    readOnly
                    className="flex-1 max-w-xs text-sm p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {showCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 flex justify-center">
              <img
                src={meeting.qrCode}
                alt="QR Code"
                className="w-32 h-32 sm:w-40 sm:h-40"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Meeting Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 sm:p-4 bg-green-50 rounded-lg text-center">
              <div className="text-lg sm:text-xl font-bold">{stats.engaged}</div>
              <div className="text-sm sm:text-base text-gray-600">Engaged</div>
            </div>
            <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg text-center">
              <div className="text-lg sm:text-xl font-bold">{stats.confused}</div>
              <div className="text-sm sm:text-base text-gray-600">Confused</div>
            </div>
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-lg sm:text-xl font-bold">{stats.idea}</div>
              <div className="text-sm sm:text-base text-gray-600">Ideas</div>
            </div>
            <div className="p-3 sm:p-4 bg-red-50 rounded-lg text-center">
              <div className="text-lg sm:text-xl font-bold">{stats.disagree}</div>
              <div className="text-sm sm:text-base text-gray-600">Disagree</div>
            </div>
          </div>
        </div>

        {/* Status Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-2">{attendee.name}'s Status</h2>
          <p className="text-sm text-gray-600 mb-4">Use these buttons to indicate your current status</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => updateStatus(AttendeeStatus.ENGAGED)}
              className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
                currentStatus === AttendeeStatus.ENGAGED
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 hover:bg-green-200'
              }`}
            >
              Engaged
            </button>
            <button
              onClick={() => updateStatus(AttendeeStatus.CONFUSED)}
              className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
                currentStatus === AttendeeStatus.CONFUSED
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-100 hover:bg-yellow-200'
              }`}
            >
              Confused
            </button>
            <button
              onClick={() => updateStatus(AttendeeStatus.IDEA)}
              className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
                currentStatus === AttendeeStatus.IDEA
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 hover:bg-blue-200'
              }`}
            >
              Have an Idea
            </button>
            <button
              onClick={() => updateStatus(AttendeeStatus.DISAGREE)}
              className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
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
    <div className="space-y-4">
      {/* Meeting Info and QR Code */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:space-x-8">
          <div className="flex-1 text-center mb-4 sm:mb-0">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">{meeting.title}</h2>
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-gray-600">Share this link with others:</p>
              <div className="flex items-center justify-center space-x-2">
                <input
                  type="text"
                  value={joinUrl}
                  readOnly
                  className="flex-1 max-w-xs text-sm p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 flex justify-center">
            <img
              src={meeting.qrCode}
              alt="QR Code"
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Meeting Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 sm:p-4 bg-green-50 rounded-lg text-center">
            <div className="text-lg sm:text-xl font-bold">{stats.engaged}</div>
            <div className="text-sm sm:text-base text-gray-600">Engaged</div>
          </div>
          <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg text-center">
            <div className="text-lg sm:text-xl font-bold">{stats.confused}</div>
            <div className="text-sm sm:text-base text-gray-600">Confused</div>
          </div>
          <div className="p-3 sm:p-4 bg-blue-50 rounded-lg text-center">
            <div className="text-lg sm:text-xl font-bold">{stats.idea}</div>
            <div className="text-sm sm:text-base text-gray-600">Ideas</div>
          </div>
          <div className="p-3 sm:p-4 bg-red-50 rounded-lg text-center">
            <div className="text-lg sm:text-xl font-bold">{stats.disagree}</div>
            <div className="text-sm sm:text-base text-gray-600">Disagree</div>
          </div>
        </div>
      </div>

      {/* Status Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-2">{attendee.name}'s Status</h2>
        <p className="text-sm text-gray-600 mb-4">Use these buttons to indicate your current status</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => updateStatus(AttendeeStatus.ENGAGED)}
            className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
              currentStatus === AttendeeStatus.ENGAGED
                ? 'bg-green-600 text-white'
                : 'bg-green-100 hover:bg-green-200'
            }`}
          >
            Engaged
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.CONFUSED)}
            className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
              currentStatus === AttendeeStatus.CONFUSED
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-100 hover:bg-yellow-200'
            }`}
          >
            Confused
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.IDEA)}
            className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
              currentStatus === AttendeeStatus.IDEA
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 hover:bg-blue-200'
            }`}
          >
            Have an Idea
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.DISAGREE)}
            className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
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
