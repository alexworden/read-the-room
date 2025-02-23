import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Meeting, Attendee, Comment, ATTENDEE_STATUS, REACTION_TYPE } from '../types/meeting.types';
import { io, Socket } from 'socket.io-client';
import { debounce } from 'lodash';
import { config } from '../config';
import { FiCopy, FiMessageCircle, FiShare2 } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
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
    total: number;
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
  const joinUrl = `${window.location.origin}/join/${meeting.meetingCode}`;
  const socketRef = useRef<Socket | null>(null);

  const [activeReactions, setActiveReactions] = useState<Record<string, { type: string; timeoutId: number }>>({});

  // Scroll comments into view when new ones arrive
  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
    }
  }, [comments]);

  // Debounced stats update to prevent rapid UI updates
  const updateStats = useCallback(
    debounce((newStats: { inactive: number; engaged: number; confused: number; agree: number; disagree: number; total: number }) => {
      console.log('Updating stats state:', newStats);
      setStats(newStats);
    }, 500),
    []
  );

  // Clear reaction after 10 seconds
  const clearReactionAfterDelay = useCallback((attendeeId: string) => {
    const timeoutId = window.setTimeout(() => {
      setActiveReactions(current => {
        const { [attendeeId]: _, ...rest } = current;
        return rest;
      });
    }, 10000);
    return timeoutId;
  }, []);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const socket = io(config.apiUrl, {
          transports: ['websocket'],
          autoConnect: false
        });

        socketRef.current = socket;

        socket.connect();
        socket.emit('joinMeeting', {
          meetingUuid: meeting.meetingUuid,
          attendeeId: attendee.id
        });

        socket.on('joinedMeeting', (data: { currentStatus: string }) => {
          setIsConnecting(false);
          if (data?.currentStatus) {
            setCurrentStatus(data.currentStatus);
          }
        });

        socket.on('statusUpdated', ({ attendeeId, status }) => {
          setAttendees(current =>
            current.map(a =>
              a.id === attendeeId ? { ...a, currentStatus: status } : a
            )
          );
        });

        socket.on('attendeesUpdated', (updatedAttendees: Attendee[]) => {
          setAttendees(updatedAttendees);
        });

        socket.on('commentsUpdated', (updatedComments: Comment[]) => {
          setComments(updatedComments);
        });

        socket.on('stats', (newStats: Record<string, number>) => {
          console.log('Received stats update:', newStats);
          // Ensure all required properties are present with default values
          const formattedStats = {
            inactive: newStats.inactive || 0,
            engaged: newStats.engaged || 0,
            confused: newStats.confused || 0,
            agree: newStats.agree || 0,
            disagree: newStats.disagree || 0,
            total: newStats.total || 0
          };
          console.log('Formatted stats:', formattedStats);
          updateStats(formattedStats);
        });

        socket.on('error', (error: { message: string }) => {
          console.error('Socket error:', error.message);
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            setIsConnecting(true);
            socket.connect();
          }
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnecting(true);
        });

        socket.on('connect', () => {
          console.log('Socket connected/reconnected, rejoining meeting');
          // Rejoin the meeting when socket reconnects
          socket.emit('joinMeeting', {
            meetingUuid: meeting.meetingUuid,
            attendeeId: attendee.id
          });
        });

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit('heartbeat', {
              meetingUuid: meeting.meetingUuid,
              attendeeId: attendee.id
            });
          }
        }, 30000); // Send heartbeat every 30 seconds

        return () => {
          clearInterval(heartbeatInterval);
          socket.emit('leaveMeeting', {
            meetingUuid: meeting.meetingUuid,
            attendeeId: attendee.id
          });
          socket.disconnect();
        };
      } catch (error) {
        console.error('Socket connection error:', error);
        setIsConnecting(false);
      }
    };

    connectSocket();
  }, [meeting.meetingUuid, attendee.id, retryCount]);

  useEffect(() => {
    return () => {
      // Clear all timeouts on unmount
      setActiveReactions(current => {
        Object.values(current).forEach(reaction => {
          window.clearTimeout(reaction.timeoutId);
        });
        return {};
      });
    };
  }, [setActiveReactions]);

  const handleStatusChange = (status: string) => {
    if (!socketRef.current?.connected) return;

    setCurrentStatus(status);
    socketRef.current.emit('updateStatus', {
      meetingUuid: meeting.meetingUuid,
      attendeeId: attendee.id,
      status
    });
  };

  const handleReaction = (type: string) => {
    if (!socketRef.current?.connected) return;

    console.log('Sending reaction:', type);
    socketRef.current.emit('reaction', {
      meetingUuid: meeting.meetingUuid,
      attendeeId: attendee.id,
      reaction: { type }
    });

    // Update local state immediately for responsive UI
    setActiveReactions(current => {
      const oldTimeoutId = current[attendee.id]?.timeoutId;
      if (oldTimeoutId) {
        window.clearTimeout(oldTimeoutId);
      }
      
      return {
        ...current,
        [attendee.id]: {
          type,
          timeoutId: clearReactionAfterDelay(attendee.id)
        }
      };
    });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !socketRef.current?.connected) return;

    socketRef.current.emit('comment', {
      meetingUuid: meeting.meetingUuid,
      attendeeId: attendee.id,
      content: newComment.trim()
    });

    setNewComment('');
  };

  const updateStatus = async (status: string) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    try {
      socketRef.current.emit('updateStatus', {
        meetingUuid: meeting.meetingUuid,
        attendeeId: attendee.id,
        status
      });
      setCurrentStatus(status);
    } catch (error) {
      console.error('Error sending status update:', error);
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

  const addComment = async () => {
    if (!socketRef.current?.connected || !newComment.trim()) {
      return;
    }

    try {
      socketRef.current.emit('addComment', {
        meetingUuid: meeting.meetingUuid,
        attendeeId: attendee.id,
        content: newComment.trim()
      });
      setNewComment('');
    } catch (error) {
      console.error('Error sending comment:', error);
    }
  };

  const chartData = {
    labels: [
      ATTENDEE_STATUS.ENGAGED,
      ATTENDEE_STATUS.CONFUSED,
      ATTENDEE_STATUS.INACTIVE,
      REACTION_TYPE.AGREE,
      REACTION_TYPE.DISAGREE
    ],
    datasets: [
      {
        label: 'Attendee Status & Reactions',
        data: [
          stats?.engaged || 0,
          stats?.confused || 0,
          stats?.inactive || 0,
          stats?.agree || 0,
          stats?.disagree || 0
        ],
        backgroundColor: ['#10B981', '#FBBF24', '#9CA3AF', '#3B82F6', '#EF4444'],
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(tooltipItem: TooltipItem<"bar">) {
            const value = tooltipItem.raw as number;
            const total = stats?.total || 1;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: stats?.total || 5, // Set max scale to total attendees
        ticks: {
          stepSize: Math.max(1, Math.floor((stats?.total || 5) / 5)) // Show about 5 tick marks
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Meeting Title, Share, and QR Code */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl sm:text-3xl font-semibold">{meeting.title}</h1>
          <button
            onClick={copyToClipboard}
            className="p-2 text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded relative"
            title="Copy meeting link"
          >
            <FiShare2 className="w-6 h-6" />
            {showCopied && (
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded">
                Copied!
              </span>
            )}
          </button>
        </div>
        <img
          src={meeting.qrCode}
          alt="QR Code"
          className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
        />
      </div>

      {/* Stats Chart */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="h-64">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Status and Reactions */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between">
          {/* Status */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Status</h2>
            <div className="flex justify-start space-x-4">
              <button
                onClick={() => handleStatusChange(ATTENDEE_STATUS.ENGAGED)}
                className={`p-3 rounded-lg text-2xl ${
                  currentStatus === ATTENDEE_STATUS.ENGAGED
                    ? 'bg-green-100 ring-2 ring-green-400'
                    : 'bg-white hover:bg-gray-100'
                } transition-colors duration-200`}
                title="Engaged"
              >
                😊
              </button>
              <button
                onClick={() => handleStatusChange(ATTENDEE_STATUS.CONFUSED)}
                className={`p-3 rounded-lg text-2xl ${
                  currentStatus === ATTENDEE_STATUS.CONFUSED
                    ? 'bg-yellow-100 ring-2 ring-yellow-400'
                    : 'bg-white hover:bg-gray-100'
                } transition-colors duration-200`}
                title="Confused"
              >
                🤔
              </button>
              <button
                onClick={() => handleStatusChange(ATTENDEE_STATUS.INACTIVE)}
                className={`p-3 rounded-lg text-2xl ${
                  currentStatus === ATTENDEE_STATUS.INACTIVE
                    ? 'bg-gray-200 ring-2 ring-gray-400'
                    : 'bg-white hover:bg-gray-100'
                } transition-colors duration-200`}
                title="Inactive"
              >
                😴
              </button>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-20 border-l border-gray-200 mx-6"></div>

          {/* Reactions */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Quick Reactions</h2>
            <div className="flex justify-start space-x-4">
              <button
                onClick={() => handleReaction(REACTION_TYPE.AGREE)}
                className={`p-3 rounded-lg text-2xl ${
                  activeReactions[attendee.id]?.type === REACTION_TYPE.AGREE
                    ? 'bg-blue-100 animate-pulse'
                    : 'bg-white hover:bg-gray-100'
                } transition-colors duration-200`}
                title="Agree"
              >
                👍
              </button>
              <button
                onClick={() => handleReaction(REACTION_TYPE.DISAGREE)}
                className={`p-3 rounded-lg text-2xl ${
                  activeReactions[attendee.id]?.type === REACTION_TYPE.DISAGREE
                    ? 'bg-red-100 animate-pulse'
                    : 'bg-white hover:bg-gray-100'
                } transition-colors duration-200`}
                title="Disagree"
              >
                👎
              </button>
            </div>
          </div>
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
            onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(e)}
          />
          <button
            onClick={handleCommentSubmit}
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
