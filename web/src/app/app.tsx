import { useState } from 'react';
import { Meeting, Attendee } from './types/meeting.types';
import { CreateMeeting } from './components/CreateMeeting';
import { JoinMeeting } from './components/JoinMeeting';
import { MeetingRoom } from './components/MeetingRoom';

export function App() {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendee, setAttendee] = useState<Attendee | null>(null);

  const handleMeetingCreated = (newMeeting: Meeting) => {
    setMeeting(newMeeting);
  };

  const handleJoinedMeeting = (newAttendee: Attendee) => {
    setAttendee(newAttendee);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Read The Room</h1>
        
        {!meeting && (
          <CreateMeeting onMeetingCreated={handleMeetingCreated} />
        )}

        {meeting && !attendee && (
          <div className="space-y-8">
            <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Meeting Created: {meeting.title}</h2>
              <div className="flex justify-center mb-4">
                <img src={meeting.qrCode} alt="Meeting QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Share this QR code with attendees to join the meeting
              </p>
            </div>
            <JoinMeeting
              meetingId={meeting.id}
              onJoined={handleJoinedMeeting}
            />
          </div>
        )}

        {meeting && attendee && (
          <MeetingRoom
            meetingId={meeting.id}
            attendeeId={attendee.id}
            meeting={meeting}
          />
        )}
      </div>
    </div>
  );
}

export default App;
