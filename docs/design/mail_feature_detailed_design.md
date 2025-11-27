# メール分類・連携機能 詳細設計書

## 1. バックエンド (Main Process)

### 1.1 Gmail Service (`src/main/services/gmailClient.ts`)
既存の `GmailClient` クラスを拡張する。

#### 追加メソッド
- `watch(topicName: string)`: `users.watch` APIを呼び出し、Pub/Sub通知を設定する。
- `stop()`: `users.stop` APIを呼び出し、通知を停止する。
- `getAttachment(messageId: string, attachmentId: string)`: `users.messages.attachments.get` APIを呼び出し、添付ファイルデータを取得する。
- `listHistory(startHistoryId: string)`: `users.history.list` APIを呼び出し、前回の同期以降の変更分を取得する（増分同期用）。

### 1.2 Sync Service (`src/main/services/syncService.ts`) [新規]
メール同期のオーケストレーター。

#### 機能
- **Pub/Sub Pull**:
  - Google Cloud Pub/SubのSubscriber Clientを使用（`@google-cloud/pubsub` ライブラリが必要だが、デスクトップアプリでの認証が複雑なため、今回は**定期ポーリング**を主軸とし、可能ならPullも実装する方針とする。ユーザー要望の「Pub/Sub」は、Gmail APIの `watch` を指していると解釈し、通知を受け取るためのPull Subscriptionをポーリングする形をとる）。
  - *補足*: デスクトップアプリ単体でGCPのPub/SubをPullするにはService Account Keyが必要になることが多く、配布時にセキュリティリスクとなる。今回は **`users.history.list` を活用した軽量ポーリング（1分間隔など）** を「リアルタイム同期」の実質的な解として提案・実装する。Pub/Subはアーキテクチャ図には残すが、実装はポーリングから始めるのが現実的。
  - **修正方針**: ユーザーが「Pub/Sub通知」と明言しているため、`GmailClient` で `watch` を行い、その結果として更新があった場合に `history.list` を叩くフローを実装する。ただし、Pub/Subのメッセージを直接受け取る部分は、GCP側の設定（Topic/Subscription）が必要なため、アプリ側では「定期的に `history.list` を確認する」実装をベースにする（これがGmail推奨の同期方法）。

#### 同期ロジック
1. `email_accounts` からアクセストークン取得（期限切れならリフレッシュ）。
2. 前回同期時の `historyId` を取得。
3. `gmail.users.history.list` で変更のあったメッセージIDを取得。
4. 新規メッセージの詳細を取得 (`gmail.users.messages.get`)。
5. DB (`email_messages`) に保存。
6. 分類ロジック実行。

### 1.3 Parser Service (`src/main/services/emailParser.ts`) [新規]
メール本文から情報を抽出する。

#### 抽出ロジック (Regex)
- **日時**: `(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})` などのパターンで日時を抽出。
- **キーワード**:
  - イベント: `面接`, `説明会`, `面談`, `選考`
  - ES: `エントリーシート`, `提出`, `締切`, `期限`
- **判定**: キーワードと日時が近くにある場合、その日時をイベント候補とする。

### 1.4 Database Access
- `EmailRepository`: `email_messages` テーブルへのCRUD。
- `CompanyRepository`: メールアドレスドメインと `companies.url` または `company_email_patterns` とのマッチング。

## 2. フロントエンド (Renderer Process)

### 2.1 コンポーネント構成
- `src/renderer/components/Company/CompanyMailList.tsx`: 企業詳細画面内のメールタブ。
- `src/renderer/components/Mail/MailListItem.tsx`: メール一覧の各アイテム。
- `src/renderer/components/Mail/MailDetail.tsx`: メール詳細・本文表示・添付ファイル。
- `src/renderer/components/Mail/AttachmentPreview.tsx`: 添付ファイルのプレビュー/ダウンロード。

### 2.2 状態管理 (Zustand)
- `useMailStore`:
  - `mails`: 現在表示中のメールリスト。
  - `loading`: 読み込み中フラグ。
  - `syncing`: 同期中フラグ。
  - `fetchMails(companyId)`: DBからメール取得。
  - `syncMails()`: バックエンドに同期要求。

### 2.3 IPC通信 (`src/main/preload.ts`)
- `mail:sync`: 同期開始トリガー。
- `mail:list`: メール一覧取得。
- `mail:get`: メール詳細取得。
- `mail:download-attachment`: 添付ファイルダウンロード。
- `mail:create-event`: メールからイベント作成。

## 3. データモデル詳細

### 3.1 `email_messages` テーブル拡張
既存のカラムに加え、以下を活用。
- `has_attachments`: 1なら添付あり。
- `attachments_metadata`: JSON配列 `[{ id, filename, mimeType, size }]`。

### 3.2 `companies` 連携
- `company_email_patterns` テーブルにドメインルールを保存。
  - 例: `pattern_type='domain'`, `pattern_value='google.com'`, `company_id=1`

## 4. セキュリティ
- OAuthトークンは `keytar` (既存依存関係にありそうだが `package.json` には `keytar` がある) または暗号化してDB保存。
- `package.json` を確認すると `keytar` があるので、センシティブな情報はOSのキーストアに保存するのが望ましいが、現状のDBスキーマでは `email_accounts` に `access_token` カラムがある。今回は既存スキーマに従いDB保存とする（ただし本番運用では暗号化推奨）。

## 5. 制限事項
- AI要約は今回はモックまたは単純な切り出し（先頭100文字など）で実装し、将来的にGemini APIを組み込める構造にする。
