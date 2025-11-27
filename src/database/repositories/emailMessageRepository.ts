import { getDatabase } from '../init';
import { EmailMessage, PaginationOptions } from '../types';

export class EmailMessageRepository {
  create(data: {
    email_account_id: number;
    message_id: string;
    thread_id?: string;
    company_id?: number;
    subject?: string;
    from_address: string;
    from_name?: string;
    to_address?: string;
    cc_addresses?: string;
    body_text?: string;
    body_html?: string;
    received_at: string;
    is_read?: number;
    is_starred?: number;
    labels?: string;
    has_attachments?: number;
    attachments_metadata?: string;
    allocation_method?: string;
    allocated_at?: string;
  }): EmailMessage {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO email_messages (
        email_account_id, message_id, thread_id, company_id, subject,
        from_address, from_name, to_address, cc_addresses,
        body_text, body_html, received_at, is_read, is_starred,
        labels, has_attachments, attachments_metadata, allocation_method, allocated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.email_account_id,
      data.message_id,
      data.thread_id || null,
      data.company_id || null,
      data.subject || null,
      data.from_address,
      data.from_name || null,
      data.to_address || null,
      data.cc_addresses || null,
      data.body_text || null,
      data.body_html || null,
      data.received_at,
      data.is_read || 0,
      data.is_starred || 0,
      data.labels || null,
      data.has_attachments || 0,
      data.attachments_metadata || null,
      data.allocation_method || null,
      data.allocated_at || null
    );

    const message = this.findById(result.lastInsertRowid as number);
    if (!message) {
      throw new Error('Failed to create email message');
    }
    return message;
  }

  findById(id: number): EmailMessage | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM email_messages WHERE id = ?');
    return stmt.get(id) as EmailMessage | undefined;
  }

  findByMessageId(messageId: string): EmailMessage | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM email_messages WHERE message_id = ?');
    return stmt.get(messageId) as EmailMessage | undefined;
  }

  findByCompanyId(companyId: number, options?: PaginationOptions): EmailMessage[] {
    const db = getDatabase();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const stmt = db.prepare(`
      SELECT * FROM email_messages
      WHERE company_id = ?
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(companyId, limit, offset) as EmailMessage[];
  }

  findUnallocated(emailAccountId: number, options?: PaginationOptions): EmailMessage[] {
    const db = getDatabase();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const stmt = db.prepare(`
      SELECT * FROM email_messages
      WHERE email_account_id = ? AND company_id IS NULL
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(emailAccountId, limit, offset) as EmailMessage[];
  }

  findByEmailAccountId(emailAccountId: number, options?: PaginationOptions): EmailMessage[] {
    const db = getDatabase();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const stmt = db.prepare(`
      SELECT * FROM email_messages
      WHERE email_account_id = ?
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(emailAccountId, limit, offset) as EmailMessage[];
  }

  findByDateRange(start: Date, end: Date): EmailMessage[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM email_messages
      WHERE received_at BETWEEN ? AND ?
      ORDER BY received_at DESC
    `);

    return stmt.all(start.toISOString(), end.toISOString()) as EmailMessage[];
  }

  updateCompanyAllocation(id: number, companyId: number | null, method: 'auto' | 'manual'): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE email_messages
      SET company_id = ?, allocation_method = ?, allocated_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const allocatedAt = companyId ? new Date().toISOString() : null;
    stmt.run(companyId, method, allocatedAt, id);
  }

  updateReadStatus(id: number, isRead: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE email_messages
      SET is_read = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(isRead ? 1 : 0, id);
  }

  search(emailAccountId: number, query: string): EmailMessage[] {
    const db = getDatabase();
    const searchPattern = `%${query}%`;
    const stmt = db.prepare(`
      SELECT * FROM email_messages
      WHERE email_account_id = ? AND (
        subject LIKE ? OR
        from_address LIKE ? OR
        from_name LIKE ? OR
        body_text LIKE ?
      )
      ORDER BY received_at DESC
      LIMIT 100
    `);

    return stmt.all(emailAccountId, searchPattern, searchPattern, searchPattern, searchPattern) as EmailMessage[];
  }

  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM email_messages WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 一括割り振り解除（パターン変更時の再割り振り用）
  clearAllAllocations(emailAccountId: number): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE email_messages
      SET company_id = NULL, allocation_method = NULL, allocated_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE email_account_id = ? AND allocation_method = 'auto'
    `);

    stmt.run(emailAccountId);
  }
}
