import { getDatabase } from '../init';
import { CompanyEmailPattern } from '../types';

export class CompanyEmailPatternRepository {
  create(data: {
    company_id: number;
    pattern_type: string;
    pattern_value: string;
    priority?: number;
    enabled?: number;
  }): CompanyEmailPattern {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO company_email_patterns (company_id, pattern_type, pattern_value, priority, enabled)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.company_id,
      data.pattern_type,
      data.pattern_value,
      data.priority || 0,
      data.enabled !== undefined ? data.enabled : 1
    );

    const pattern = this.findById(result.lastInsertRowid as number);
    if (!pattern) {
      throw new Error('Failed to create company email pattern');
    }
    return pattern;
  }

  findById(id: number): CompanyEmailPattern | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM company_email_patterns WHERE id = ?');
    return stmt.get(id) as CompanyEmailPattern | undefined;
  }

  findByCompanyId(companyId: number): CompanyEmailPattern[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM company_email_patterns
      WHERE company_id = ?
      ORDER BY priority DESC, id ASC
    `);
    return stmt.all(companyId) as CompanyEmailPattern[];
  }

  findMatchingPattern(patternType: string, value: string): CompanyEmailPattern[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM company_email_patterns
      WHERE pattern_type = ? AND pattern_value = ? AND enabled = 1
      ORDER BY priority DESC
    `);
    return stmt.all(patternType, value) as CompanyEmailPattern[];
  }

  findMatchingDomainPattern(domain: string): CompanyEmailPattern[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM company_email_patterns
      WHERE pattern_type = 'domain' AND ? LIKE ('%' || pattern_value) AND enabled = 1
      ORDER BY priority DESC
    `);
    return stmt.all(domain) as CompanyEmailPattern[];
  }

  findMatchingSubjectPattern(subject: string): CompanyEmailPattern[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM company_email_patterns
      WHERE pattern_type = 'subject_keyword' AND ? LIKE ('%' || pattern_value || '%') AND enabled = 1
      ORDER BY priority DESC
    `);
    return stmt.all(subject) as CompanyEmailPattern[];
  }

  update(id: number, data: {
    pattern_type?: string;
    pattern_value?: string;
    priority?: number;
    enabled?: number;
  }): CompanyEmailPattern {
    const db = getDatabase();
    const pattern = this.findById(id);
    if (!pattern) {
      throw new Error('Pattern not found');
    }

    const stmt = db.prepare(`
      UPDATE company_email_patterns
      SET pattern_type = ?, pattern_value = ?, priority = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      data.pattern_type !== undefined ? data.pattern_type : pattern.pattern_type,
      data.pattern_value !== undefined ? data.pattern_value : pattern.pattern_value,
      data.priority !== undefined ? data.priority : pattern.priority,
      data.enabled !== undefined ? data.enabled : pattern.enabled,
      id
    );

    const updatedPattern = this.findById(id);
    if (!updatedPattern) {
      throw new Error('Failed to update pattern');
    }
    return updatedPattern;
  }

  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM company_email_patterns WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  toggleEnabled(id: number, enabled: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE company_email_patterns
      SET enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(enabled ? 1 : 0, id);
  }
}
