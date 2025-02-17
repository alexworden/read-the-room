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
  // Add stats state
  const [stats, setStats] = useState<{
    total: number;
    engaged: number;
    confused: number;
    idea: number;
    disagree: number;
  } | null>(null);

  // Add transcription state
  const [transcription, setTranscription] = useState<string[]>([]);

  // Add current status state
  const [currentStatus, setCurrentStatus] = useState<AttendeeStatus>(
    attendee.currentStatus || AttendeeStatus.ENGAGED
  );

  const [showCopied, setShowCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
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

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const socket = io(config.apiUrl, {
          transports: ['websocket'],
          path: '/socket.io',
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setIsConnecting(false);
          // Join the meeting room
          socket.emit('joinMeeting', {
            meetingId: meeting.id,
            attendeeId: attendee.id
          });
        });

        // Listen for status updates
        socket.on('statusUpdated', ({ attendeeId, status }) => {
          setAttendees((current) => {
            if (!current) return current;
            return current.map((a) => {
              if (a.id === attendeeId) {
                return { ...a, currentStatus: status };
              }
              return a;
            });
          });
        });

        // Listen for attendee updates
        socket.on('attendeesUpdated', (updatedAttendees) => {
          setAttendees(updatedAttendees.map(convertAttendeeData));
        });

        // Listen for stats updates
        socket.on('stats', (newStats) => {
          setStats(newStats);
        });

        // Listen for errors
        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        socket.on('disconnect', () => {
          setIsConnecting(true);
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            connectSocket();
          }
        });

        // Fetch initial attendees list
        const response = await fetch(`${config.apiUrl}/api/meetings/${meeting.id}/attendees`);
        if (response.ok) {
          const attendeesList = await response.json();
          setAttendees(attendeesList.map(convertAttendeeData));
        }

      } catch (error) {
        console.error('Failed to connect:', error);
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          connectSocket();
        }
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveMeeting', {
          meetingId: meeting.id,
          attendeeId: attendee.id
        });
        socketRef.current.disconnect();
      }
    };
  }, [meeting.id, attendee.id, retryCount]);

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

    try {
      socketRef.current.emit('updateStatus', {
        meetingId: meeting.id,
        attendeeId: attendee.id,
        status
      });
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

  const convertAttendeeData = (attendee: any) => {
    return {
      id: attendee.id,
      name: attendee.name,
      meetingId: attendee.meeting_id,
      isHost: attendee.is_host,
      createdAt: attendee.created_at,
      updatedAt: attendee.updated_at,
      currentStatus: attendee.current_status || AttendeeStatus.ENGAGED
    };
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
              <div className="text-lg sm:text-xl font-bold">{stats?.engaged}</div>
              <div className="text-sm sm:text-base text-gray-600">Engaged</div>
            </div>
            <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg text-center">
              <div className="text-lg sm:text-xl font-bold">{stats?.confused}</div>
              <div className="text-sm sm:text-base text-gray-600">Confused</div>
            </div>
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-lg sm:text-xl font-bold">{stats?.idea}</div>
              <div className="text-sm sm:text-base text-gray-600">Ideas</div>
            </div>
            <div className="p-3 sm:p-4 bg-red-50 rounded-lg text-center">
              <div className="text-lg sm:text-xl font-bold">{stats?.disagree}</div>
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
            <div className="text-lg sm:text-xl font-bold">{stats?.engaged}</div>
            <div className="text-sm sm:text-base text-gray-600">Engaged</div>
          </div>
          <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg text-center">
            <div className="text-lg sm:text-xl font-bold">{stats?.confused}</div>
            <div className="text-sm sm:text-base text-gray-600">Confused</div>
          </div>
          <div className="p-3 sm:p-4 bg-blue-50 rounded-lg text-center">
            <div className="text-lg sm:text-xl font-bold">{stats?.idea}</div>
            <div className="text-sm sm:text-base text-gray-600">Ideas</div>
          </div>
          <div className="p-3 sm:p-4 bg-red-50 rounded-lg text-center">
            <div className="text-lg sm:text-xl font-bold">{stats?.disagree}</div>
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
