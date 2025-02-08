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
          <JoinMeeting
            meetingId={meeting.id}
            onJoined={handleJoinedMeeting}
          />
        )}

        {meeting && attendee && (
          <MeetingRoom
            meetingId={meeting.id}
            attendeeId={attendee.id}
          />
        )}
      </div>
    </div>
  );
}

export default App;
