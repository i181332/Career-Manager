### 概要
Windows デスクトップ向けに再設計した「就活管理アプリ」の詳細設計を提示します。前提：PC（Windows）ネイティブ体験、ローカルでもオンラインでも動作可能、リマインドは Slack 通知で行う。MVP から拡張まで実務で実装しやすい構成にしています。

---

### 推奨技術スタックと理由
- UI 実装（推奨）：Electron + React（TypeScript）  
  - 理由：Web 技術で UI 開発が速く、既存のカレンダー/ライブラリが使え、Windows 配布（MSIX/EXE）対応が容易。将来 macOS へ移植可。
- 代替（ネイティブ）：.NET 7 + WinUI 3 (C#)  
  - 理由：ネイティブの高性能・Windows UX に最適。社内 Windows 環境向けで安定性重視ならこちら。
- バックエンド（任意、クラウド or 自ホスト）
  - Node.js + Express / NestJS（TypeScript） または ASP.NET Core（C#）
  - 理由：認証、マルチデバイス同期、Slack 通知送信、バックアップを担う
- ローカル DB（オフライン対応）：SQLite（Electron/NET 双方で容易）  
- クラウド DB（任意同期）：PostgreSQL
- ファイル保存：ローカルファイルシステム＋クラウド同期時は S3 互換
- Slack 通知：Slack Incoming Webhooks または Slack API (OAuth + chat.postMessage)
- 配布：MSIX / Windows Installer（Electron-builder または MSIX packaging for WinUI）
- CI/CD：GitHub Actions（ビルド、テスト、インストーラ生成）

---

### アーキテクチャ（高レベル）
- アプリ層（Client）
  - UI（React）＋ローカルサービス層（SQLiteアクセス, ロジック）
  - 通信モジュール：バックエンド同期 API と Slack 通知の送信エンドポイント呼び出し
  - ローカル通知（トースト）は補助的に提供可能だが リマインドは Slack で実施
- サーバー層（オプション）
  - 認証、マルチ端末同期、集中バックアップ、Slack 通知中継（Webhook の保護）、共有機能
- バッチ／スケジューラ
  - ローカル：アプリ起動中にスケジューラ（node-cron 相当）が notifications テーブルを監視
  - サーバー：Cloud Scheduler/cron が通知を送る（常にオンラインで確実に送る場合）
- データ同期
  - オフライン優先：ローカルで操作 → ローカル DB → 同期キュー → サーバーに順次同期（衝突解決は最終更新タイムスタンプ）

---

### データモデル（SQLite / PostgreSQL 共通） — 主要テーブル
- users
  - id, name, email, slack_user_id (nullable), created_at, updated_at, settings (json)
- companies
  - id, user_id, name, industry, size, url, status, memo, created_at, updated_at
- events
  - id, user_id, company_id (nullable), title, description, start_at (UTC), end_at (UTC), all_day (bool), location, type, remind_before_minutes (int), slack_notify (bool), created_at, updated_at
- es_entries
  - id, user_id, company_id (nullable), title, content (richtext), attachments (json array), status, created_at, updated_at
- self_analyses
  - id, user_id, title, content, tags (json array), linked_companies (json array), created_at, updated_at
- interview_notes
  - id, user_id, company_id, date, qa_list (json), score, next_action, created_at, updated_at
- notifications
  - id, user_id, event_id (nullable), scheduled_at (UTC), sent_at (nullable), status (pending/sent/failed), channel (slack/local), payload (json)
- sync_queue (ローカル専用)
  - id, entity_type, entity_id, op (create/update/delete), payload, status, attempts, last_attempt_at

---

### API / 内部サービスインターフェース
- ローカル内部 API（Electron IPC / .NET サービス）  
  - getCompanies(userId)  
  - getCompany(id)  
  - upsertCompany(payload)  
  - deleteCompany(id)  
  - getEvents(start,end) — カレンダー用  
  - upsertEvent(payload) — ここで notifications レコード作成  
  - scheduleNotification(notificationId)  
  - sendSlackNotification(notificationId)  
  - getES(userId, companyId?) / upsertES / deleteES  
  - getSelfAnalyses / upsert / delete
- サーバー API（同期・共有用）
  - POST /sync — バッチ同期（差分）  
  - POST /notifications/dispatch — サーバー側通知送信（必要時）

---

### UI/UX（画面一覧と主要要素）
1. 起動 / ログイン画面
   - ローカルアカウント or OAuth（Google/Microsoft）＋ Slack 連携（Slack OAuth で workspace と連携し通知権限を付与）
2. ダッシュボード（ホーム）
   - 検索バー、今日の締切数、次のイベントカード、企業リスト（フィルタ：ステータス）
   - 中央：月間カレンダー（ドラッグでイベント作成、イベントをクリックで詳細）
   - 右：近日の通知（送信済/保留/失敗）
3. 企業ページ
   - ヘッダ：企業名、ステータス変更ボタン、リンクアイコン
   - タブ：概要／イベント／ES／面接ノート／メモ
4. イベント作成モーダル（企業ページ or カレンダードラッグ）
   - 入力項目：タイトル、タイプ、詳細、開始/終了、全日、場所、紐付け企業、リマインダー（複数可）、Slack 通知 ON/OFF、カスタムメッセージ
   - 保存時：DB 保存 → notifications レコード作成 → スケジューラに登録
5. ES / 自己分析エディタ
   - リッチテキスト、テンプレート挿入、添付アップロード、タグ、企業紐付け、バージョン履歴（簡易）
6. 面接ノート
   - 日付、質問/回答を繰返し追加、評価、次アクション、該当イベントへのリンク
7. 通知管理画面
   - ステータス一覧（pending/sent/failed）、手動再送、Slack 設定（Webhook or OAuth）, デフォルトリマインダー設定
8. 設定
   - アカウント、同期設定（オン/オフ）、エクスポート（JSON/CSV）、バックアップ、更新チェック

---

### リマインダー（Slack）ワークフロー
1. ユーザーがイベント作成時に remind_before を設定し、Slack 通知 ON にする
2. イベント保存時に notifications テーブルへ scheduled_at = start_at - remind_before を作成
3. スケジューラ実行（ローカル or サーバー）
   - ローカルアプリが常駐している場合：内蔵スケジューラが notifications を監視し scheduled_at 到達で sendSlackNotification を呼ぶ
   - サーバー運用の場合：サーバーが通知送信を代行し、送信結果をローカルへ同期
4. Slack 送信
   - 推奨：Slack OAuth を用いた chat.postMessage（ユーザーの workspace とチャネルへ送信）または Incoming Webhook（事前に設定済みのチャンネル）
   - 送信の内容：イベントタイトル、企業名、日時、場所、リンク（アプリ内イベント詳細へジャンプする deep link）
5. 送信結果を notifications.sent_at / status に記録、失敗時は再試行ロジック（指数バックオフ）を実行

Slack の選択肢
- Incoming Webhook：簡潔だが固定チャンネル向け（ユーザー毎にWebhookを管理）
- Slack OAuth + chat.postMessage：ユーザーのSlackに DM で通知、より柔軟で UX 良好（推奨）

---

### 同期・オフライン設計
- オフラインファースト：すべてローカル DB で操作可能
- 同期キュー：変更は sync_queue に積む → ネットワーク回復時に /sync で一括送信
- 衝突解決：最後更新時刻（last_modified）ベースで自動マージ、重要な衝突は UI で確認させる

---

### セキュリティ設計
- 認証：OAuth（外部） or ローカルパスワード（PBKDF2 / Argon2）＋ JWT（サーバーを使う場合）
- Slack トークンの保護：ローカルでは OS キーリング（Windows Credential Manager）に保存、サーバーでは暗号化ストレージ
- 通信：TLS（HTTPS）固定
- ローカルデータ保護：オプションで DB 暗号化（ユーザーオプション）、自動ローカルバックアップ
- 権限：ユーザースコープで各レコードに user_id を必須紐付け

---

### 配布・アップデート戦略
- ビルド：Electron-builder で MSIX / NSIS インストーラ生成、.NET 版は MSIX
- 自動更新：Squirrel / electron-updater を使用して差分アップデート
- インストール方式：社内配布向けに MSI / MSIX、一般配布はインストーラ（サイレントインストールオプション）
- 初回セットアップ：Slack 連携ウィザードを用意（OAuth または Webhook 登録）

---

### テスト計画と品質保証
- 単体テスト：各 UI コンポーネント、DB 層、通知ロジック
- 結合テスト：イベント作成 → notifications 作成 → スケジューラで送信 → Slack 到達（モック or テスト workspace）
- E2E テスト：Playwright（Electron 対応）で主要フローを自動検証
- UX テスト：学生 5〜8 名によるタスクベーステスト（カレンダー操作、イベント作成、Slack 受信）
- ロードテスト：同期 API（サーバー利用時）の負荷確認

---

### MVP スコープ（優先度）
1. ログイン（ローカル）／アカウント作成、ダッシュボード、企業 CRUD  
2. イベント CRUD、月間カレンダー表示（ドラッグ＆ドロップ）、カレンダー → イベント詳細  
3. イベントのリマインダー設定、notifications テーブル、ローカルスケジューラ  
4. Slack 連携（Webhook または OAuth）による通知送信（テスト Workspace への通知）  
5. ES・自己分析の CRUD、面接ノート（基本）  
6. データエクスポート（JSON/CSV）、設定画面、インストーラ生成

---

### 開発スケジュール（目安・小チーム）
- 設計確定：1週  
- MVP 実装フェーズ：6〜8週（2人チーム：フロント 1 / バック 1）  
  - 週1-2：認証、DB モデル、企業/イベント CRUD、カレンダー基盤  
  - 週3-4：イベント作成 UI、通知スケジューラ、Slack 連携実装  
  - 週5-6：ES/自己分析/面接ノート、設定、エクスポート、E2E テスト  
- ベータ → フィードバック反映：2週  
- 本番リリース準備（インストーラ・配布）1週

総計：10〜12週間（MVP で十分なUXと安定性を目指す）

---

### 運用上の注意点 & 推奨
- Slack通知の信頼性確保：ユーザーがSlack連携を解除すると通知失敗になるため UI で連携状態を常時表示する。失敗時のフォールバック（メール or ローカルトースト）を検討。
- タイムゾーン：日時は UTC で保存し、表示は Windows ロケールに合わせる。
- プライバシー：ES／自己分析は個人的データなので、ローカル暗号化とエクスポート時の注意喚記を表示する。
- 監査ログ：通知送信履歴と失敗ログはユーザーが確認・再送できるようにする。

---

## メール管理機能 詳細設計

### 概要
Gmail と連携し、受信メールを登録されている企業ごとに自動で割り振る機能。メールが届くたびにプログラムが起動し、パターンマッチングによって企業に紐付け、それ以外のメールは未割り振り状態で保存する。

### 目的
- 就活メール（選考案内、説明会通知、結果連絡等）を企業ごとに整理
- メールベースで選考状況を追跡可能にする
- 手動で企業に紐付ける手間を削減

---

### データモデル

#### 1. email_accounts テーブル
ユーザーが連携したメールアカウントを管理

```sql
CREATE TABLE email_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email_address TEXT NOT NULL UNIQUE,
  provider TEXT DEFAULT 'gmail',              -- 'gmail' (将来的に 'outlook' 等も可)
  access_token TEXT,                          -- OAuth アクセストークン (暗号化推奨)
  refresh_token TEXT,                         -- OAuth リフレッシュトークン (暗号化推奨)
  token_expires_at DATETIME,                  -- トークン有効期限
  last_sync_at DATETIME,                      -- 最終同期日時
  sync_enabled BOOLEAN DEFAULT 1,             -- 同期有効フラグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 2. email_messages テーブル
受信したメール本体

```sql
CREATE TABLE email_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_account_id INTEGER NOT NULL,          -- メールアカウントID
  message_id TEXT NOT NULL UNIQUE,            -- Gmail API の Message ID (重複防止)
  thread_id TEXT,                             -- Gmail のスレッドID (関連メール追跡用)
  company_id INTEGER,                         -- 割り振られた企業ID (NULL = 未割り振り)
  subject TEXT,                               -- 件名
  from_address TEXT NOT NULL,                 -- 送信元メールアドレス
  from_name TEXT,                             -- 送信元名
  to_address TEXT,                            -- 宛先 (主に自分のアドレス)
  cc_addresses TEXT,                          -- CC (JSON配列形式)
  body_text TEXT,                             -- プレーンテキスト本文
  body_html TEXT,                             -- HTML本文
  received_at DATETIME NOT NULL,              -- 受信日時 (Gmail のinternalDate)
  is_read BOOLEAN DEFAULT 0,                  -- 既読フラグ
  is_starred BOOLEAN DEFAULT 0,               -- スター付きフラグ
  labels TEXT,                                -- Gmail ラベル (JSON配列)
  has_attachments BOOLEAN DEFAULT 0,          -- 添付ファイルの有無
  attachments_metadata TEXT,                  -- 添付ファイル情報 (JSON)
  allocation_method TEXT,                     -- 割り振り方法 ('auto', 'manual', null)
  allocated_at DATETIME,                      -- 割り振り日時
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE INDEX idx_email_messages_company ON email_messages(company_id);
CREATE INDEX idx_email_messages_received ON email_messages(received_at DESC);
CREATE INDEX idx_email_messages_message_id ON email_messages(message_id);
```

#### 3. company_email_patterns テーブル
企業ごとのメール自動割り振りルール

```sql
CREATE TABLE company_email_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  pattern_type TEXT NOT NULL,                 -- 'domain', 'address', 'subject_keyword'
  pattern_value TEXT NOT NULL,                -- パターン値 (例: '@example.com', 'noreply@company.com', '選考')
  priority INTEGER DEFAULT 0,                 -- 優先度 (高い値ほど優先、複数マッチ時に使用)
  enabled BOOLEAN DEFAULT 1,                  -- 有効/無効フラグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_company_patterns_company ON company_email_patterns(company_id);
```

#### 4. email_sync_history テーブル
同期履歴の記録 (トラブルシューティング、監査用)

```sql
CREATE TABLE email_sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_account_id INTEGER NOT NULL,
  sync_started_at DATETIME NOT NULL,
  sync_completed_at DATETIME,
  status TEXT DEFAULT 'running',              -- 'running', 'completed', 'failed'
  messages_fetched INTEGER DEFAULT 0,         -- 取得したメッセージ数
  messages_allocated INTEGER DEFAULT 0,       -- 自動割り振りされたメッセージ数
  error_message TEXT,                         -- エラーメッセージ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE CASCADE
);
```

---

### Gmail API 連携フロー

#### 1. OAuth 認証フロー

```
ユーザー
  ↓ 「Gmailを連携」ボタンクリック
Electron アプリ
  ↓ ブラウザウィンドウで OAuth 同意画面を開く
  ↓ (スコープ: gmail.readonly または gmail.modify)
Google OAuth Server
  ↓ 認証コードを返す
Electron アプリ
  ↓ 認証コードをアクセストークンに交換
  ↓ access_token, refresh_token を取得
email_accounts テーブルに保存 (Windows Credential Manager で暗号化)
```

**必要な OAuth スコープ**:
- `https://www.googleapis.com/auth/gmail.readonly` (読み取り専用、推奨)
- または `https://www.googleapis.com/auth/gmail.modify` (既読マーク機能が必要な場合)

**トークン管理**:
- `access_token`: 1時間有効、API リクエストに使用
- `refresh_token`: 長期有効、access_token 更新に使用
- トークンは Windows Credential Manager に保存し、DB には暗号化キーのみ保存

#### 2. メール受信監視フロー (Push通知方式)

Gmail API の **Pub/Sub 通知** を利用して、メール受信時にリアルタイムで処理を実行。

```
Gmail (メール受信)
  ↓ Pub/Sub 通知 (Google Cloud Pub/Sub)
  ↓
ローカル Webhook サーバー (Electron アプリ内)
  または
クラウド中継サーバー (オプション)
  ↓
Electron アプリの同期トリガー
  ↓
fetchNewMessages() 実行
```

**実装方式 (2つのオプション)**:

##### オプションA: クラウド中継サーバー経由 (推奨)
- Google Pub/Sub → クラウドサーバー → Electron アプリへ WebSocket/Polling で通知
- メリット: ローカルアプリが起動していなくても同期可能、ファイアウォール問題なし
- デメリット: サーバー構築が必要

##### オプションB: ローカル Polling 方式 (シンプル)
- Electron アプリが定期的に Gmail API を Polling (例: 5分ごと)
- メリット: サーバー不要、実装が簡単
- デメリット: リアルタイム性が低い、API クォータ消費

**推奨**: オプションB (Polling) から開始し、必要に応じてオプションAに移行

#### 3. メール取得と解析フロー

```javascript
// 疑似コード
async function fetchNewMessages(emailAccountId) {
  const account = await getEmailAccount(emailAccountId);

  // 1. 最終同期日時以降のメッセージを取得
  const query = `after:${account.last_sync_at.toUnixTime()}`;
  const messages = await gmailAPI.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100
  });

  // 2. 各メッセージの詳細を取得
  for (const message of messages.data.messages) {
    const detail = await gmailAPI.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'full'  // ヘッダー + 本文
    });

    // 3. メッセージを解析して DB に保存
    const emailData = parseGmailMessage(detail);
    await saveEmailMessage(emailData);

    // 4. 自動割り振りを実行
    await allocateEmailToCompany(emailData.id);
  }

  // 5. 最終同期日時を更新
  await updateLastSyncAt(emailAccountId, new Date());
}
```

#### 4. メッセージ解析ロジック

```javascript
function parseGmailMessage(gmailMessage) {
  const headers = gmailMessage.payload.headers;
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

  return {
    message_id: gmailMessage.id,
    thread_id: gmailMessage.threadId,
    subject: getHeader('Subject'),
    from_address: extractEmail(getHeader('From')),
    from_name: extractName(getHeader('From')),
    to_address: getHeader('To'),
    received_at: new Date(parseInt(gmailMessage.internalDate)),
    body_text: extractTextBody(gmailMessage.payload),
    body_html: extractHtmlBody(gmailMessage.payload),
    labels: gmailMessage.labelIds,
    has_attachments: hasAttachments(gmailMessage.payload)
  };
}
```

---

### メール自動割り振りロジック

#### パターンマッチングの優先順位

```javascript
async function allocateEmailToCompany(emailMessageId) {
  const email = await getEmailMessage(emailMessageId);

  // すでに割り振り済みの場合はスキップ
  if (email.company_id) return;

  // 1. 送信元アドレス完全一致 (最優先)
  let company = await findCompanyByPattern('address', email.from_address);

  // 2. 送信元ドメイン一致
  if (!company) {
    const domain = extractDomain(email.from_address);  // '@example.com'
    company = await findCompanyByPattern('domain', domain);
  }

  // 3. 件名キーワード一致
  if (!company && email.subject) {
    company = await findCompanyByPatternInSubject(email.subject);
  }

  // 4. マッチした場合は割り振り
  if (company) {
    await updateEmailMessage(emailMessageId, {
      company_id: company.id,
      allocation_method: 'auto',
      allocated_at: new Date()
    });
  }

  // マッチしない場合は未割り振り (company_id = NULL) のまま
}

async function findCompanyByPattern(patternType, value) {
  const patterns = await db.query(`
    SELECT company_id, priority
    FROM company_email_patterns
    WHERE pattern_type = ? AND pattern_value = ? AND enabled = 1
    ORDER BY priority DESC
    LIMIT 1
  `, [patternType, value]);

  if (patterns.length > 0) {
    return await getCompanyById(patterns[0].company_id);
  }
  return null;
}
```

#### パターン種別の詳細

| pattern_type | pattern_value の例 | マッチング条件 |
|---|---|---|
| `address` | `noreply@company.com` | `from_address` と完全一致 |
| `domain` | `@company.com` | `from_address` が該当ドメインで終わる |
| `subject_keyword` | `選考`, `面接` | `subject` に該当キーワードが含まれる |

#### 複数マッチ時の処理
- `priority` が高い方を優先
- 同じ priority の場合は `pattern_type` の優先順位で決定 (address > domain > subject_keyword)

---

### リポジトリ層 (Repository Pattern)

#### EmailAccountRepository
```typescript
// src/database/repositories/emailAccountRepository.ts
export class EmailAccountRepository {
  create(data: CreateEmailAccountData): EmailAccount;
  findById(id: number): EmailAccount | undefined;
  findByUserId(userId: number): EmailAccount[];
  findByEmail(email: string): EmailAccount | undefined;
  updateTokens(id: number, tokens: TokenData): EmailAccount;
  updateLastSyncAt(id: number, timestamp: Date): void;
  updateSyncEnabled(id: number, enabled: boolean): void;
  delete(id: number): boolean;
}
```

#### EmailMessageRepository
```typescript
// src/database/repositories/emailMessageRepository.ts
export class EmailMessageRepository {
  create(data: CreateEmailMessageData): EmailMessage;
  findById(id: number): EmailMessage | undefined;
  findByMessageId(messageId: string): EmailMessage | undefined;
  findByCompanyId(companyId: number, options?: PaginationOptions): EmailMessage[];
  findUnallocated(emailAccountId: number, options?: PaginationOptions): EmailMessage[];
  findByDateRange(start: Date, end: Date): EmailMessage[];
  updateCompanyAllocation(id: number, companyId: number | null, method: 'auto' | 'manual'): void;
  updateReadStatus(id: number, isRead: boolean): void;
  search(emailAccountId: number, query: string): EmailMessage[];
  delete(id: number): boolean;
}
```

#### CompanyEmailPatternRepository
```typescript
// src/database/repositories/companyEmailPatternRepository.ts
export class CompanyEmailPatternRepository {
  create(data: CreatePatternData): CompanyEmailPattern;
  findById(id: number): CompanyEmailPattern | undefined;
  findByCompanyId(companyId: number): CompanyEmailPattern[];
  findMatchingPattern(patternType: string, value: string): CompanyEmailPattern[];
  update(id: number, data: UpdatePatternData): CompanyEmailPattern;
  delete(id: number): boolean;
  toggleEnabled(id: number, enabled: boolean): void;
}
```

---

### サービス層 (Service Pattern)

#### EmailService
メールアカウント管理と同期処理

```typescript
// src/main/services/emailService.ts
export class EmailService {
  private emailAccountRepo: EmailAccountRepository;
  private emailMessageRepo: EmailMessageRepository;
  private gmailClient: GmailClient;

  // OAuth 認証
  async authenticateGmail(authCode: string, userId: number): Promise<Result<EmailAccount>>;

  // トークン更新
  async refreshAccessToken(emailAccountId: number): Promise<Result<void>>;

  // メール同期
  async syncEmails(emailAccountId: number): Promise<Result<SyncResult>>;

  // 特定メッセージ取得
  async getEmailMessage(id: number): Promise<Result<EmailMessage>>;

  // 企業別メール取得
  async getEmailsByCompany(companyId: number, pagination?: PaginationOptions): Promise<Result<EmailMessage[]>>;

  // 未割り振りメール取得
  async getUnallocatedEmails(emailAccountId: number, pagination?: PaginationOptions): Promise<Result<EmailMessage[]>>;

  // 既読管理
  async markAsRead(id: number): Promise<Result<void>>;

  // 検索
  async searchEmails(emailAccountId: number, query: string): Promise<Result<EmailMessage[]>>;
}
```

#### EmailAllocationService
メール割り振りロジック

```typescript
// src/main/services/emailAllocationService.ts
export class EmailAllocationService {
  private emailMessageRepo: EmailMessageRepository;
  private patternRepo: CompanyEmailPatternRepository;

  // 自動割り振り実行
  async allocateEmail(emailMessageId: number): Promise<Result<Company | null>>;

  // 手動割り振り
  async manuallyAllocate(emailMessageId: number, companyId: number): Promise<Result<void>>;

  // 割り振り解除
  async unallocate(emailMessageId: number): Promise<Result<void>>;

  // パターン管理
  async addPattern(companyId: number, patternData: PatternData): Promise<Result<CompanyEmailPattern>>;
  async removePattern(patternId: number): Promise<Result<void>>;
  async getPatterns(companyId: number): Promise<Result<CompanyEmailPattern[]>>;

  // 一括再割り振り (パターン変更後に実行)
  async reallocateAllEmails(emailAccountId: number): Promise<Result<ReallocateResult>>;
}
```

#### GmailClient (Gmail API ラッパー)
```typescript
// src/main/services/gmailClient.ts
export class GmailClient {
  private oauth2Client: OAuth2Client;

  constructor(tokens: TokenData) {
    this.oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    this.oauth2Client.setCredentials(tokens);
  }

  // メッセージリスト取得
  async listMessages(query: string, maxResults?: number): Promise<GmailMessage[]>;

  // メッセージ詳細取得
  async getMessage(messageId: string): Promise<GmailMessageDetail>;

  // 既読マーク (オプション)
  async markAsRead(messageId: string): Promise<void>;

  // トークン更新
  async refreshToken(refreshToken: string): Promise<TokenData>;
}
```

---

### IPC ハンドラ (Main Process)

```typescript
// src/main/main.ts の registerIpcHandlers() 内に追加

// メールアカウント管理
ipcMain.handle('email:authenticate', async (_event, authCode, userId) => {
  return emailService.authenticateGmail(authCode, userId);
});

ipcMain.handle('email:getAccounts', async (_event, userId) => {
  return emailService.getAccountsByUserId(userId);
});

ipcMain.handle('email:syncNow', async (_event, emailAccountId) => {
  return emailService.syncEmails(emailAccountId);
});

// メッセージ取得
ipcMain.handle('email:getByCompany', async (_event, companyId, pagination) => {
  return emailService.getEmailsByCompany(companyId, pagination);
});

ipcMain.handle('email:getUnallocated', async (_event, emailAccountId, pagination) => {
  return emailService.getUnallocatedEmails(emailAccountId, pagination);
});

ipcMain.handle('email:getMessage', async (_event, id) => {
  return emailService.getEmailMessage(id);
});

ipcMain.handle('email:markAsRead', async (_event, id) => {
  return emailService.markAsRead(id);
});

ipcMain.handle('email:search', async (_event, emailAccountId, query) => {
  return emailService.searchEmails(emailAccountId, query);
});

// メール割り振り
ipcMain.handle('email:allocate', async (_event, emailMessageId, companyId) => {
  return emailAllocationService.manuallyAllocate(emailMessageId, companyId);
});

ipcMain.handle('email:unallocate', async (_event, emailMessageId) => {
  return emailAllocationService.unallocate(emailMessageId);
});

// パターン管理
ipcMain.handle('email:addPattern', async (_event, companyId, patternData) => {
  return emailAllocationService.addPattern(companyId, patternData);
});

ipcMain.handle('email:getPatterns', async (_event, companyId) => {
  return emailAllocationService.getPatterns(companyId);
});

ipcMain.handle('email:removePattern', async (_event, patternId) => {
  return emailAllocationService.removePattern(patternId);
});

ipcMain.handle('email:reallocateAll', async (_event, emailAccountId) => {
  return emailAllocationService.reallocateAllEmails(emailAccountId);
});
```

---

### UI 層 (Renderer Process)

#### 1. メール管理ページ (EmailsPage.tsx)

**主要機能**:
- タブ切り替え: 「全メール」「企業別」「未割り振り」
- メール一覧表示 (カード形式 or リスト形式)
- 検索バー
- 同期ボタン、最終同期日時表示
- メールクリックで詳細ダイアログ表示

**レイアウト**:
```
┌─────────────────────────────────────────────────┐
│ メール管理              [同期] [設定]             │
├─────────────────────────────────────────────────┤
│ [全メール] [企業別] [未割り振り]                   │
├─────────────────────────────────────────────────┤
│ 検索: [_________________________] [🔍]           │
├─────────────────────────────────────────────────┤
│ ┌─ メールカード ───────────────────────────┐    │
│ │ 📧 【株式会社Example】一次面接のご案内      │    │
│ │ from: recruit@example.com                  │    │
│ │ 2024-01-15 10:30                          │    │
│ │ 割り振り: 株式会社Example                   │    │
│ └──────────────────────────────────────────┘    │
│ ┌─ メールカード ───────────────────────────┐    │
│ │ 📧 説明会参加のお礼                         │    │
│ │ from: noreply@company.jp                   │    │
│ │ 2024-01-14 18:20                          │    │
│ │ 割り振り: [未割り振り] [企業に紐付け]        │    │
│ └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

#### 2. メール詳細ダイアログ (EmailDetailDialog.tsx)

**表示内容**:
- 件名、送信元、宛先、CC、受信日時
- 本文 (HTML or プレーンテキスト)
- 添付ファイルリスト
- 割り振り企業 (変更可能)
- 既読/未読切り替え
- 関連イベント・ESへのリンク (該当企業の情報)

#### 3. 企業詳細ページに「メール」タブを追加

**CompanyDetailPage.tsx の拡張**:
- タブ: 概要 / イベント / ES / 面接ノート / **メール** (新規)
- メールタブ:
  - 該当企業に割り振られたメール一覧
  - メールパターン設定ボタン
  - 自動割り振りルール表示・編集

#### 4. メールパターン設定ダイアログ (EmailPatternDialog.tsx)

**UI**:
```
┌─ メール自動割り振りルール (株式会社Example) ──┐
│ ルール一覧:                                   │
│ ┌────────────────────────────────────────┐  │
│ │ 1. ドメイン: @example.com  優先度: 10  │  │
│ │    [有効] [編集] [削除]                 │  │
│ ├────────────────────────────────────────┤  │
│ │ 2. アドレス: recruit@example.com       │  │
│ │    優先度: 20  [有効] [編集] [削除]     │  │
│ └────────────────────────────────────────┘  │
│ [+ 新しいルールを追加]                        │
│                                              │
│ [一括再割り振り実行] [閉じる]                 │
└─────────────────────────────────────────────┘
```

#### 5. Gmail 連携設定 (SettingsPage.tsx に追加)

**セクション**:
- 連携済みアカウント表示
- 「Gmail を連携」ボタン
- 同期頻度設定 (手動 / 5分ごと / 10分ごと / 30分ごと)
- 自動同期 ON/OFF
- 同期履歴表示

---

### スケジューラー (定期同期)

```typescript
// src/main/services/emailSchedulerService.ts
import cron from 'node-cron';

export class EmailSchedulerService {
  private jobs: Map<number, cron.ScheduledTask> = new Map();

  // ユーザーの全メールアカウントの同期スケジュールを登録
  startSyncScheduler(userId: number, intervalMinutes: number = 10) {
    const accounts = await emailAccountRepo.findByUserId(userId);

    accounts.forEach(account => {
      if (account.sync_enabled) {
        // Cron 式: 指定分ごとに実行
        const cronExpression = `*/${intervalMinutes} * * * *`;

        const job = cron.schedule(cronExpression, async () => {
          console.log(`[Email Sync] Starting sync for account ${account.id}`);
          await emailService.syncEmails(account.id);
        });

        this.jobs.set(account.id, job);
      }
    });
  }

  stopSyncScheduler(emailAccountId: number) {
    const job = this.jobs.get(emailAccountId);
    if (job) {
      job.stop();
      this.jobs.delete(emailAccountId);
    }
  }

  restartAll(userId: number, intervalMinutes: number) {
    this.stopAll(userId);
    this.startSyncScheduler(userId, intervalMinutes);
  }
}
```

**アプリ起動時の初期化**:
```typescript
// src/main/main.ts
app.on('ready', async () => {
  // ... 既存の初期化処理

  // メール同期スケジューラー起動
  const user = await authService.getCurrentUser();
  if (user) {
    const syncInterval = user.settings?.email_sync_interval || 10; // デフォルト10分
    emailSchedulerService.startSyncScheduler(user.id, syncInterval);
  }
});
```

---

### セキュリティ対策

#### 1. トークンの暗号化保存

```typescript
// Windows Credential Manager を使用
import keytar from 'keytar';

async function saveTokens(emailAccountId: number, tokens: TokenData) {
  const serviceName = 'CareerManagerApp';
  const accountName = `email_account_${emailAccountId}`;

  await keytar.setPassword(serviceName, accountName, JSON.stringify(tokens));
}

async function getTokens(emailAccountId: number): Promise<TokenData | null> {
  const serviceName = 'CareerManagerApp';
  const accountName = `email_account_${emailAccountId}`;

  const tokensJson = await keytar.getPassword(serviceName, accountName);
  return tokensJson ? JSON.parse(tokensJson) : null;
}
```

#### 2. OAuth スコープの最小化
- 可能な限り `gmail.readonly` を使用
- 既読マーク機能が必須でない限り、書き込み権限は不要

#### 3. API リクエストの制限
- Gmail API のクォータ: 1日あたり 10億リクエスト (通常は問題なし)
- レート制限: 1秒あたり 25リクエスト
- 実装: リトライロジック (指数バックオフ) を組み込む

---

### エラーハンドリング

#### 主要なエラーケース

| エラー | 原因 | 対処 |
|---|---|---|
| `invalid_grant` | refresh_token が無効 | 再認証を促すダイアログ表示 |
| `insufficient_permissions` | OAuth スコープ不足 | 再認証で正しいスコープを要求 |
| `quotaExceeded` | API クォータ超過 | 同期頻度を下げる、ユーザーに通知 |
| `backendError` | Gmail API 一時エラー | リトライ (最大3回、指数バックオフ) |

#### エラー通知フロー
```typescript
// エラー発生時
emailService.syncEmails(accountId)
  .catch(error => {
    if (error.code === 'invalid_grant') {
      // UI に通知して再認証を促す
      notificationService.notify(userId, {
        type: 'error',
        title: 'Gmail 連携エラー',
        message: '再度 Gmail を連携してください',
        action: 'reauthenticate'
      });
    }
  });
```

---

### テスト計画

#### 1. 単体テスト
- Repository 層のCRUD操作
- パターンマッチングロジック
- メッセージ解析関数

#### 2. 統合テスト
- Gmail API モック使用
- 同期フロー全体のテスト
- 自動割り振りの検証

#### 3. E2Eテスト
- OAuth 認証フロー (テスト用 Google アカウント)
- メール同期と表示
- 手動割り振り操作

---

### MVP スコープ (メール機能)

#### Phase 1: 基本機能
1. Gmail OAuth 認証
2. メール同期 (Polling 方式、10分間隔)
3. メール一覧表示 (全メール)
4. メール詳細表示
5. 手動での企業への割り振り

#### Phase 2: 自動割り振り
6. パターン管理UI (ドメイン、アドレス)
7. 自動割り振りロジック実装
8. 未割り振りメール表示
9. 企業詳細ページのメールタブ

#### Phase 3: 高度な機能
10. 件名キーワードパターン
11. 一括再割り振り
12. メール検索
13. 既読管理 (Gmail API 書き込み権限が必要)

---

### 開発スケジュール (メール機能のみ)

- Phase 1 実装: 2週間
- Phase 2 実装: 1.5週間
- Phase 3 実装: 1週間
- テスト・バグ修正: 1週間

**合計: 5.5週間**

---

### 運用上の注意点 (メール機能)

#### Gmail API クォータ管理
- デフォルトクォータは十分だが、多数のユーザーが同時利用する場合は監視が必要
- クォータ超過時は同期頻度を自動的に下げる

#### プライバシー
- メール本文は暗号化せず平文で保存 (ローカルDB)
- 将来的にDB全体の暗号化を検討 (SQLCipher 等)

#### パフォーマンス
- 初回同期時は過去30日分のみ取得 (設定可能)
- 大量メール (1000件以上) の場合はページネーション必須

#### ユーザーサポート
- 連携エラー時の再認証手順を明確に案内
- 同期履歴を UI で確認可能にする

---
