import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Meeting } from '../types/meeting.types';

interface CreateMeetingProps {
  onMeetingCreated: (meeting: Meeting) => void;
}

export const CreateMeeting: React.FC<CreateMeetingProps> = ({ onMeetingCreated }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const meeting = await response.json();
        onMeetingCreated(meeting);
        setTitle('');
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Meeting</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Meeting Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter meeting title"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={!title.trim()}
        >
          <Text style={styles.buttonText}>Create Meeting</Text>
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
