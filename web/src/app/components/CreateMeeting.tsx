import React, { useState } from 'react';
import { Meeting } from '../types/meeting.types';

interface CreateMeetingProps {
  onMeetingCreated: (meeting: Meeting) => void;
}

export const CreateMeeting: React.FC<CreateMeetingProps> = ({ onMeetingCreated }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log('Sending request with title:', title);
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const meeting = await response.json();
        console.log('Meeting created successfully:', meeting);

        // Fetch QR code
        const qrResponse = await fetch(`/api/meetings/${meeting.id}/qr`);
        if (qrResponse.ok) {
          const { qrCode } = await qrResponse.json();
          meeting.qrCode = qrCode;
        }

        onMeetingCreated(meeting);
        setTitle('');
      } else {
        const errorText = await response.text();
        console.error('Failed to create meeting:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Create New Meeting</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Meeting Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create Meeting
        </button>
      </form>
    </div>
  );
};
