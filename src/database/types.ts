// データベース型定義

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  slack_user_id?: string;
  settings: string; // JSON文字列
  ai_config?: string; // JSON文字列 (AIConfig)
  created_at: string;
  updated_at: string;
}

export interface AIConfig {
  enabled: number; // 0: disabled, 1: enabled
  commandTemplate: string; // e.g. "gemini_CLI \"{{prompt}}\""
}

export interface Company {
  id: number;
  user_id: number;
  name: string;
  industry?: string;
  size?: string;
  url?: string;
  status: string;
  memo?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  user_id: number;
  company_id?: number;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  all_day: number;
  location?: string;
  type?: string;
  remind_before_minutes: number;
  slack_notify: number;
  google_calendar_event_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ESEntry {
  id: number;
  user_id: number;
  company_id?: number;
  title: string;
  content?: string;
  deadline?: string;
  attachments: string; // JSON文字列
  status: string;
  google_calendar_event_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SelfAnalysis {
  id: number;
  user_id: number;
  title: string;
  content?: string;
  tags: string; // JSON文字列
  linked_companies: string; // JSON文字列
  created_at: string;
  updated_at: string;
}

export interface InterviewNote {
  id: number;
  user_id: number;
  company_id: number;
  date: string;
  qa_list: string; // JSON文字列
  score?: number;
  next_action?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  event_id?: number;
  scheduled_at: string;
  sent_at?: string;
  status: string;
  channel: string;
  payload: string; // JSON文字列
  created_at: string;
  updated_at: string;
}

export interface SyncQueue {
  id: number;
  entity_type: string;
  entity_id: number;
  op: string;
  payload: string; // JSON文字列
  status: string;
  attempts: number;
  last_attempt_at?: string;
  created_at: string;
}

export interface EmailAccount {
  id: number;
  user_id: number;
  email_address: string;
  provider: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  last_sync_at?: string;
  sync_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  id: number;
  email_account_id: number;
  message_id: string;
  thread_id?: string;
  company_id?: number;
  subject?: string;
  from_address: string;
  from_name?: string;
  to_address?: string;
  cc_addresses?: string; // JSON文字列
  body_text?: string;
  body_html?: string;
  received_at: string;
  is_read: number;
  is_starred: number;
  labels?: string; // JSON文字列
  has_attachments: number;
  attachments_metadata?: string; // JSON文字列
  allocation_method?: string;
  allocated_at?: string;
  ai_processed?: number; // 0: 未処理, 1: 処理済み, 2: エラー/スキップ
  ai_processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyEmailPattern {
  id: number;
  company_id: number;
  pattern_type: string;
  pattern_value: string;
  priority: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface EmailSyncHistory {
  id: number;
  email_account_id: number;
  sync_started_at: string;
  sync_completed_at?: string;
  status: string;
  messages_fetched: number;
  messages_allocated: number;
  error_message?: string;
  created_at: string;
}

// Gmail API関連の型
export interface TokenData {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailPayload;
  internalDate: string;
}

export interface GmailPayload {
  headers: GmailHeader[];
  parts?: GmailPart[];
  body?: GmailBody;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPart {
  mimeType: string;
  filename?: string;
  headers: GmailHeader[];
  body: GmailBody;
  parts?: GmailPart[];
}

export interface GmailBody {
  size: number;
  data?: string;
  attachmentId?: string;
}

// サービス層のレスポンス型
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SyncResult {
  messagesFetched: number;
  messagesAllocated: number;
  errors: string[];
}

export interface PaginationOptions {
  offset?: number;
  limit?: number;
}
