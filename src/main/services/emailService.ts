import { EmailAccountRepository } from '../../database/repositories/emailAccountRepository';
import { EmailMessageRepository } from '../../database/repositories/emailMessageRepository';
import { GmailClient } from './gmailClient';
import { EmailAllocationService } from './emailAllocationService';
import { Result, EmailAccount, EmailMessage, SyncResult, PaginationOptions } from '../../database/types';
import keytar from 'keytar';

const SERVICE_NAME = 'CareerManagerApp';

// Gmail OAuth設定（実際のアプリではこれらは環境変数から読み込む）
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

export class EmailService {
  private emailAccountRepo: EmailAccountRepository;
  private emailMessageRepo: EmailMessageRepository;
  private allocationService: EmailAllocationService;

  constructor() {
    this.emailAccountRepo = new EmailAccountRepository();
    this.emailMessageRepo = new EmailMessageRepository();
    this.allocationService = new EmailAllocationService();
  }

  // Gmail認証URLを取得
  getGmailAuthUrl(): string {
    const client = new GmailClient(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI);
    return client.getAuthUrl();
  }

  // OAuth認証
  async authenticateGmail(authCode: string, userId: number): Promise<Result<EmailAccount>> {
    try {
      const client = new GmailClient(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI);
      const tokens = await client.getTokensFromCode(authCode);

      // トークンを使ってユーザーのメールアドレスを取得
      // Note: Gmail APIでプロフィール取得は現在未実装のため、仮実装
      // 実際のメールアドレスは最初のメッセージから取得するか、別途実装が必要
      const emailAddress = 'user@gmail.com'; // TODO: 実際のメールアドレス取得を実装

      // 既存のアカウントを確認
      const existingAccount = this.emailAccountRepo.findByEmail(emailAddress);
      if (existingAccount) {
        // トークンを更新
        const account = this.emailAccountRepo.updateTokens(existingAccount.id, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
        });

        // トークンをキーチェーンに保存
        await this.saveTokens(account.id, tokens);

        return { success: true, data: account };
      }

      // 新しいアカウントを作成
      const account = this.emailAccountRepo.create({
        user_id: userId,
        email_address: emailAddress,
        provider: 'gmail',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date).toISOString(),
      });

      // トークンをキーチェーンに保存
      await this.saveTokens(account.id, tokens);

      return { success: true, data: account };
    } catch (error: any) {
      console.error('Error authenticating Gmail:', error);
      return { success: false, error: error.message || 'Gmail認証に失敗しました' };
    }
  }

  // トークン更新
  async refreshAccessToken(emailAccountId: number): Promise<Result<void>> {
    try {
      const account = this.emailAccountRepo.findById(emailAccountId);
      if (!account || !account.refresh_token) {
        return { success: false, error: 'Account or refresh token not found' };
      }

      const client = new GmailClient(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI);
      const newTokens = await client.refreshAccessToken(account.refresh_token);

      this.emailAccountRepo.updateTokens(emailAccountId, {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        token_expires_at: new Date(newTokens.expiry_date).toISOString(),
      });

      await this.saveTokens(emailAccountId, newTokens);

      return { success: true };
    } catch (error: any) {
      console.error('Error refreshing access token:', error);
      return { success: false, error: error.message };
    }
  }

  // メール同期
  async syncEmails(emailAccountId: number): Promise<Result<SyncResult>> {
    try {
      const account = this.emailAccountRepo.findById(emailAccountId);
      if (!account) {
        return { success: false, error: 'Email account not found' };
      }

      // トークンをキーチェーンから取得
      const tokens = await this.getTokens(emailAccountId);
      if (!tokens) {
        return { success: false, error: 'Tokens not found. Please re-authenticate.' };
      }

      const client = new GmailClient(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, tokens);

      // 最終同期日時以降のメッセージを取得
      let query = 'in:inbox';
      if (account.last_sync_at) {
        const syncDate = new Date(account.last_sync_at);
        const unixTime = Math.floor(syncDate.getTime() / 1000);
        query += ` after:${unixTime}`;
      }

      const messages = await client.listMessages(query, 100);
      let messagesFetched = 0;
      let messagesAllocated = 0;
      const errors: string[] = [];

      for (const message of messages) {
        try {
          // メッセージ詳細を取得
          const detail = await client.getMessage(message.id);

          // 既に存在するか確認
          const existing = this.emailMessageRepo.findByMessageId(message.id);
          if (existing) {
            continue;
          }

          // メッセージを解析
          const headers = detail.payload.headers;
          const subject = GmailClient.getHeader(headers, 'Subject');
          const from = GmailClient.getHeader(headers, 'From');
          const to = GmailClient.getHeader(headers, 'To');
          const cc = GmailClient.getHeader(headers, 'Cc');

          const emailMessage = this.emailMessageRepo.create({
            email_account_id: emailAccountId,
            message_id: message.id,
            thread_id: message.threadId,
            subject: subject,
            from_address: GmailClient.extractEmail(from),
            from_name: GmailClient.extractName(from),
            to_address: to,
            cc_addresses: cc ? JSON.stringify([cc]) : undefined,
            body_text: GmailClient.extractTextBody(detail.payload),
            body_html: GmailClient.extractHtmlBody(detail.payload),
            received_at: new Date(parseInt(detail.internalDate)).toISOString(),
            labels: JSON.stringify(detail.labelIds),
            has_attachments: GmailClient.hasAttachments(detail.payload) ? 1 : 0,
          });

          messagesFetched++;

          // 自動割り振りを実行
          const allocationResult = await this.allocationService.allocateEmail(emailMessage.id);
          if (allocationResult.success && allocationResult.data) {
            messagesAllocated++;
          }
        } catch (error: any) {
          console.error('Error processing message:', error);
          errors.push(`Message ${message.id}: ${error.message}`);
        }
      }

      // 最終同期日時を更新
      this.emailAccountRepo.updateLastSyncAt(emailAccountId, new Date());

      return {
        success: true,
        data: {
          messagesFetched,
          messagesAllocated,
          errors,
        },
      };
    } catch (error: any) {
      console.error('Error syncing emails:', error);

      if (error.message === 'invalid_grant') {
        return { success: false, error: 'Authentication expired. Please re-authenticate Gmail.' };
      }

      return { success: false, error: error.message || 'メール同期に失敗しました' };
    }
  }

  // 全アクティブアカウントの同期
  async syncAllActiveAccounts(): Promise<void> {
    try {
      // sync_enabled = 1 のアカウントを全て取得
      // Note: Repositoryにメソッドがない場合は追加が必要だが、ここでは簡易的に実装
      // EmailAccountRepositoryにfindAllActive()を追加するのが正しいが、
      // ここでは既存のfindByUserIdなどを駆使するか、直接DBアクセスが必要。
      // Repositoryの変更を避けるため、一旦全ユーザーのアカウントを取得するロジックが必要だが、
      // ユーザーIDが不明なため、Repositoryに `findAllActive` を追加することを推奨。
      // 今回は `emailAccountRepo` の実装が不明確なため、仮に `findAllActive` があるとするか、
      // または `db` を直接使う。
      // `EmailService` は `db` を直接持っていないが `emailAccountRepo` は持っている。

      // 修正: EmailAccountRepositoryにメソッドを追加する代わりに、
      // ここで直接SQLを実行するのはアーキテクチャ違反になる可能性があるため、
      // EmailAccountRepositoryを確認してメソッドを追加する。
      const accounts = this.emailAccountRepo.findAllActive();

      for (const account of accounts) {
        await this.syncEmails(account.id);
      }
    } catch (error) {
      console.error('Error syncing all accounts:', error);
    }
  }

  // 特定メッセージ取得
  async getEmailMessage(id: number): Promise<Result<EmailMessage>> {
    try {
      const message = this.emailMessageRepo.findById(id);
      if (!message) {
        return { success: false, error: 'Email message not found' };
      }
      return { success: true, data: message };
    } catch (error: any) {
      console.error('Error getting email message:', error);
      return { success: false, error: error.message };
    }
  }

  // 企業別メール取得
  async getEmailsByCompany(companyId: number, pagination?: PaginationOptions): Promise<Result<EmailMessage[]>> {
    try {
      const messages = this.emailMessageRepo.findByCompanyId(companyId, pagination);
      return { success: true, data: messages };
    } catch (error: any) {
      console.error('Error getting emails by company:', error);
      return { success: false, error: error.message };
    }
  }

  // 未割り振りメール取得
  async getUnallocatedEmails(emailAccountId: number, pagination?: PaginationOptions): Promise<Result<EmailMessage[]>> {
    try {
      const messages = this.emailMessageRepo.findUnallocated(emailAccountId, pagination);
      return { success: true, data: messages };
    } catch (error: any) {
      console.error('Error getting unallocated emails:', error);
      return { success: false, error: error.message };
    }
  }

  // 全メール取得
  async getAllEmails(emailAccountId: number, pagination?: PaginationOptions): Promise<Result<EmailMessage[]>> {
    try {
      const messages = this.emailMessageRepo.findByEmailAccountId(emailAccountId, pagination);
      return { success: true, data: messages };
    } catch (error: any) {
      console.error('Error getting all emails:', error);
      return { success: false, error: error.message };
    }
  }

  // 既読管理
  async markAsRead(id: number): Promise<Result<void>> {
    try {
      this.emailMessageRepo.updateReadStatus(id, true);
      return { success: true };
    } catch (error: any) {
      console.error('Error marking email as read:', error);
      return { success: false, error: error.message };
    }
  }

  // 検索
  async searchEmails(emailAccountId: number, query: string): Promise<Result<EmailMessage[]>> {
    try {
      const messages = this.emailMessageRepo.search(emailAccountId, query);
      return { success: true, data: messages };
    } catch (error: any) {
      console.error('Error searching emails:', error);
      return { success: false, error: error.message };
    }
  }

  // ユーザーのメールアカウント取得
  async getAccountsByUserId(userId: number): Promise<Result<EmailAccount[]>> {
    try {
      const accounts = this.emailAccountRepo.findByUserId(userId);
      return { success: true, data: accounts };
    } catch (error: any) {
      console.error('Error getting accounts:', error);
      return { success: false, error: error.message };
    }
  }

  // トークンをキーチェーンに保存
  private async saveTokens(emailAccountId: number, tokens: any): Promise<void> {
    const accountName = `email_account_${emailAccountId}`;
    await keytar.setPassword(SERVICE_NAME, accountName, JSON.stringify(tokens));
  }

  // 添付ファイルダウンロード
  async downloadAttachment(emailMessageId: number, attachmentId: string): Promise<Result<{ data: string; size: number }>> {
    try {
      const message = this.emailMessageRepo.findById(emailMessageId);
      if (!message) {
        return { success: false, error: 'Email message not found' };
      }

      // トークン取得
      const tokens = await this.getTokens(message.email_account_id);
      if (!tokens) {
        return { success: false, error: 'Tokens not found' };
      }

      const client = new GmailClient(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, tokens);
      const attachment = await client.getAttachment(message.message_id, attachmentId);

      return { success: true, data: attachment };
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      return { success: false, error: error.message };
    }
  }

  // メール解析（イベント・ES候補抽出）
  async analyzeEmail(emailMessageId: number): Promise<Result<{ events: any[]; es: any[] }>> {
    try {
      const message = this.emailMessageRepo.findById(emailMessageId);
      if (!message) {
        return { success: false, error: 'Email message not found' };
      }

      const { EmailParser } = require('./emailParser'); // 循環参照回避のためrequire
      const events = EmailParser.extractEventCandidates(message.subject || '', message.body_text || '');
      const es = EmailParser.extractESDeadlineCandidates(message.subject || '', message.body_text || '');

      return { success: true, data: { events, es } };
    } catch (error: any) {
      console.error('Error analyzing email:', error);
      return { success: false, error: error.message };
    }
  }

  // トークンをキーチェーンから取得
  private async getTokens(emailAccountId: number): Promise<any | null> {
    const accountName = `email_account_${emailAccountId}`;
    const tokensJson = await keytar.getPassword(SERVICE_NAME, accountName);
    return tokensJson ? JSON.parse(tokensJson) : null;
  }
}
