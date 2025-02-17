import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { AttendeeStatus } from '../types/meeting.types';
import { config } from '../config';

interface MeetingRoomProps {
  meetingId: string;
  attendeeId: string;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meetingId, attendeeId }) => {
  const [currentStatus, setCurrentStatus] = useState<AttendeeStatus>(AttendeeStatus.ENGAGED);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<AttendeeStatus, number>>({
    [AttendeeStatus.ENGAGED]: 0,
    [AttendeeStatus.CONFUSED]: 0,
    [AttendeeStatus.IDEA]: 0,
    [AttendeeStatus.DISAGREE]: 0,
  });

  const updateStatus = async (status: AttendeeStatus) => {
    try {
      const response = await fetch(
        `${config.apiUrl}/api/meetings/${meetingId}/attendees/${attendeeId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
            context: transcription[transcription.length - 1] || '',
          }),
        }
      );

      if (response.ok) {
        setCurrentStatus(status);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  useEffect(() => {
    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket(`${config.apiUrl.replace('http', 'ws')}/meetings/${meetingId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'transcription') {
        setTranscription(prev => [...prev, data.text]);
      } else if (data.type === 'stats') {
        setStats(data.stats);
      }
    };

    return () => {
      ws.close();
    };
  }, [meetingId]);

  const getStatusColor = (status: AttendeeStatus) => {
    switch (status) {
      case AttendeeStatus.ENGAGED:
        return '#10B981';
      case AttendeeStatus.CONFUSED:
        return '#F59E0B';
      case AttendeeStatus.IDEA:
        return '#3B82F6';
      case AttendeeStatus.DISAGREE:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meeting Stats</Text>
        <View style={styles.statsGrid}>
          {Object.entries(stats).map(([status, count]) => (
            <View
              key={status}
              style={[
                styles.statCard,
                { backgroundColor: getStatusColor(status as AttendeeStatus) + '20' },
              ]}
            >
              <Text style={styles.statTitle}>{status}</Text>
              <Text style={styles.statCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Status</Text>
        <View style={styles.statusGrid}>
          {Object.values(AttendeeStatus).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusButton,
                {
                  backgroundColor:
                    currentStatus === status
                      ? getStatusColor(status)
                      : getStatusColor(status) + '20',
                },
              ]}
              onPress={() => updateStatus(status)}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  { color: currentStatus === status ? 'white' : getStatusColor(status) },
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transcription</Text>
        <View style={styles.transcriptionContainer}>
          {transcription.map((text, index) => (
            <Text key={index} style={styles.transcriptionText}>
              {text}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 8,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptionContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    maxHeight: 300,
  },
  transcriptionText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
  },
});
