import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Pool } from 'pg';

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    meeting_uuid UUID NOT NULL REFERENCES meetings(meeting_uuid) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_meetings_meeting_code ON meetings(meeting_code);
CREATE INDEX idx_attendees_meeting_uuid ON attendees(meeting_uuid);
CREATE INDEX idx_attendee_current_status_meeting_uuid ON attendee_current_status(meeting_uuid);
CREATE INDEX idx_status_updates_meeting_uuid ON status_updates(meeting_uuid);
CREATE INDEX idx_comments_meeting_uuid ON comments(meeting_uuid);
CREATE INDEX IF NOT EXISTS reactions_meeting_uuid_idx ON reactions(meeting_uuid);
CREATE INDEX IF NOT EXISTS reactions_attendee_id_idx ON reactions(attendee_id);
CREATE INDEX IF NOT EXISTS reactions_expires_at_idx ON reactions(expires_at);

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

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

@Injectable()
export class InitDbService {
  private readonly logger = new Logger(InitDbService.name);

  constructor(private readonly db: DatabaseService) {}

  async initializeDatabase() {
    try {
      this.logger.log('Checking if database needs initialization...');
      
      // Get connection info from environment
      const connectionString = process.env.RTR_DATABASE_URL || process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('Database connection string not configured! Set RTR_DATABASE_URL or DATABASE_URL environment variable.');
      }

      // Parse the connection string to get database name and other parts
      const url = new URL(connectionString);
      const dbName = url.pathname.slice(1); // Remove leading /
      
      // Create a connection string for the postgres database
      const baseConnectionString = connectionString.replace(`/${dbName}`, '/postgres');
      
      // Connect to postgres database to create our database if needed
      const pgPool = new Pool({ connectionString: baseConnectionString });
      
      try {
        // Check if database exists
        const dbExists = await pgPool.query<ExistsQueryResult>(
          "SELECT EXISTS (SELECT FROM pg_database WHERE datname = $1)",
          [dbName]
        );
        
        if (!dbExists.rows[0].exists) {
          this.logger.log(`Database ${dbName} does not exist, creating...`);
          // Need to use template0 to avoid "database is being accessed by other users" error
          await pgPool.query(`CREATE DATABASE ${dbName} WITH TEMPLATE template0`);
          this.logger.log(`Database ${dbName} created successfully`);
        }
      } finally {
        // Always close the postgres connection
        await pgPool.end();
      }
      
      // Now check if tables need to be created
      const [meetingsExists, reactionsExists] = await Promise.all([
        this.db.query<ExistsQueryResult>(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meetings')"
        ),
        this.db.query<ExistsQueryResult>(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reactions')"
        )
      ]);
      
      if (meetingsExists.rows[0].exists) {
        this.logger.log('Meetings table exists, checking reactions table...');
        
        if (reactionsExists.rows[0].exists) {
          // Check if type column exists in reactions table
          const typeColumnExists = await this.db.query<ExistsQueryResult>(
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reactions' AND column_name = 'type')"
          );
          
          if (!typeColumnExists.rows[0].exists) {
            this.logger.log('Type column missing in reactions table, recreating schema...');
            // Drop and recreate the reactions table
            await this.db.query('DROP TABLE IF EXISTS reactions CASCADE');
            await this.db.query(SCHEMA_SQL);
            this.logger.log('Schema updated successfully');
            return;
          }
        }
        
        this.logger.log('Tables already initialized with correct schema, skipping...');
        return;
      }

      this.logger.log('Creating tables...');
      
      // Execute schema
      await this.db.query(SCHEMA_SQL);
      
      this.logger.log('Database initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }
}
