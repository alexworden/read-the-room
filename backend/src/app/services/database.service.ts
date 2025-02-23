import { Injectable } from '@nestjs/common';
import { Pool, PoolClient, QueryResult } from 'pg';

@Injectable()
export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.RTR_DATABASE_URL || process.env.DATABASE_URL
    });
  }

  protected getPool(): Pool {
    return this.pool;
  }

  async query<T>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.getPool().query(text, params);
  }

  async end(): Promise<void> {
    await this.getPool().end();
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
