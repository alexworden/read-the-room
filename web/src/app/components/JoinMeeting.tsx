import React, { useState } from 'react';
import { Attendee, Meeting } from '../types/meeting.types';

interface JoinMeetingProps {
  meetingId: string;
  meeting: Meeting;
  onJoined: (attendee: Attendee) => void;
}

export const JoinMeeting: React.FC<JoinMeetingProps> = ({ meetingId, meeting, onJoined }) => {
  const [name, setName] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const joinUrl = `${window.location.origin}/join/${meetingId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/meetings/${meetingId}/attendees`, {
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
    <div className="space-y-8">
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Meeting: {meeting.title}</h2>
        <div className="flex justify-center mb-4">
          <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img 
              src={meeting.qrCode} 
              alt="Meeting QR Code" 
              className="w-64 h-64 cursor-pointer hover:opacity-80 transition-opacity"
              title="Click to open join URL" 
            />
          </a>
        </div>
        <p className="text-sm text-gray-600 text-center mb-2">
          Share this QR code with attendees to join the meeting
        </p>
        <div className="flex items-center justify-center space-x-2 mt-2">
          <a 
            href={joinUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Link to join meeting
          </a>
          <button
            onClick={copyToClipboard}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Copy to clipboard"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-500"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              {showCopied ? (
                // Checkmark icon
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7"
                />
              ) : (
                // Copy icon
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              )}
            </svg>
          </button>
          {showCopied && (
            <span className="text-sm text-green-600">
              Copied!
            </span>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Join Meeting</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Join Meeting
          </button>
        </form>
      </div>
    </div>
  );
};
