import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  try {
    // データベースファイルのパスを設定（ユーザーデータディレクトリ）
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'job-hunting.db');

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    console.log('Database path:', dbPath);

    // データベース接続
    db = new Database(dbPath, { verbose: console.log });

    // WALモードを有効化（パフォーマンスと並行性の向上）
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // テーブルの作成
    await createTables();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // usersテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      slack_user_id TEXT,
      settings TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // companiesテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      industry TEXT,
      size TEXT,
      url TEXT,
      status TEXT DEFAULT 'interested',
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // eventsテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      start_at DATETIME NOT NULL,
      end_at DATETIME,
      all_day INTEGER DEFAULT 0,
      location TEXT,
      type TEXT,
      remind_before_minutes INTEGER DEFAULT 60,
      slack_notify INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    )
  `);

  // es_entriesテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS es_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER,
      title TEXT NOT NULL,
      deadline DATETIME,
      status TEXT DEFAULT 'draft',
      questions TEXT,
      answers TEXT,
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    )
  `);

  // self_analysesテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS self_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT DEFAULT 'その他',
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT DEFAULT '[]',
      linked_companies TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 既存のself_analysesテーブルにcategoryカラムが存在しない場合は追加
  try {
    db.exec(`ALTER TABLE self_analyses ADD COLUMN category TEXT DEFAULT 'その他'`);
    console.log('Added category column to self_analyses table');
  } catch (error: any) {
    // カラムが既に存在する場合はエラーが発生するが、それは問題ない
    if (!error.message.includes('duplicate column name')) {
      console.error('Error adding category column:', error);
    }
  }

  // interview_notesテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      date DATETIME NOT NULL,
      qa_list TEXT DEFAULT '[]',
      score INTEGER,
      next_action TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  // notificationsテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id INTEGER,
      scheduled_at DATETIME NOT NULL,
      sent_at DATETIME,
      status TEXT DEFAULT 'pending',
      channel TEXT DEFAULT 'slack',
      payload TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // sync_queueテーブル（将来の同期機能用）
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      op TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_attempt_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('CREATE TABLE IF NOT EXISTS sync_queue');

  // login_historyテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('CREATE TABLE IF NOT EXISTS login_history');

  // es_versionsテーブル（ESバージョン履歴管理）
  db.exec(`
    CREATE TABLE IF NOT EXISTS es_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      es_entry_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (es_entry_id) REFERENCES es_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  console.log('CREATE TABLE IF NOT EXISTS es_versions');

  // email_accountsテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email_address TEXT NOT NULL UNIQUE,
      provider TEXT DEFAULT 'gmail',
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at DATETIME,
      last_sync_at DATETIME,
      sync_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('CREATE TABLE IF NOT EXISTS email_accounts');

  // email_messagesテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_account_id INTEGER NOT NULL,
      message_id TEXT NOT NULL UNIQUE,
      thread_id TEXT,
      company_id INTEGER,
      subject TEXT,
      from_address TEXT NOT NULL,
      from_name TEXT,
      to_address TEXT,
      cc_addresses TEXT,
      body_text TEXT,
      body_html TEXT,
      received_at DATETIME NOT NULL,
      is_read INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      labels TEXT,
      has_attachments INTEGER DEFAULT 0,
      attachments_metadata TEXT,
      allocation_method TEXT,
      allocated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    )
  `);

  console.log('CREATE TABLE IF NOT EXISTS email_messages');

  // company_email_patternsテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_email_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      pattern_type TEXT NOT NULL,
      pattern_value TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  console.log('CREATE TABLE IF NOT EXISTS company_email_patterns');

  // email_sync_historyテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_sync_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_account_id INTEGER NOT NULL,
      sync_started_at DATETIME NOT NULL,
      sync_completed_at DATETIME,
      status TEXT DEFAULT 'running',
      messages_fetched INTEGER DEFAULT 0,
      messages_allocated INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE CASCADE
    )
  `);

  console.log('CREATE TABLE IF NOT EXISTS email_sync_history');

  // マイグレーション: es_entries テーブルに新しいカラムを追加
  try {
    // 既存のカラムを確認
    const tableInfo = db.prepare("PRAGMA table_info(es_entries)").all() as Array<{ name: string }>;
    const existingColumns = tableInfo.map(col => col.name);

    // deadline カラムを追加
    if (!existingColumns.includes('deadline')) {
      db.exec('ALTER TABLE es_entries ADD COLUMN deadline DATETIME');
      console.log('Added deadline column to es_entries');
    }

    // questions カラムを追加
    if (!existingColumns.includes('questions')) {
      db.exec('ALTER TABLE es_entries ADD COLUMN questions TEXT');
      console.log('Added questions column to es_entries');
    }

    // answers カラムを追加
    if (!existingColumns.includes('answers')) {
      db.exec('ALTER TABLE es_entries ADD COLUMN answers TEXT');
      console.log('Added answers column to es_entries');
    }

    // memo カラムを追加
    if (!existingColumns.includes('memo')) {
      db.exec('ALTER TABLE es_entries ADD COLUMN memo TEXT');
      console.log('Added memo column to es_entries');
    }

    // 不要なカラム（content, attachments）は残しておく（削除は危険）
  } catch (error) {
    console.error('Migration error:', error);
    // マイグレーションエラーは致命的ではないので続行
  }

  // インデックスの作成
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_es_versions_es_entry_id ON es_versions(es_entry_id);
    CREATE INDEX IF NOT EXISTS idx_email_messages_company ON email_messages(company_id);
    CREATE INDEX IF NOT EXISTS idx_email_messages_received ON email_messages(received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);
    CREATE INDEX IF NOT EXISTS idx_company_patterns_company ON company_email_patterns(company_id);
  `);

  console.log('Tables created successfully');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}
