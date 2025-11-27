import { getDatabase } from '../init';
import { Company } from '../types';

export class CompanyRepository {
  create(companyData: {
    user_id: number;
    name: string;
    industry?: string;
    size?: string;
    url?: string;
    status?: string;
    memo?: string;
  }): Company {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO companies (user_id, name, industry, size, url, status, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        companyData.user_id,
        companyData.name,
        companyData.industry || null,
        companyData.size || null,
        companyData.url || null,
        companyData.status || 'interested',
        companyData.memo || null
      );

      const newCompany = this.findById(info.lastInsertRowid as number);
      if (!newCompany) {
        throw new Error('Failed to create company: Company not found after insertion');
      }
      return newCompany;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error(`Failed to create company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): Company | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM companies WHERE id = ?');
      return stmt.get(id) as Company | undefined;
    } catch (error) {
      console.error('Error finding company by id:', error);
      throw new Error(`Failed to find company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByUserId(userId: number): Company[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM companies WHERE user_id = ? ORDER BY updated_at DESC');
      return stmt.all(userId) as Company[];
    } catch (error) {
      console.error('Error finding companies by user id:', error);
      throw new Error(`Failed to find companies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByStatus(userId: number, status: string): Company[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM companies WHERE user_id = ? AND status = ? ORDER BY updated_at DESC'
      );
      return stmt.all(userId, status) as Company[];
    } catch (error) {
      console.error('Error finding companies by status:', error);
      throw new Error(`Failed to find companies by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  update(
    id: number,
    companyData: Partial<{
      name: string;
      industry: string;
      size: string;
      url: string;
      status: string;
      memo: string;
    }>
  ): Company | undefined {
    try {
      const db = getDatabase();
      const fields = Object.keys(companyData)
        .map((key) => `${key} = ?`)
        .join(', ');

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const stmt = db.prepare(`
        UPDATE companies
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(...Object.values(companyData), id);
      if (info.changes === 0) {
        throw new Error('Company not found or no changes made');
      }
      return this.findById(id);
    } catch (error) {
      console.error('Error updating company:', error);
      throw new Error(`Failed to update company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  delete(id: number): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM companies WHERE id = ?');
      const info = stmt.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw new Error(`Failed to delete company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  search(userId: number, query: string): Company[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM companies
        WHERE user_id = ? AND (
          name LIKE ? OR
          industry LIKE ? OR
          memo LIKE ?
        )
        ORDER BY updated_at DESC
      `);
      const searchPattern = `%${query}%`;
      return stmt.all(userId, searchPattern, searchPattern, searchPattern) as Company[];
    } catch (error) {
      console.error('Error searching companies:', error);
      throw new Error(`Failed to search companies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
