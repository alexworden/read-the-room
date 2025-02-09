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

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        // Fetch meeting details
        const meetingResponse = await fetch(`/api/meetings/${meetingId}`);
        if (!meetingResponse.ok) {
          navigate('/');
          return;
        }
        const meetingData = await meetingResponse.json();

        // Fetch QR code
        const qrResponse = await fetch(`/api/meetings/${meetingId}/qr`);
        if (!qrResponse.ok) {
          navigate('/');
          return;
        }
        const { qrCode } = await qrResponse.json();
        
        // Combine meeting data with QR code
        setMeeting({
          ...meetingData,
          qrCode
        });
      } catch (error) {
        console.error('Failed to fetch meeting data:', error);
        navigate('/');
      }
    };

    if (meetingId) {
      fetchMeetingData();
    }
  }, [meetingId, navigate]);

  const handleJoinedMeeting = (attendee: Attendee) => {
    if (meeting) {
      navigate(`/room/${meeting.id}`, { state: { meeting, attendee } });
    }
  };

  return meeting ? (
    <JoinMeeting 
      meetingId={meeting.id} 
      meeting={meeting}
      onJoined={handleJoinedMeeting} 
    />
  ) : (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
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
      meetingId={meeting.id}
      attendeeId={attendee.id}
      meeting={meeting}
    />
  ) : null;
};

// Layout component that contains the routes
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Read The Room</h1>
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
