import { getDatabase } from '../init';

export interface ESVersion {
  id: number;
  es_entry_id: number;
  version_number: number;
  content: string;
  created_at: string;
  created_by: number;
}

export class ESVersionRepository {
  private get db() {
    return getDatabase();
  }

  createVersion(esEntryId: number, content: string, userId: number): ESVersion {
    // 最新のバージョン番号を取得
    const latestVersion = this.db
      .prepare('SELECT MAX(version_number) as max_version FROM es_versions WHERE es_entry_id = ?')
      .get(esEntryId) as { max_version: number | null };

    const versionNumber = (latestVersion?.max_version || 0) + 1;

    const stmt = this.db.prepare(`
      INSERT INTO es_versions (es_entry_id, version_number, content, created_by)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(esEntryId, versionNumber, content, userId);

    return this.getById(result.lastInsertRowid as number)!;
  }

  getById(id: number): ESVersion | null {
    const stmt = this.db.prepare('SELECT * FROM es_versions WHERE id = ?');
    return stmt.get(id) as ESVersion | null;
  }

  getByESEntryId(esEntryId: number): ESVersion[] {
    const stmt = this.db.prepare(`
      SELECT * FROM es_versions
      WHERE es_entry_id = ?
      ORDER BY version_number DESC
    `);
    return stmt.all(esEntryId) as ESVersion[];
  }

  getLatestVersion(esEntryId: number): ESVersion | null {
    const stmt = this.db.prepare(`
      SELECT * FROM es_versions
      WHERE es_entry_id = ?
      ORDER BY version_number DESC
      LIMIT 1
    `);
    return stmt.get(esEntryId) as ESVersion | null;
  }

  deleteVersion(id: number): void {
    const stmt = this.db.prepare('DELETE FROM es_versions WHERE id = ?');
    stmt.run(id);
  }

  deleteAllVersionsByESEntry(esEntryId: number): void {
    const stmt = this.db.prepare('DELETE FROM es_versions WHERE es_entry_id = ?');
    stmt.run(esEntryId);
  }
}
