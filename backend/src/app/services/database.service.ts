import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult } from 'pg';
import { Logger } from '@nestjs/common';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;
  private isEnded = false;
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    try {
      const connectionString = process.env.RTR_DATABASE_URL || process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('Database connection string not configured! Set RTR_DATABASE_URL or DATABASE_URL environment variable.');
      }
      
      this.logger.log(`Connecting to database with connection string starting with: ${connectionString.substring(0, connectionString.indexOf('://')+3)}...`);
      
      this.pool = new Pool({ connectionString });
    } catch (error) {
      this.logger.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  protected getPool(): Pool {
    return this.pool;
  }

  async query<T>(text: string, params?: any[]): Promise<QueryResult<T>> {
    try {
      return await this.getPool().query(text, params);
    } catch (error) {
      this.logger.error(`Failed to execute query: ${text}`, error);
      throw error;
    }
  }

  async end(): Promise<void> {
    if (!this.isEnded) {
      this.isEnded = true;
      await this.getPool().end();
    }
  }

  async onModuleDestroy() {
    await this.end();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
