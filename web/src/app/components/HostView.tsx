import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Meeting, Attendee, ReactionType, REACTION_TYPE, MeetingStats, Comment } from '../types/meeting.types';
import { io, Socket } from 'socket.io-client';
import { debounce } from 'lodash';
import { config } from '../config';
import { Pie } from 'react-chartjs-2';
import { FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import { scaleLinear } from 'd3-scale';
import cloud from 'd3-cloud';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  Title
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title
);

interface HostViewProps {
  meeting: Meeting;
  hostName: string;
  attendeeId: string;
}

interface FloatingReaction {
  id: string;
  type: ReactionType;
  left: number;
  bottom: number;
  opacity: number;
}

interface WordCloudWord {
  text: string;
  value: number;
  size?: number;
  x?: number;
  y?: number;
  rotate?: number;
  font?: string;
  style?: string;
  weight?: string | number;
  padding?: number;
  color?: string;
}

export const HostView: React.FC<HostViewProps> = ({ meeting, hostName, attendeeId }) => {
  const [stats, setStats] = useState<MeetingStats>({
    inactive: 0,
    engaged: 0,
    confused: 0,
    total: 0,
    agree: 0,
    disagree: 0
  });
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [wordCloudData, setWordCloudData] = useState<WordCloudWord[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const animationFrameRef = useRef<number>();
  const wordCloudRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver>();
  const joinUrl = `${window.location.origin}/join/${meeting.meetingCode}`;

  const pieChartData: ChartData<'pie'> = {
    labels: ['Engaged', 'Confused', 'Inactive'],
    datasets: [{
      data: [stats.engaged, stats.confused, stats.inactive],
      backgroundColor: ['#4CAF50', '#FFC107', '#9E9E9E'],
      borderColor: ['#388E3C', '#FFA000', '#757575'],
      borderWidth: 1,
    }],
  };

  const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            size: 16,
            family: 'Arial, sans-serif',
          },
          padding: 20
        }
      },
      tooltip: {
        bodyFont: {
          size: 14,
          family: 'Arial, sans-serif',
        },
        titleFont: {
          size: 16,
          family: 'Arial, sans-serif',
        },
        padding: 16,
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = Math.max(stats.total, 1); // Prevent division by zero
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const updateStats = useCallback(
    debounce((newStats: MeetingStats) => {
      if (newStats && typeof newStats === 'object') {
        setStats({
          inactive: newStats.inactive || 0,
          engaged: newStats.engaged || 0,
          confused: newStats.confused || 0,
          total: newStats.total || 0,
          agree: newStats.agree || 0,
          disagree: newStats.disagree || 0
        });
      }
    }, 500),
    []
  );

  const processComments = useCallback((comments: Comment[]) => {
    console.log('Processing comments for word cloud:', comments.length);
    
    // Create a map to count word frequencies
    const wordMap = new Map<string, number>();
    
    comments.forEach(comment => {
      if (!comment.content) {
        console.warn('Comment missing content:', comment);
        return;
      }

      // Split into words and clean up
      const words = comment.content
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => 
          word.length > 2 && // Allow 3+ letter words
          !['the', 'and', 'for', 'that', 'this', 'with', 'was', 'were', 'what', 'have', 'from'].includes(word)
        );
      
      words.forEach(word => {
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      });
    });

    const colors = [
      '#2563EB', // Blue
      '#DC2626', // Red
      '#059669', // Green
      '#7C3AED', // Purple
      '#EA580C', // Orange
      '#0891B2', // Cyan
      '#4F46E5', // Indigo
      '#BE185D', // Pink
    ];

    // Convert to word cloud format
    const words: WordCloudWord[] = Array.from(wordMap.entries())
      .map(([text, value]) => ({ 
        text, 
        value: Math.max(value * 2, 10), // Scale up the sizes
        font: 'Arial',
        style: 'normal',
        weight: value > 3 ? 'bold' : 'normal', // Make frequent words bold
        padding: 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30); // Limit to top 30 words for better visibility

    // Generate word cloud layout
    if (containerWidth > 0 && words.length > 0) {
      const height = containerWidth * 0.6;
      const layout = cloud()
        .size([containerWidth, height])
        .words(words)
        .padding(2)
        .rotate(() => 0) // No rotation for better readability
        .fontSize(d => {
          const word = d as WordCloudWord;
          const maxValue = Math.max(...words.map(w => w.value));
          const minValue = Math.min(...words.map(w => w.value));
          const scale = scaleLinear()
            .domain([minValue, maxValue])
            .range([20, Math.min(containerWidth / 4, height / 3)]); // Dynamic max size based on container
          return scale(word.value);
        })
        .on('end', (words) => {
          console.log('Word cloud layout complete:', words.length, 'words');
          setWordCloudData(words as WordCloudWord[]);
        });

      layout.start();
    } else {
      setWordCloudData([]);
    }
  }, [containerWidth]);

  const addFloatingReaction = useCallback((type: ReactionType) => {
    const id = Math.random().toString(36).substr(2, 9);
    const left = Math.random() * 60 + 20;
    setFloatingReactions(prev => [...prev, {
      id,
      type,
      left,
      bottom: 0,
      opacity: 1
    }]);
  }, []);

  const animateReactions = useCallback(() => {
    setFloatingReactions(prev => 
      prev.map(reaction => ({
        ...reaction,
        bottom: reaction.bottom + 1,
        opacity: Math.max(0, reaction.opacity - 0.005)
      })).filter(reaction => reaction.opacity > 0)
    );
    animationFrameRef.current = requestAnimationFrame(animateReactions);
  }, []);

  useEffect(() => {
    const socket = io(config.apiUrl, {
      path: '/socket.io',
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnecting(false);
      socket.emit('joinMeeting', {
        meetingUuid: meeting.meetingUuid,
        attendeeId
      });
    });

    socket.on('stats', (newStats: MeetingStats) => {
      if (!newStats || typeof newStats !== 'object') {
        console.error('Received invalid stats data:', newStats);
        return;
      }
      updateStats(newStats);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnecting(true);
    });

    socket.on('joinedMeeting', () => {
      console.log('Joined meeting, requesting initial data...'); // Debug log
      // Get initial data after successfully joining
      socket.emit('getComments', { meetingUuid: meeting.meetingUuid });
    });

    // Listen for initial comments and updates
    socket.on('comments', (data: Comment[]) => {
      console.log('Received initial comments:', data.length); // Debug log
      setComments(data);
    });

    socket.on('commentsUpdated', (updatedComments: Comment[]) => {
      console.log('Received updated comments:', updatedComments.length); // Debug log
      setComments(updatedComments);
    });

    socket.on('newComment', (comment: Comment) => {
      console.log('Received new comment'); // Debug log
      setComments(prev => [...prev, comment]);
    });

    socket.on('statsUpdate', (data: MeetingStats) => {
      updateStats(data);
    });

    socket.on('disconnect', () => {
      setIsConnecting(true);
    });

    socket.on('reaction', (data: { type: ReactionType }) => {
      addFloatingReaction(data.type);
    });

    socket.connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveMeeting', {
          meetingUuid: meeting.meetingUuid,
          attendeeId: attendeeId,
        });
        socketRef.current.disconnect();
      }
    };
  }, [meeting.meetingUuid, attendeeId, updateStats, addFloatingReaction]);

  useEffect(() => {
    if (comments.length > 0) {
      console.log('Processing', comments.length, 'comments for word cloud'); // Debug log
      processComments(comments);
    }
  }, [comments, processComments]);

  // Add resize observer for word cloud container
  useEffect(() => {
    if (!wordCloudRef.current) return;

    const updateWidth = () => {
      if (wordCloudRef.current) {
        const width = wordCloudRef.current.clientWidth;
        setContainerWidth(width);
      }
    };

    updateWidth(); // Initial width

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(wordCloudRef.current);
    resizeObserverRef.current = resizeObserver;

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animateReactions);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animateReactions]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="grid grid-cols-12 gap-8 min-h-screen p-8">
        {/* Left side - Meeting info and stats */}
        <div className="col-span-8 bg-white rounded-lg shadow-lg p-12 flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold mb-6">{meeting.title}</h1>
            <p className="text-3xl text-gray-600">Hosted by {hostName}</p>
          </div>
          
          {/* Stats and visualization section */}
          <div className="flex-grow grid grid-cols-2 gap-8">
            {/* Left column - Stats and Word Cloud */}
            <div className="flex flex-col gap-8">
              {/* Active participants */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h2 className="text-4xl font-bold text-blue-900 mb-4">
                  {stats.total} Active Participants
                </h2>
              </div>

              {/* Word Cloud */}
              <div 
                ref={wordCloudRef}
                className="bg-white rounded-lg p-4 flex-grow relative overflow-hidden"
                style={{ minHeight: '400px', height: '100%' }}
              >
                <h2 className="text-2xl font-bold mb-4">Meeting Word Cloud</h2>
                <svg 
                  width="100%" 
                  height="calc(100% - 48px)"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ 
                    position: 'absolute',
                    top: '48px', // Account for header
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                >
                  <g transform={`translate(${containerWidth/2},${(containerWidth * 0.6)/2})`}>
                    {wordCloudData.map((word, i) => (
                      <text
                        key={i}
                        style={{
                          fill: word.color,
                          fontFamily: 'Arial',
                          fontWeight: word.weight,
                          cursor: 'default',
                          userSelect: 'none',
                        }}
                        textAnchor="middle"
                        transform={`translate(${word.x},${word.y})`}
                        fontSize={word.size}
                      >
                        {word.text}
                      </text>
                    ))}
                  </g>
                </svg>
              </div>

              {/* Reactions */}
              <div className="bg-green-50 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-green-900 mb-4">Reactions</h2>
                <div className="flex gap-8 text-3xl">
                  <div className="flex items-center gap-2">
                    <FiThumbsUp className="text-green-600" />
                    <span className="font-bold">{stats.agree}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiThumbsDown className="text-red-600" />
                    <span className="font-bold">{stats.disagree}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - Pie Chart */}
            <div className="bg-white rounded-lg p-6 flex flex-col">
              <div className="flex-grow relative" style={{ minHeight: '400px' }}>
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Right side - QR Code and Floating reactions */}
        <div className="col-span-4 bg-white rounded-lg shadow-lg p-8 flex flex-col">
          {/* QR Code */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Join the Meeting</h2>
            <div className="flex justify-center mb-6">
              <img
                src={meeting.qrCode}
                alt="QR Code"
                className="w-[90%] h-auto"
              />
            </div>
            <p className="text-lg text-gray-600 break-all text-center bg-gray-100 p-4 rounded">
              {joinUrl}
            </p>
          </div>

          {/* Floating reactions */}
          <div className="relative flex-grow">
            {floatingReactions.map(reaction => (
              <div
                key={reaction.id}
                className="absolute transition-all duration-100"
                style={{
                  left: `${reaction.left}%`,
                  bottom: `${reaction.bottom}%`,
                  opacity: reaction.opacity,
                }}
              >
                {reaction.type === REACTION_TYPE.AGREE ? (
                  <FiThumbsUp className="text-6xl text-green-500" />
                ) : (
                  <FiThumbsDown className="text-6xl text-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
