import { getDatabase } from '../init';
import { EmailAccount } from '../types';

export class EmailAccountRepository {
  create(data: {
    user_id: number;
    email_address: string;
    provider?: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
  }): EmailAccount {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO email_accounts (user_id, email_address, provider, access_token, refresh_token, token_expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id,
      data.email_address,
      data.provider || 'gmail',
      data.access_token || null,
      data.refresh_token || null,
      data.token_expires_at || null
    );

    const account = this.findById(result.lastInsertRowid as number);
    if (!account) {
      throw new Error('Failed to create email account');
    }
    return account;
  }

  findById(id: number): EmailAccount | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM email_accounts WHERE id = ?');
    return stmt.get(id) as EmailAccount | undefined;
  }

  findByUserId(userId: number): EmailAccount[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM email_accounts WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as EmailAccount[];
  }

  findByEmail(email: string): EmailAccount | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM email_accounts WHERE email_address = ?');
    return stmt.get(email) as EmailAccount | undefined;
  }

  updateTokens(id: number, tokens: {
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
  }): EmailAccount {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE email_accounts
      SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(tokens.access_token, tokens.refresh_token, tokens.token_expires_at, id);

    const account = this.findById(id);
    if (!account) {
      throw new Error('Email account not found');
    }
    return account;
  }

  updateLastSyncAt(id: number, timestamp: Date): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE email_accounts
      SET last_sync_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(timestamp.toISOString(), id);
  }

  updateSyncEnabled(id: number, enabled: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE email_accounts
      SET sync_enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(enabled ? 1 : 0, id);
  }

  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM email_accounts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  findAllActive(): EmailAccount[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM email_accounts WHERE sync_enabled = 1');
    return stmt.all() as EmailAccount[];
  }
}
