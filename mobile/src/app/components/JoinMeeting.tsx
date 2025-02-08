import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Attendee } from '../types/meeting.types';

interface JoinMeetingProps {
  meetingId: string;
  onJoined: (attendee: Attendee) => void;
}

export const JoinMeeting: React.FC<JoinMeetingProps> = ({ meetingId, onJoined }) => {
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/meetings/${meetingId}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const attendee = await response.json();
        onJoined(attendee);
        setName('');
      }
    } catch (error) {
      console.error('Failed to join meeting:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Meeting</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={!name.trim()}
        >
          <Text style={styles.buttonText}>Join Meeting</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
