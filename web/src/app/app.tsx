import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Meeting, Attendee } from './types/meeting.types';
import { CreateMeeting } from './components/CreateMeeting';
import { JoinMeeting } from './components/JoinMeeting';
import { MeetingRoom } from './components/MeetingRoom';

// Wrapper component for CreateMeeting to handle navigation
const CreateMeetingWrapper = () => {
  const navigate = useNavigate();

  const handleMeetingCreated = (newMeeting: Meeting) => {
    navigate(`/join/${newMeeting.id}`, { state: { meeting: newMeeting } });
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
        const meetingResponse = await fetch(`http://localhost:3000/api/meetings/${meetingId}`);
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
          qrCode: meetingData.qr_code
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

  return <JoinMeeting meeting={meeting} onJoined={(attendee) => {
    navigate(`/room/${meeting.id}`, { state: { meeting, attendee } });
  }} />;
};

// Wrapper component for MeetingRoom to handle state
const MeetingRoomWrapper = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { meeting, attendee } = location.state || {};

  useEffect(() => {
    if (!meeting || !attendee) {
      navigate('/');
    }
  }, [meeting, attendee, navigate]);

  return meeting && attendee ? (
    <MeetingRoom
      meeting={meeting}
      attendee={attendee}
    />
  ) : null;
};

// Layout component that contains the routes
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <Routes>
          <Route path="/" element={<CreateMeetingWrapper />} />
          <Route path="/join/:meetingId" element={<JoinMeetingWrapper />} />
          <Route path="/room/:meetingId" element={<MeetingRoomWrapper />} />
        </Routes>
      </div>
    </div>
  );
};

// Main App component
export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
