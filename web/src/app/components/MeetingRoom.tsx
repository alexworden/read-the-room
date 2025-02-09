import React, { useState, useEffect } from 'react';
import { AttendeeStatus, Meeting } from '../types/meeting.types';
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

  useEffect(() => {
    let socket: Socket | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const connect = () => {
      console.log('Connecting to Socket.IO server...');
      
      socket = io('http://localhost:3000/meetings', {
        query: { meetingId },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected successfully');
        
        // Start sending heartbeats
        heartbeatInterval = setInterval(() => {
          socket?.emit('heartbeat', { attendeeId });
        }, 15000);

        // Fetch initial stats
        fetchStats();
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      });

      socket.on('transcription', (data: { text: string }) => {
        console.log('Received transcription:', data);
        setTranscription(prev => [...prev, data.text]);
      });

      socket.on('stats', (data: Record<string, number>) => {
        console.log('Received stats:', data);
        setStats(data);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
      });
    };

    connect();

    return () => {
      console.log('Cleaning up Socket.IO connection');
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [meetingId, attendeeId]);

  const updateStatus = async (status: AttendeeStatus) => {
    try {
      console.log('Updating status to:', status);
      const response = await fetch(`/api/meetings/${meetingId}/attendees/${attendeeId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setCurrentStatus(status);
        // Fetch updated stats after status change
        fetchStats();
      } else {
        console.error('Failed to update status:', await response.text());
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/stats`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched stats:', data);
        setStats(data);
      } else {
        console.error('Failed to fetch stats:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">{meeting.title}</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Your Status</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => updateStatus(AttendeeStatus.ENGAGED)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStatus === AttendeeStatus.ENGAGED
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Engaged
            </button>
            <button
              onClick={() => updateStatus(AttendeeStatus.CONFUSED)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStatus === AttendeeStatus.CONFUSED
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Confused
            </button>
            <button
              onClick={() => updateStatus(AttendeeStatus.IDEA)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStatus === AttendeeStatus.IDEA
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Have an Idea
            </button>
            <button
              onClick={() => updateStatus(AttendeeStatus.DISAGREE)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStatus === AttendeeStatus.DISAGREE
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Disagree
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Meeting Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Participants</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Engaged</p>
              <p className="text-2xl font-bold text-green-500">{stats.engaged}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Confused</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.confused}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Ideas</p>
              <p className="text-2xl font-bold text-blue-500">{stats.idea}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Transcription</h3>
          <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
            {transcription.map((text, index) => (
              <p key={index} className="mb-2">{text}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
