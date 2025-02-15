import React, { useState } from 'react';
import { Meeting } from '../types/meeting.types';

interface CreateMeetingProps {
  onMeetingCreated: (meeting: Meeting) => void;
}

export const CreateMeeting: React.FC<CreateMeetingProps> = ({ onMeetingCreated }) => {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending request with title:', title);
      const response = await fetch('http://localhost:3000/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const meetingData = await response.json();
        console.log('Meeting created successfully:', meetingData);

        // Convert snake_case to camelCase for frontend use
        const meeting: Meeting = {
          id: meetingData.meeting_id,
          uuid: meetingData.meeting_uuid,
          title: meetingData.title,
          createdAt: meetingData.created_at,
          updatedAt: meetingData.updated_at,
          qrCode: meetingData.qr_code
        };

        onMeetingCreated(meeting);
        setTitle('');
      } else {
        const errorText = await response.text();
        console.error('Failed to create meeting:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        setError('Failed to create meeting. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-center">Create New Meeting</h2>
      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="title" className="block text-xl font-medium text-gray-700 mb-2">
            Meeting Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xl py-3 px-4"
            required
            placeholder="Enter meeting title..."
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Meeting'}
        </button>
      </form>
    </div>
  );
};
