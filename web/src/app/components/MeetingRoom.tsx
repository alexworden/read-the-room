import React, { useState, useEffect } from 'react';
import { AttendeeStatus } from '../types/meeting.types';

interface MeetingRoomProps {
  meetingId: string;
  attendeeId: string;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meetingId, attendeeId }) => {
  const [currentStatus, setCurrentStatus] = useState<AttendeeStatus>(AttendeeStatus.ENGAGED);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<AttendeeStatus, number>>({
    [AttendeeStatus.ENGAGED]: 0,
    [AttendeeStatus.CONFUSED]: 0,
    [AttendeeStatus.IDEA]: 0,
    [AttendeeStatus.DISAGREE]: 0,
  });

  const updateStatus = async (status: AttendeeStatus) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/attendees/${attendeeId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          context: transcription[transcription.length - 1] || '',
        }),
      });

      if (response.ok) {
        setCurrentStatus(status);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  useEffect(() => {
    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket(`ws://${window.location.host}/meetings/${meetingId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'transcription') {
        setTranscription(prev => [...prev, data.text]);
      } else if (data.type === 'stats') {
        setStats(data.stats);
      }
    };

    return () => {
      ws.close();
    };
  }, [meetingId]);

  return (
    <div className="p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Meeting Stats</h2>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(stats).map(([status, count]) => (
            <div
              key={status}
              className="p-4 rounded-lg bg-gray-100"
            >
              <div className="text-lg font-semibold">{status}</div>
              <div className="text-2xl">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Your Status</h2>
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => updateStatus(AttendeeStatus.ENGAGED)}
            className={`p-4 rounded-lg ${
              currentStatus === AttendeeStatus.ENGAGED
                ? 'bg-green-500 text-white'
                : 'bg-gray-100'
            }`}
          >
            Engaged
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.CONFUSED)}
            className={`p-4 rounded-lg ${
              currentStatus === AttendeeStatus.CONFUSED
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100'
            }`}
          >
            Confused
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.IDEA)}
            className={`p-4 rounded-lg ${
              currentStatus === AttendeeStatus.IDEA
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100'
            }`}
          >
            Idea
          </button>
          <button
            onClick={() => updateStatus(AttendeeStatus.DISAGREE)}
            className={`p-4 rounded-lg ${
              currentStatus === AttendeeStatus.DISAGREE
                ? 'bg-red-500 text-white'
                : 'bg-gray-100'
            }`}
          >
            Disagree
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Transcription</h2>
        <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
          {transcription.map((text, index) => (
            <p key={index} className="mb-2">{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
};
