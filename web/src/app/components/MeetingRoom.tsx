import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Meeting, Attendee, Comment, ATTENDEE_STATUS, REACTION_TYPE, ReactionType } from '../types/meeting.types';
import { io, Socket } from 'socket.io-client';
import { debounce } from 'lodash';
import { config } from '../config';
import { IconType } from 'react-icons';
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
  ChartOptions,
  TooltipCallbacks,
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
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const MAX_RETRIES = 3;
  const joinUrl = `${window.location.origin}/join/${meeting.meetingCode}`;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [activeReactions, setActiveReactions] = useState<Record<string, { type: ReactionType; timeoutId: number }>>({});

  // Scroll comments into view when new ones arrive
  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
    }
  }, [comments]);

  // Debounced stats update to prevent rapid UI updates
  const updateStats = useCallback(
    debounce((newStats: { inactive: number; engaged: number; confused: number; agree: number; disagree: number; total: number }) => {
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

  // Socket connection and event handlers
  useEffect(() => {
    const socket = io(config.apiUrl, {
      path: '/socket.io',
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join the meeting room after connecting
      socket.emit('joinMeeting', {
        meetingUuid: meeting.meetingUuid,
        attendeeId: attendee.id
      });
    });

    socket.on('joinedMeeting', (data: { currentStatus: string }) => {
      if (data?.currentStatus) {
        setCurrentStatus(data.currentStatus);
      }
      // Request initial comments and stats
      socket.emit('getComments', { meetingUuid: meeting.meetingUuid });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      setCommentError(error.message);
    });

    // Handle new comments
    socket.on('newComment', (comment: Comment) => {
      setComments(prevComments => {
        // Check if comment already exists to prevent duplicates
        if (prevComments.some(c => c.id === comment.id)) {
          return prevComments;
        }
        return [...prevComments, comment];
      });
      const scrollToBottom = () => {
        if (commentsRef.current) {
          commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
        }
      };
      scrollToBottom();
    });

    // Handle comments updated
    socket.on('commentsUpdated', (updatedComments: Comment[]) => {
      setComments(updatedComments);
      const scrollToBottom = () => {
        if (commentsRef.current) {
          commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
        }
      };
      scrollToBottom();
    });

    socket.on('stats', (newStats: {
      [ATTENDEE_STATUS.ENGAGED]: number;
      [ATTENDEE_STATUS.CONFUSED]: number;
      [ATTENDEE_STATUS.INACTIVE]: number;
      [REACTION_TYPE.AGREE]: number;
      [REACTION_TYPE.DISAGREE]: number;
    }) => {
      const formattedStats = {
        engaged: newStats[ATTENDEE_STATUS.ENGAGED] || 0,
        confused: newStats[ATTENDEE_STATUS.CONFUSED] || 0,
        inactive: newStats[ATTENDEE_STATUS.INACTIVE] || 0,
        agree: newStats[REACTION_TYPE.AGREE] || 0,
        disagree: newStats[REACTION_TYPE.DISAGREE] || 0,
        total: Object.values(newStats).reduce((sum, count) => sum + count, 0)
      };
      setStats(formattedStats);
    });

    socket.on('reactions', (reactions: Record<string, { type: ReactionType; timestamp: number }>) => {
      // Transform reactions to match our state type
      const formattedReactions = Object.entries(reactions).reduce((acc, [key, reaction]) => {
        // Create a timeout to remove the reaction after 3 seconds
        const timeoutId = window.setTimeout(() => {
          setActiveReactions(prev => {
            const { [key]: _, ...rest } = prev;
            return rest;
          });
        }, 3000);

        acc[key] = { type: reaction.type, timeoutId };
        return acc;
      }, {} as Record<string, { type: ReactionType; timeoutId: number }>);

      setActiveReactions(formattedReactions);
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

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off('newComment');
      socket.off('commentsUpdated');
      socket.off('stats');
      socket.off('reactions');
      socket.off('joinedMeeting');
      socket.emit('leaveMeeting', {
        meetingUuid: meeting.meetingUuid,
        attendeeId: attendee.id
      });
      socket.disconnect();
    };
  }, [meeting.meetingUuid, attendee.id]);

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

  const updateStatus = useCallback((newStatus: string) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    socketRef.current.emit('updateStatus', {
      meetingUuid: meeting.meetingUuid,
      attendeeId: attendee.id,
      status: newStatus
    });
    setCurrentStatus(newStatus);
  }, [meeting.meetingUuid, attendee.id]);

  const sendReaction = useCallback((type: ReactionType) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    socketRef.current.emit('reaction', {
      meetingUuid: meeting.meetingUuid,
      attendeeId: attendee.id,
      reaction: { type }
    });

    // Add local reaction animation
    setActiveReactions(current => {
      // Clear existing reaction for this attendee if it exists
      if (current[attendee.id]) {
        window.clearTimeout(current[attendee.id].timeoutId);
      }
      
      return {
        ...current,
        [attendee.id]: {
          type,
          timeoutId: clearReactionAfterDelay(attendee.id)
        }
      };
    });
  }, [meeting.meetingUuid, attendee.id, clearReactionAfterDelay]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    
    if (!newComment.trim()) {
      return;
    }
    
    if (!socketRef.current?.connected) {
      setCommentError('Not connected to server. Please try again.');
      return;
    }

    setIsSubmittingComment(true);
    
    try {
      // Create a promise that resolves on either newComment or commentsUpdated
      const commentPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Comment submission timed out'));
        }, 5000); // 5 second timeout

        // Set up one-time error handler for this submission
        socketRef.current?.once('error', (error: { message: string }) => {
          clearTimeout(timeout);
          reject(new Error(error.message));
        });

        // Set up one-time success handlers for either event
        const handleSuccess = () => {
          clearTimeout(timeout);
          resolve(true);
        };

        socketRef.current?.once('newComment', handleSuccess);
        socketRef.current?.once('commentsUpdated', handleSuccess);

        // Clean up event listeners on timeout or error
        const cleanup = () => {
          socketRef.current?.off('newComment', handleSuccess);
          socketRef.current?.off('commentsUpdated', handleSuccess);
        };

        // Emit the comment
        socketRef.current?.emit('comment', {
          meetingUuid: meeting.meetingUuid,
          attendeeId: attendee.id,
          content: newComment.trim()
        });
      });

      // Clear input immediately for better UX
      setNewComment('');
      
      // Wait for the comment to be processed
      await commentPromise;
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit comment. Please try again.';
      setCommentError(errorMessage);
      setNewComment(newComment.trim()); // Restore the comment text
    } finally {
      setIsSubmittingComment(false);
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

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(tooltipItem: TooltipItem<'bar'>) {
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
            className="relative p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Copy meeting link"
          >
            {FiShare2({ size: 24 })}
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
                onClick={() => updateStatus(ATTENDEE_STATUS.ENGAGED)}
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
                onClick={() => updateStatus(ATTENDEE_STATUS.CONFUSED)}
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
                onClick={() => updateStatus(ATTENDEE_STATUS.INACTIVE)}
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
                onClick={() => sendReaction(REACTION_TYPE.AGREE)}
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
                onClick={() => sendReaction(REACTION_TYPE.DISAGREE)}
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
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                {comment.attendeeName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-2">
                <p className="text-sm font-semibold">{comment.attendeeName}</p>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
        {commentError && (
          <div className="text-red-500 text-sm mb-2">{commentError}</div>
        )}
        <div className="flex space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type your comment..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCommentSubmit(e)}
          />
          <button
            onClick={handleCommentSubmit}
            disabled={!newComment.trim() || isSubmittingComment}
            className={`p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubmittingComment ? 'animate-pulse' : ''
            }`}
          >
            {isSubmittingComment ? '...' : FiMessageCircle({ size: 20 })}
          </button>
        </div>
      </div>
    </div>
  );
};
