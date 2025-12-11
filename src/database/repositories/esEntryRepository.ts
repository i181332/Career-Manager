import { getDatabase } from '../init';
import { ESEntry } from '../types';

export class ESEntryRepository {
  create(esData: {
    user_id: number;
    company_id: number;
    title: string;
    deadline?: string;
    status?: string;
    questions?: string;
    answers?: string;
    memo?: string;
  }): ESEntry {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO es_entries (user_id, company_id, title, deadline, status, questions, answers, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        esData.user_id,
        esData.company_id,
        esData.title,
        esData.deadline || null,
        esData.status || 'draft',
        esData.questions || null,
        esData.answers || null,
        esData.memo || null
      );

      const newEntry = this.findById(info.lastInsertRowid as number);
      if (!newEntry) {
        throw new Error('Failed to create ES entry: Entry not found after insertion');
      }
      return newEntry;
    } catch (error) {
      console.error('Error creating ES entry:', error);
      throw new Error(`Failed to create ES entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): ESEntry | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM es_entries WHERE id = ?');
      return stmt.get(id) as ESEntry | undefined;
    } catch (error) {
      console.error('Error finding ES entry by id:', error);
      throw new Error(`Failed to find ES entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByUserId(userId: number): ESEntry[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM es_entries WHERE user_id = ? ORDER BY created_at DESC'
      );
      return stmt.all(userId) as ESEntry[];
    } catch (error) {
      console.error('Error finding ES entries by user id:', error);
      throw new Error(`Failed to find ES entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByCompanyId(companyId: number): ESEntry[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM es_entries WHERE company_id = ? ORDER BY created_at DESC'
      );
      return stmt.all(companyId) as ESEntry[];
    } catch (error) {
      console.error('Error finding ES entries by company id:', error);
      throw new Error(`Failed to find ES entries by company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByStatus(userId: number, status: string): ESEntry[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM es_entries WHERE user_id = ? AND status = ? ORDER BY created_at DESC'
      );
      return stmt.all(userId, status) as ESEntry[];
    } catch (error) {
      console.error('Error finding ES entries by status:', error);
      throw new Error(`Failed to find ES entries by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  search(userId: number, query: string): ESEntry[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT e.* FROM es_entries e
        LEFT JOIN companies c ON e.company_id = c.id
        WHERE e.user_id = ? AND (
          e.title LIKE ? OR
          e.questions LIKE ? OR
          e.answers LIKE ? OR
          e.memo LIKE ? OR
          c.name LIKE ?
        )
        ORDER BY e.created_at DESC
      `);

      const searchPattern = `%${query}%`;
      return stmt.all(userId, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern) as ESEntry[];
    } catch (error) {
      console.error('Error searching ES entries:', error);
      throw new Error(`Failed to search ES entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  update(
    id: number,
    esData: Partial<{
      title: string;
      deadline: string;
      status: string;
      questions: string;
      answers: string;
      memo: string;
      google_calendar_event_id: string;
    }>
  ): ESEntry | undefined {
    try {
      const db = getDatabase();
      const fields = Object.keys(esData)
        .map((key) => `${key} = ?`)
        .join(', ');

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const stmt = db.prepare(`
        UPDATE es_entries
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(...Object.values(esData), id);
      if (info.changes === 0) {
        throw new Error('ES entry not found or no changes made');
      }
      return this.findById(id);
    } catch (error) {
      console.error('Error updating ES entry:', error);
      throw new Error(`Failed to update ES entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  delete(id: number): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM es_entries WHERE id = ?');
      const info = stmt.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('Error deleting ES entry:', error);
      throw new Error(`Failed to delete ES entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getDeadlineApproaching(userId: number, daysAhead: number = 7): ESEntry[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM es_entries
        WHERE user_id = ?
          AND status != 'submitted'
          AND deadline IS NOT NULL
          AND deadline <= datetime('now', '+' || ? || ' days')
          AND deadline >= datetime('now')
        ORDER BY deadline ASC
      `);

      return stmt.all(userId, daysAhead) as ESEntry[];
    } catch (error) {
      console.error('Error getting deadline approaching ES entries:', error);
      throw new Error(`Failed to get deadline approaching ES entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
