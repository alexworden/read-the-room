import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Meeting, Attendee, AttendeeStatus } from './types/meeting.types';
import { CreateMeeting } from './components/CreateMeeting';
import { JoinMeeting } from './components/JoinMeeting';
import { MeetingRoom } from './components/MeetingRoom';
import { HostView } from './components/HostView';
import { config } from './config';
import { convertAttendeeData } from './utils/attendee.utils';

// Wrapper component for JoinMeeting to handle URL parameters
const JoinMeetingWrapper = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetingData();
  }, [meetingId]);

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
      console.log('API Response:', meetingData);

      // Validate required fields
      if (!meetingData.meetingUuid || !meetingData.meetingCode || !meetingData.title) {
        console.error('Invalid meeting data received:', meetingData);
        throw new Error('Invalid meeting data received from server');
      }

      // Convert to Meeting type
      const meeting: Meeting = {
        meetingCode: meetingData.meetingCode,
        meetingUuid: meetingData.meetingUuid,
        title: meetingData.title,
        createdAt: meetingData.createdAt || new Date().toISOString(),
        updatedAt: meetingData.updatedAt || new Date().toISOString(),
        qrCode: meetingData.qrCode,
        transcription: meetingData.transcription || [],
        attendees: meetingData.attendees || [],
        comments: meetingData.comments || []
      };
      console.log('Converted Meeting:', meeting);
      
      setMeeting(meeting);
    } catch (error) {
      console.error('Error fetching meeting data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch meeting');
      navigate('/');
    }
  };

  const handleJoined = (attendeeData: any) => {
    if (!meeting) return;
    
    const attendee = convertAttendeeData(attendeeData);
    navigate(`/room/${meeting.meetingCode}`, {
      state: { meeting, attendee }
    });
  };

  if (error) {
    return (
      <div className="text-red-500">
        {error}
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-gray-500">
        Loading meeting...
      </div>
    );
  }

  return <JoinMeeting meeting={meeting} onJoined={handleJoined} />;
};

// Wrapper component for MeetingRoom to handle state
const MeetingRoomWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have state from navigation, use it
    if (location.state?.meeting && location.state?.attendee) {
      setMeeting(location.state.meeting);
      setAttendee(location.state.attendee);
      setLoading(false);
      return;
    }

    // Otherwise fetch the data
    const fetchMeetingData = async () => {
      try {
        // Fetch meeting details
        const meetingResponse = await fetch(`${config.apiUrl}/api/meetings/${meetingId}`);
        if (!meetingResponse.ok) {
          throw new Error(`Failed to fetch meeting: ${meetingResponse.statusText}`);
        }
        const meetingData = await meetingResponse.json();
        
        // Convert to Meeting type
        const meetingObj: Meeting = {
          meetingCode: meetingData.meetingCode,
          meetingUuid: meetingData.meetingUuid,
          title: meetingData.title,
          createdAt: meetingData.createdAt || new Date().toISOString(),
          updatedAt: meetingData.updatedAt || new Date().toISOString(),
          qrCode: meetingData.qrCode,
          transcription: meetingData.transcription || [],
          attendees: meetingData.attendees || [],
          comments: meetingData.comments || []
        };
        setMeeting(meetingObj);

        // Get the stored attendee ID from localStorage
        const storedAttendeeId = localStorage.getItem(`attendee_${meetingId}`);
        if (!storedAttendeeId) {
          navigate(`/join/${meetingId}`);
          return;
        }

        // Fetch attendee details
        const attendeeResponse = await fetch(`${config.apiUrl}/api/meetings/${meetingId}/attendees/${storedAttendeeId}`);
        if (!attendeeResponse.ok) {
          throw new Error(`Failed to fetch attendee: ${attendeeResponse.statusText}`);
        }
        const attendeeData = await attendeeResponse.json();
        setAttendee(attendeeData);
        
      } catch (error) {
        console.error('Error fetching meeting data:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingData();
  }, [meetingId, location.state, navigate]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!meeting || !attendee) {
    return null;
  }

  return <MeetingRoom meeting={meeting} attendee={attendee} />;
};

// Wrapper component for HostView to handle state
const HostViewWrapper = () => {
  const { meetingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetingData = async () => {
      setLoading(true);
      try {
        // If we have meeting data in location state, use it
        if (location.state?.meeting && location.state?.attendeeId) {
          setMeeting(location.state.meeting);
          setLoading(false);
          return;
        }

        // If missing required data, redirect to create page
        navigate('/create');
      } catch (error) {
        console.error('Failed to fetch meeting:', error);
        navigate('/create');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingData();
  }, [meetingId, location.state, navigate]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!meeting || !location.state?.attendeeId) {
    return null;
  }

  return (
    <div className="w-full max-w-none">
      <HostView 
        meeting={meeting}
        hostName={location.state?.hostName || 'Host'}
        attendeeId={location.state.attendeeId}
      />
    </div>
  );
};

// Layout component that contains the routes
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route 
          path="/" 
          element={
            <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-8">
              <Navigate to="/create" replace />
            </div>
          } 
        />
        <Route 
          path="/create" 
          element={
            <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-8">
              <CreateMeeting />
            </div>
          } 
        />
        <Route 
          path="/join/:meetingId" 
          element={
            <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-8">
              <JoinMeetingWrapper />
            </div>
          } 
        />
        <Route 
          path="/room/:meetingId" 
          element={
            <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-8">
              <MeetingRoomWrapper />
            </div>
          } 
        />
        <Route 
          path="/host/:meetingId" 
          element={<HostViewWrapper />} 
        />
      </Routes>
    </div>
  );
};

// Main App component
export default function App() {
  return <AppLayout />;
}
