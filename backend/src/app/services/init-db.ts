import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';

interface ExistsQueryResult {
  exists: boolean;
}

const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    meeting_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create attendees table
CREATE TABLE IF NOT EXISTS attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_uuid UUID NOT NULL REFERENCES meetings(meeting_uuid) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create attendee_current_status table
CREATE TABLE IF NOT EXISTS attendee_current_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    meeting_uuid UUID NOT NULL REFERENCES meetings(meeting_uuid) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create status_updates table
CREATE TABLE IF NOT EXISTS status_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    meeting_uuid UUID NOT NULL REFERENCES meetings(meeting_uuid) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    meeting_uuid UUID NOT NULL REFERENCES meetings(meeting_uuid) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    meeting_uuid UUID NOT NULL REFERENCES meetings(meeting_uuid) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

@Injectable()
export class InitDbService {
  private readonly logger = new Logger(InitDbService.name);

  constructor(private readonly db: DatabaseService) {}

  async initializeDatabase() {
    try {
      this.logger.log('Checking if database needs initialization...');
      
      // Check if meetings table exists
      const result = await this.db.query<ExistsQueryResult>(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meetings')"
      );
      
      if (result.rows[0].exists) {
        this.logger.log('Database already initialized, skipping...');
        return;
      }

      this.logger.log('Database not initialized, creating tables...');
      
      // Execute schema
      await this.db.query(SCHEMA_SQL);
      
      this.logger.log('Database initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }
}
