import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TestDatabaseService extends DatabaseService {
  private testPool: Pool;

  constructor() {
    super();
    this.testPool = new Pool({
      connectionString: process.env.RTR_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/readtheroom_test'
    });
  }

  protected getPool(): Pool {
    return this.testPool;
  }

  async setupTestDatabase(): Promise<void> {
    const client = await this.testPool.connect();
    try {
      // Apply schema to test database
      const schemaPath = path.join(__dirname, '..', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schema);

      // Truncate all tables
      await this.query(`
        TRUNCATE TABLE meetings, attendees, status_updates, attendee_current_status CASCADE;
      `);
    } catch (error) {
      console.error('Error setting up test database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanupTestDatabase(): Promise<void> {
    await this.testPool.end();
  }

  async getClient(): Promise<PoolClient> {
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

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
