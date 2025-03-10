import React, { useState } from 'react';
import { Meeting } from '../types/meeting.types';
import { config } from '../config';
import { useNavigate } from 'react-router-dom';

interface CreateMeetingProps {}

export const CreateMeeting: React.FC<CreateMeetingProps> = () => {
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Create the meeting
      const response = await fetch(`${config.apiUrl}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to create meeting');
      }

      const meeting: Meeting = await response.json();
      console.log('Meeting created successfully:', meeting);

      // Register as an attendee
      const attendeeResponse = await fetch(`${config.apiUrl}/api/meetings/${meeting.meetingCode}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!attendeeResponse.ok) {
        throw new Error('Failed to register as attendee');
      }

      const attendee = await attendeeResponse.json();
      console.log('Registered as attendee:', attendee);

      // Navigate to host view with both meeting and attendee info
      navigate(`/host/${meeting.meetingUuid}`, { 
        state: { 
          meeting, 
          hostName: name,
          attendeeId: attendee.id
        } 
      });
      
      setTitle('');
      setName('');
    } catch (error) {
      console.error('Failed to create meeting:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Create a New Meeting</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full text-sm p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Meeting Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full text-sm p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter meeting title"
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
      </div>
    </div>
  );
};
