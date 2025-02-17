import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Meeting, Attendee, Comment, ATTENDEE_STATUS, REACTION_TYPE } from '../types/meeting.types';
import { io, Socket } from 'socket.io-client';
import { debounce } from 'lodash';
import { config } from '../config';
import { FiCopy, FiMessageCircle } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MeetingRoomProps {
  meeting: Meeting;
  attendee: Attendee;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meeting, attendee }) => {
  const [stats, setStats] = useState<{
    inactive: number;
    engaged: number;
    confused: number;
    agree: number;
    disagree: number;
  } | null>(null);

  const [transcription, setTranscription] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>(attendee.currentStatus || ATTENDEE_STATUS.ENGAGED);
  const [showCopied, setShowCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const commentsRef = useRef<HTMLDivElement>(null);
  const MAX_RETRIES = 3;
  const joinUrl = `${window.location.origin}/join/${meeting.id}`;
  const socketRef = useRef<Socket | null>(null);

  // Scroll comments into view when new ones arrive
  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
    }
  }, [comments]);

  // Debounced stats update to prevent rapid UI updates
  const updateStats = useCallback(
    debounce((newStats: Record<string, number>) => {
      setStats(newStats);
    }, 500),
    []
  );

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const socket = io(config.apiUrl, {
          transports: ['websocket'],
          path: '/socket.io',
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setIsConnecting(false);
          socket.emit('joinMeeting', {
            meetingId: meeting.id,
            attendeeId: attendee.id
          });
        });

        socket.on('statusUpdated', ({ attendeeId, status }) => {
          setAttendees((current) => 
            current.map((a) => {
              if (a.id === attendeeId) {
                return { ...a, currentStatus: status };
              }
              return a;
            })
          );
        });

        socket.on('reactionAdded', ({ attendeeId, reaction }) => {
          setAttendees((current) => {
            if (!current) return current;
            return current.map((a) => {
              if (a.id === attendeeId) {
                return {
                  ...a,
                  reactions: [...(a.reactions || []), reaction]
                };
              }
              return a;
            });
          });
        });

        socket.on('commentAdded', (comment) => {
          setComments((current) => [...current, comment]);
        });

        socket.on('attendeesUpdated', (updatedAttendees) => {
          setAttendees(updatedAttendees);
        });

        socket.on('stats', (newStats) => {
          setStats(newStats);
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        socket.on('disconnect', () => {
          setIsConnecting(true);
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            connectSocket();
          }
        });

        // Fetch initial data
        const [attendeesRes, commentsRes] = await Promise.all([
          fetch(`${config.apiUrl}/api/meetings/${meeting.id}/attendees`),
          fetch(`${config.apiUrl}/api/meetings/${meeting.id}/comments`)
        ]);

        if (attendeesRes.ok) {
          const attendeesList = await attendeesRes.json();
          setAttendees(attendeesList);
        }

        if (commentsRes.ok) {
          const commentsList = await commentsRes.json();
          setComments(commentsList);
        }

      } catch (error) {
        console.error('Failed to connect:', error);
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          connectSocket();
        }
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [meeting.id, attendee.id, retryCount]);

  const updateStatus = async (status: string) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    try {
      socketRef.current.emit('updateStatus', {
        meetingId: meeting.id,
        attendeeId: attendee.id,
        status
      });
      setCurrentStatus(status);
    } catch (error) {
      console.error('Error sending status update:', error);
    }
  };

  const addReaction = async (type: string) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    try {
      const reaction: { type: string; timestamp: Date } = {
        type,
        timestamp: new Date()
      };

      socketRef.current.emit('addReaction', {
        meetingId: meeting.id,
        attendeeId: attendee.id,
        reaction
      });
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  const addComment = async () => {
    if (!socketRef.current?.connected || !newComment.trim()) {
      return;
    }

    try {
      socketRef.current.emit('addComment', {
        meetingId: meeting.id,
        attendeeId: attendee.id,
        content: newComment.trim()
      });
      setNewComment('');
    } catch (error) {
      console.error('Error sending comment:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        // Use modern clipboard API if available
        await navigator.clipboard.writeText(joinUrl);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = joinUrl;
        
        // Avoid scrolling to bottom
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const chartData = {
    labels: [ATTENDEE_STATUS.INACTIVE, ATTENDEE_STATUS.ENGAGED, ATTENDEE_STATUS.CONFUSED],
    datasets: [
      {
        label: 'Attendee Status',
        data: [stats?.inactive || 0, stats?.engaged || 0, stats?.confused || 0],
        backgroundColor: ['#9CA3AF', '#10B981', '#FBBF24'],
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Meeting Info and QR Code */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-center">{meeting.title}</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="flex-1 text-center sm:text-left mb-4 sm:mb-0 sm:mr-6 min-w-0">
            <div className="flex items-center justify-center sm:justify-start space-x-2 w-full">
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm p-2 text-blue-600 hover:text-blue-800 underline break-all"
              >
                {joinUrl}
              </a>
              <button
                onClick={copyToClipboard}
                className="p-2 text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded flex-shrink-0"
                title={showCopied ? 'Copied!' : 'Copy link'}
              >
                <FiCopy className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-shrink-0 flex items-center justify-center">
            <img
              src={meeting.qrCode}
              alt="QR Code"
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
        </div>
      </div>

      {/* Stats Chart */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Meeting Stats</h2>
        <div className="h-64">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Status Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-2">{attendee.name}'s Status</h2>
        <p className="text-sm text-gray-600 mb-4">How are you following the meeting?</p>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => updateStatus(ATTENDEE_STATUS.INACTIVE)}
            className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
              currentStatus === ATTENDEE_STATUS.INACTIVE
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Inactive
          </button>
          <button
            onClick={() => updateStatus(ATTENDEE_STATUS.ENGAGED)}
            className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
              currentStatus === ATTENDEE_STATUS.ENGAGED
                ? 'bg-green-600 text-white'
                : 'bg-green-100 hover:bg-green-200'
            }`}
          >
            Engaged
          </button>
          <button
            onClick={() => updateStatus(ATTENDEE_STATUS.CONFUSED)}
            className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
              currentStatus === ATTENDEE_STATUS.CONFUSED
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-100 hover:bg-yellow-200'
            }`}
          >
            Confused
          </button>
        </div>
      </div>

      {/* Quick Reactions */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-2">Quick Reactions</h2>
        <p className="text-sm text-gray-600 mb-4">React to what's being presented</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => addReaction(REACTION_TYPE.AGREE)}
            className="p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base bg-blue-100 hover:bg-blue-200"
          >
            Agree
          </button>
          <button
            onClick={() => addReaction(REACTION_TYPE.DISAGREE)}
            className="p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base bg-red-100 hover:bg-red-200"
          >
            Disagree
          </button>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-2">Comments</h2>
        <div
          ref={commentsRef}
          className="mb-4 h-48 overflow-y-auto space-y-2 border rounded-lg p-2"
        >
          {comments.map((comment) => {
            const commentAttendee = attendees.find(a => a.id === comment.attendeeId);
            return (
              <div key={comment.id} className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {commentAttendee?.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-2">
                  <p className="text-sm font-semibold">{commentAttendee?.name}</p>
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type your comment..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addComment()}
          />
          <button
            onClick={addComment}
            disabled={!newComment.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiMessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
