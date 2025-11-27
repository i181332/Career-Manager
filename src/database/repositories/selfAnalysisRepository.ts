import { getDatabase } from '../init';
import { SelfAnalysis } from '../types';

export class SelfAnalysisRepository {
  create(analysisData: {
    user_id: number;
    category: string;
    title: string;
    content: string;
    tags?: string;
    linked_companies?: string;
  }): SelfAnalysis {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO self_analyses (user_id, category, title, content, tags, linked_companies)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        analysisData.user_id,
        analysisData.category,
        analysisData.title,
        analysisData.content,
        analysisData.tags || '[]',
        analysisData.linked_companies || '[]'
      );

      const newAnalysis = this.findById(info.lastInsertRowid as number);
      if (!newAnalysis) {
        throw new Error('Failed to create self analysis: Analysis not found after insertion');
      }
      return newAnalysis;
    } catch (error) {
      console.error('Error creating self analysis:', error);
      throw new Error(`Failed to create self analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): SelfAnalysis | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM self_analyses WHERE id = ?');
      return stmt.get(id) as SelfAnalysis | undefined;
    } catch (error) {
      console.error('Error finding self analysis by id:', error);
      throw new Error(`Failed to find self analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByUserId(userId: number): SelfAnalysis[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM self_analyses WHERE user_id = ? ORDER BY created_at DESC'
      );
      return stmt.all(userId) as SelfAnalysis[];
    } catch (error) {
      console.error('Error finding self analyses by user id:', error);
      throw new Error(`Failed to find self analyses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByCategory(userId: number, category: string): SelfAnalysis[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM self_analyses WHERE user_id = ? AND category = ? ORDER BY created_at DESC'
      );
      return stmt.all(userId, category) as SelfAnalysis[];
    } catch (error) {
      console.error('Error finding self analyses by category:', error);
      throw new Error(`Failed to find self analyses by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  search(userId: number, query: string): SelfAnalysis[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM self_analyses
        WHERE user_id = ? AND (
          title LIKE ? OR
          content LIKE ? OR
          category LIKE ?
        )
        ORDER BY created_at DESC
      `);

      const searchPattern = `%${query}%`;
      return stmt.all(userId, searchPattern, searchPattern, searchPattern) as SelfAnalysis[];
    } catch (error) {
      console.error('Error searching self analyses:', error);
      throw new Error(`Failed to search self analyses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  update(
    id: number,
    analysisData: Partial<{
      category: string;
      title: string;
      content: string;
      tags: string;
      linked_companies: string;
    }>
  ): SelfAnalysis | undefined {
    try {
      const db = getDatabase();
      const fields = Object.keys(analysisData)
        .map((key) => `${key} = ?`)
        .join(', ');

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const stmt = db.prepare(`
        UPDATE self_analyses
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(...Object.values(analysisData), id);
      if (info.changes === 0) {
        throw new Error('Self analysis not found or no changes made');
      }
      return this.findById(id);
    } catch (error) {
      console.error('Error updating self analysis:', error);
      throw new Error(`Failed to update self analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  delete(id: number): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM self_analyses WHERE id = ?');
      const info = stmt.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('Error deleting self analysis:', error);
      throw new Error(`Failed to delete self analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCategories(userId: number): string[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT DISTINCT category FROM self_analyses
        WHERE user_id = ?
        ORDER BY category
      `);

      const results = stmt.all(userId) as { category: string }[];
      return results.map(r => r.category);
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
