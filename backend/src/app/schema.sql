-- Drop tables if they exist
DROP TABLE IF EXISTS transcriptions;
DROP TABLE IF EXISTS status_updates;
DROP TABLE IF EXISTS attendee_current_status;
DROP TABLE IF EXISTS attendees;
DROP TABLE IF EXISTS meetings;

-- Create meetings table
CREATE TABLE meetings (
  meeting_uuid UUID PRIMARY KEY,
  meeting_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  qr_code TEXT
);

-- Create attendees table
CREATE TABLE attendees (
  id UUID PRIMARY KEY,
  meeting_id TEXT REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attendee_current_status table
CREATE TABLE attendee_current_status (
  attendee_id UUID REFERENCES attendees(id) ON DELETE CASCADE,
  meeting_id TEXT REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'engaged',
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (attendee_id, meeting_id)
);

-- Create status_updates table
CREATE TABLE status_updates (
  id UUID PRIMARY KEY,
  attendee_id UUID REFERENCES attendees(id) ON DELETE CASCADE,
  meeting_id TEXT REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_meetings_meeting_id ON meetings(meeting_id);
CREATE INDEX idx_attendees_meeting_id ON attendees(meeting_id);
CREATE INDEX idx_attendee_current_status_meeting_id ON attendee_current_status(meeting_id);
CREATE INDEX idx_status_updates_meeting_id ON status_updates(meeting_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendees_updated_at
    BEFORE UPDATE ON attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendee_current_status_updated_at
    BEFORE UPDATE ON attendee_current_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
