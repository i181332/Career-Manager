import { getDatabase } from '../init';

export interface LoginHistory {
  id: number;
  user_id: number;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export class LoginHistoryRepository {
  create(historyData: {
    user_id: number;
    ip_address?: string;
    user_agent?: string;
  }): LoginHistory {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO login_history (user_id, ip_address, user_agent)
        VALUES (?, ?, ?)
      `);

      const info = stmt.run(
        historyData.user_id,
        historyData.ip_address || null,
        historyData.user_agent || null
      );

      const newHistory = this.findById(info.lastInsertRowid as number);
      if (!newHistory) {
        throw new Error('Failed to create login history: History not found after insertion');
      }
      return newHistory;
    } catch (error) {
      console.error('Error creating login history:', error);
      throw new Error(`Failed to create login history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): LoginHistory | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM login_history WHERE id = ?');
      return stmt.get(id) as LoginHistory | undefined;
    } catch (error) {
      console.error('Error finding login history by id:', error);
      throw new Error(`Failed to find login history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByUserId(userId: number, limit: number = 50): LoginHistory[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM login_history
        WHERE user_id = ?
        ORDER BY login_at DESC
        LIMIT ?
      `);
      return stmt.all(userId, limit) as LoginHistory[];
    } catch (error) {
      console.error('Error finding login history by user id:', error);
      throw new Error(`Failed to find login history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getLastLogin(userId: number): LoginHistory | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM login_history
        WHERE user_id = ?
        ORDER BY login_at DESC
        LIMIT 1
      `);
      return stmt.get(userId) as LoginHistory | undefined;
    } catch (error) {
      console.error('Error getting last login:', error);
      throw new Error(`Failed to get last login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  deleteOldRecords(userId: number, keepCount: number = 100): void {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        DELETE FROM login_history
        WHERE user_id = ?
        AND id NOT IN (
          SELECT id FROM login_history
          WHERE user_id = ?
          ORDER BY login_at DESC
          LIMIT ?
        )
      `);
      stmt.run(userId, userId, keepCount);
    } catch (error) {
      console.error('Error deleting old login history records:', error);
      throw new Error(`Failed to delete old login history records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
