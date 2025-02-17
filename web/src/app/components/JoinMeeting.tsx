import React, { useState } from 'react';
import { Attendee, Meeting } from '../types/meeting.types';
import { config } from '../config';

interface JoinMeetingProps {
  meeting: Meeting;
  onJoined: (attendee: Attendee) => void;
}

export const JoinMeeting: React.FC<JoinMeetingProps> = ({ meeting, onJoined }) => {
  const [name, setName] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const joinUrl = `${window.location.origin}/join/${meeting.id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${config.apiUrl}/api/meetings/${meeting.id}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const attendee = await response.json();
        onJoined(attendee);
        setName('');
      }
    } catch (error) {
      console.error('Failed to join meeting:', error);
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
    <div className="space-y-4">
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

        <div className="mt-6">
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
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Join Meeting
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
