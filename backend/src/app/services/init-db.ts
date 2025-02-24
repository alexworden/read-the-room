import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import * as fs from 'fs';
import * as path from 'path';

interface ExistsQueryResult {
  exists: boolean;
}

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
      
      // Read schema file
      const schemaPath = path.join(__dirname, '..', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute schema
      await this.db.query(schema);
      
      this.logger.log('Database initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }
}
