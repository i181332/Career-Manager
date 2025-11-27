import { getDatabase } from '../init';
import { InterviewNote } from '../types';

export class InterviewNoteRepository {
  create(noteData: {
    user_id: number;
    company_id: number;
    interview_date: string;
    round?: string;
    interviewer?: string;
    questions?: string;
    answers?: string;
    impression?: string;
    result?: string;
  }): InterviewNote {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO interview_notes (user_id, company_id, interview_date, round, interviewer, questions, answers, impression, result)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        noteData.user_id,
        noteData.company_id,
        noteData.interview_date,
        noteData.round || null,
        noteData.interviewer || null,
        noteData.questions || null,
        noteData.answers || null,
        noteData.impression || null,
        noteData.result || null
      );

      const newNote = this.findById(info.lastInsertRowid as number);
      if (!newNote) {
        throw new Error('Failed to create interview note: Note not found after insertion');
      }
      return newNote;
    } catch (error) {
      console.error('Error creating interview note:', error);
      throw new Error(`Failed to create interview note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): InterviewNote | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM interview_notes WHERE id = ?');
      return stmt.get(id) as InterviewNote | undefined;
    } catch (error) {
      console.error('Error finding interview note by id:', error);
      throw new Error(`Failed to find interview note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByUserId(userId: number): InterviewNote[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM interview_notes WHERE user_id = ? ORDER BY interview_date DESC, created_at DESC'
      );
      return stmt.all(userId) as InterviewNote[];
    } catch (error) {
      console.error('Error finding interview notes by user id:', error);
      throw new Error(`Failed to find interview notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByCompanyId(companyId: number): InterviewNote[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM interview_notes WHERE company_id = ? ORDER BY interview_date DESC, created_at DESC'
      );
      return stmt.all(companyId) as InterviewNote[];
    } catch (error) {
      console.error('Error finding interview notes by company id:', error);
      throw new Error(`Failed to find interview notes by company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  search(userId: number, query: string): InterviewNote[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT n.* FROM interview_notes n
        LEFT JOIN companies c ON n.company_id = c.id
        WHERE n.user_id = ? AND (
          n.round LIKE ? OR
          n.interviewer LIKE ? OR
          n.questions LIKE ? OR
          n.answers LIKE ? OR
          n.impression LIKE ? OR
          c.name LIKE ?
        )
        ORDER BY n.interview_date DESC, n.created_at DESC
      `);

      const searchPattern = `%${query}%`;
      return stmt.all(
        userId,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      ) as InterviewNote[];
    } catch (error) {
      console.error('Error searching interview notes:', error);
      throw new Error(`Failed to search interview notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  update(
    id: number,
    noteData: Partial<{
      interview_date: string;
      round: string;
      interviewer: string;
      questions: string;
      answers: string;
      impression: string;
      result: string;
    }>
  ): InterviewNote | undefined {
    try {
      const db = getDatabase();
      const fields = Object.keys(noteData)
        .map((key) => `${key} = ?`)
        .join(', ');

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const stmt = db.prepare(`
        UPDATE interview_notes
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(...Object.values(noteData), id);
      if (info.changes === 0) {
        throw new Error('Interview note not found or no changes made');
      }
      return this.findById(id);
    } catch (error) {
      console.error('Error updating interview note:', error);
      throw new Error(`Failed to update interview note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  delete(id: number): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM interview_notes WHERE id = ?');
      const info = stmt.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('Error deleting interview note:', error);
      throw new Error(`Failed to delete interview note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getUpcoming(userId: number, daysAhead: number = 7): InterviewNote[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM interview_notes
        WHERE user_id = ?
          AND interview_date >= datetime('now')
          AND interview_date <= datetime('now', '+' || ? || ' days')
        ORDER BY interview_date ASC
      `);

      return stmt.all(userId, daysAhead) as InterviewNote[];
    } catch (error) {
      console.error('Error getting upcoming interview notes:', error);
      throw new Error(`Failed to get upcoming interview notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
