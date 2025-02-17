import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Meeting, Attendee, AttendeeStatus } from './types/meeting.types';
import { CreateMeeting } from './components/CreateMeeting';
import { JoinMeeting } from './components/JoinMeeting';
import { MeetingRoom } from './components/MeetingRoom';
import { config } from './config';
import { convertAttendeeData } from './utils/attendee.utils';

// Wrapper component for CreateMeeting to handle navigation
const CreateMeetingWrapper = () => {
  const navigate = useNavigate();

  const handleMeetingCreated = async (newMeeting: Meeting, attendeeName: string) => {
    try {
      // Join the meeting as the creator
      const joinResponse = await fetch(`${config.apiUrl}/api/meetings/${newMeeting.meetingCode}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: attendeeName }),
      });

      if (!joinResponse.ok) {
        throw new Error('Failed to join meeting');
      }

      const attendeeData = await joinResponse.json();
      const attendee = convertAttendeeData(attendeeData);

      // Navigate directly to the meeting room
      navigate(`/room/${newMeeting.meetingCode}`, { 
        state: { 
          meeting: newMeeting,
          attendee: attendee
        } 
      });
    } catch (error) {
      console.error('Failed to join meeting:', error);
      // If join fails, navigate to join page as fallback
      navigate(`/join/${newMeeting.meetingCode}`, { state: { meeting: newMeeting } });
    }
  };

  return <CreateMeeting onMeetingCreated={handleMeetingCreated} />;
};

// Wrapper component for JoinMeeting to handle URL parameters
const JoinMeetingWrapper = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      // Reset error state on each attempt
      setError(null);
      
      // If no meetingId is provided or if it's "undefined", redirect to home
      if (!meetingId || meetingId === 'undefined') {
        setError('Invalid meeting ID');
        navigate('/');
        return;
      }

      try {
        // Fetch meeting details
        const meetingResponse = await fetch(`${config.apiUrl}/api/meetings/${meetingId}`);
        if (!meetingResponse.ok) {
          throw new Error(`Failed to fetch meeting: ${meetingResponse.statusText}`);
        }
        const meetingData = await meetingResponse.json();

        // Convert snake_case to camelCase
        const meeting: Meeting = {
          id: meetingData.meeting_id,
          uuid: meetingData.meeting_uuid,
          title: meetingData.title,
          createdAt: meetingData.created_at,
          updatedAt: meetingData.updated_at,
          qrCode: meetingData.qr_code,
          meetingCode: meetingData.meeting_code
        };

        setMeeting(meeting);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch meeting data';
        setError(errorMessage);
        console.error(errorMessage);
        navigate('/');
      }
    };

    fetchMeetingData();
  }, [meetingId, navigate]);

  // Show error state if there's an error
  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error: {error}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Show loading state while fetching meeting data
  if (!meeting) {
    return <div className="text-center p-8">Loading...</div>;
  }

  const handleJoined = async (attendeeData: any) => {
    const attendee = convertAttendeeData(attendeeData);
    navigate(`/room/${meeting.meetingCode}`, { state: { meeting, attendee } });
  };

  return <JoinMeeting meeting={meeting} onJoined={handleJoined} />;
};

// Wrapper component for MeetingRoom to handle state
const MeetingRoomWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Ensure we have the required state
  if (!location.state?.meeting || !location.state?.attendee) {
    navigate('/');
    return null;
  }

  const { meeting, attendee } = location.state;
  return <MeetingRoom meeting={meeting} attendee={attendee} />;
};

// Layout component that contains the routes
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/create" replace />} />
          <Route path="/create" element={<CreateMeetingWrapper />} />
          <Route path="/join/:meetingId" element={<JoinMeetingWrapper />} />
          <Route path="/room/:meetingId" element={<MeetingRoomWrapper />} />
        </Routes>
      </div>
    </div>
  );
};

// Main App component
export default function App() {
  return <AppLayout />;
}
