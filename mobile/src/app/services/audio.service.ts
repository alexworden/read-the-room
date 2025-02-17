import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { config } from '../config';

export class AudioService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  async startRecording(): Promise<void> {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      this.recording = recording;
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      throw new Error('No recording in progress');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;
      
      if (!uri) {
        throw new Error('No recording URI available');
      }
      
      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  async uploadAudio(meetingId: string, audioUri: string): Promise<void> {
    try {
      const response = await FileSystem.uploadAsync(
        `${config.apiUrl}/api/meetings/${meetingId}/audio`,
        audioUri,
        {
          fieldName: 'audio',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        }
      );

      if (response.status !== 200) {
        throw new Error('Failed to upload audio');
      }

      // Clean up the temporary audio file
      await FileSystem.deleteAsync(audioUri);
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}
