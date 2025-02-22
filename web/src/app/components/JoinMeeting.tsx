import React, { useState, useEffect } from 'react';
import { Attendee, Meeting, ATTENDEE_STATUS } from '../types/meeting.types';
import { config } from '../config';
import { useNavigate } from 'react-router-dom';

interface JoinMeetingProps {
  meeting: Meeting;
  onJoined: (attendeeData: any) => void;
}

export const JoinMeeting: React.FC<JoinMeetingProps> = ({ meeting, onJoined }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Meeting prop:', meeting);
  }, [meeting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Join meeting
      const response = await fetch(`${config.apiUrl}/api/meetings/${meeting.meetingCode}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to join meeting: ${response.statusText}`);
      }

      const attendee: Attendee = await response.json();
      console.log('Server response:', JSON.stringify(attendee, null, 2));

      // Validate the attendee data
      if (!attendee.id || !attendee.meetingUuid) {
        throw new Error('Invalid response from server: missing required attendee data');
      }

      // Store attendee ID in localStorage
      localStorage.setItem(`attendee_${meeting.meetingCode}`, attendee.id);

      // Set initial status
      attendee.currentStatus = ATTENDEE_STATUS.ENGAGED;

      // Navigate to meeting room with required state
      navigate(`/room/${meeting.meetingCode}`, {
        state: {
          meeting,
          attendee
        }
      });
    } catch (error) {
      console.error('Error joining meeting:', error);
      setError(error instanceof Error ? error.message : 'Failed to join meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">{meeting.title}</h2>
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Your Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter your name"
          />
        </div>

        {error && (
          <div className="mb-4 text-red-500 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={loading}
        >
          {loading ? 'Joining...' : 'Join Meeting'}
        </button>
      </form>
    </div>
  );
};
