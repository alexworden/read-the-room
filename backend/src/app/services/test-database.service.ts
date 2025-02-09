import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TestDatabaseService extends DatabaseService {
  private testPool: Pool;

  constructor() {
    super();
    this.testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'readtheroom_test',
    });
  }

  protected getPool(): Pool {
    return this.testPool;
  }

  async setupTestDatabase(): Promise<void> {
    try {
      // Apply schema to test database
      const schemaPath = path.join(__dirname, '..', '..', '..', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await this.testPool.query(schema);

      // Truncate all tables
      await this.testPool.query(`
        TRUNCATE TABLE meetings, attendees, status_updates, transcriptions CASCADE;
      `);
    } catch (error) {
      console.error('Error setting up test database:', error);
      throw error;
    }
  }

  async cleanupTestDatabase(): Promise<void> {
    await this.testPool.end();
  }

  async getClient(): Promise<Pool> {
    return this.testPool.connect();
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<any> {
    const client = await this.getClient();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }
}
