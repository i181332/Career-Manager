import { EmailAccountRepository } from '../../database/repositories/emailAccountRepository';
import { EmailMessageRepository } from '../../database/repositories/emailMessageRepository';
import { GmailClient } from './gmailClient';
import { EmailAllocationService } from './emailAllocationService';
import { Result, EmailAccount, EmailMessage, SyncResult, PaginationOptions, TokenData } from '../../database/types';
import keytar from 'keytar';

const SERVICE_NAME = 'CareerManagerApp';

export class EmailService {
  private emailAccountRepo: EmailAccountRepository;
  private emailMessageRepo: EmailMessageRepository;
  private allocationService: EmailAllocationService;

  constructor() {
    this.emailAccountRepo = new EmailAccountRepository();
    this.emailMessageRepo = new EmailMessageRepository();
    this.allocationService = new EmailAllocationService();
  }

  getGmailAuthUrl(): string {
    const clientId = process.env.GMAIL_CLIENT_ID || '';
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

    const client = new GmailClient(clientId, clientSecret, redirectUri);
    return client.getAuthUrl();
  }

  async authenticateGmail(code: string, userId: number): Promise<Result<EmailAccount>> {
    const clientId = process.env.GMAIL_CLIENT_ID || '';
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

    try {
      const client = new GmailClient(clientId, clientSecret, redirectUri);
      const tokens = await client.getTokensFromCode(code);

      // Initialize client with tokens to fetch profile
      const authenticatedClient = new GmailClient(clientId, clientSecret, redirectUri, tokens);
      const profile = await authenticatedClient.getProfile();
      const emailAddress = profile.emailAddress;

      console.log(`Authenticated Gmail account: ${emailAddress}`);

      const existingAccount = this.emailAccountRepo.findByEmail(emailAddress);
      if (existingAccount) {
        const account = this.emailAccountRepo.updateTokens(existingAccount.id, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
        });

        await this.saveTokens(account.id, tokens);

        return { success: true, data: account };
      }

      const account = this.emailAccountRepo.create({
        user_id: userId,
        email_address: emailAddress,
        provider: 'gmail',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date).toISOString(),
      });

      await this.saveTokens(account.id, tokens);

      return { success: true, data: account };
    } catch (error: any) {
      console.error('Error authenticating Gmail:', error);
      // Return more specific error message
      const errorMessage = error.response?.data?.error_description || error.message || 'Authentication failed';
      return { success: false, error: errorMessage };
    }
  }

  async refreshAccessToken(emailAccountId: number): Promise<string | null> {
    const clientId = process.env.GMAIL_CLIENT_ID || '';
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

    const tokens = await this.getTokens(emailAccountId);
    if (!tokens || !tokens.refresh_token) return null;

    try {
      const client = new GmailClient(clientId, clientSecret, redirectUri);
      const newTokens = await client.refreshAccessToken(tokens.refresh_token);

      this.emailAccountRepo.updateTokens(emailAccountId, {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        token_expires_at: new Date(newTokens.expiry_date).toISOString(),
      });

      await this.saveTokens(emailAccountId, newTokens);

      return newTokens.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  async syncEmails(emailAccountId: number): Promise<Result<SyncResult>> {
    const clientId = process.env.GMAIL_CLIENT_ID || '';
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

    try {
      const account = this.emailAccountRepo.findById(emailAccountId);
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      const tokens = await this.getTokens(emailAccountId);
      if (!tokens) {
        return { success: false, error: 'Tokens not found' };
      }

      const client = new GmailClient(clientId, clientSecret, redirectUri, tokens);

      let query = 'label:INBOX';
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
          const detail = await client.getMessage(message.id);

          const existing = this.emailMessageRepo.findByMessageId(message.id);
          if (existing) {
            continue;
          }

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

          const allocationResult = await this.allocationService.allocateEmail(emailMessage.id);
          if (allocationResult.success && allocationResult.data) {
            messagesAllocated++;
          }
        } catch (error: any) {
          console.error('Error processing message:', error);
          errors.push(`Message ${message.id}: ${error.message}`);
        }
      }

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

  async syncAllActiveAccounts(): Promise<void> {
    try {
      const accounts = this.emailAccountRepo.findAllActive();

      for (const account of accounts) {
        await this.syncEmails(account.id);
      }
    } catch (error) {
      console.error('Error syncing all accounts:', error);
    }
  }

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

  async getEmailsByCompany(companyId: number, pagination?: PaginationOptions): Promise<Result<EmailMessage[]>> {
    try {
      const messages = this.emailMessageRepo.findByCompanyId(companyId, pagination);
      return { success: true, data: messages };
    } catch (error: any) {
      console.error('Error getting emails by company:', error);
      return { success: false, error: error.message };
    }
  }

  async getUnallocatedEmails(emailAccountId: number, pagination?: PaginationOptions): Promise<Result<EmailMessage[]>> {
    try {
      const messages = this.emailMessageRepo.findUnallocated(emailAccountId, pagination);
      return { success: true, data: messages };
    } catch (error: any) {
      console.error('Error getting unallocated emails:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllEmails(emailAccountId: number, pagination?: PaginationOptions): Promise<Result<EmailMessage[]>> {
    try {
      const messages = this.emailMessageRepo.findByEmailAccountId(emailAccountId, pagination);
      return { success: true, data: messages };
    } catch (error: any) {
      console.error('Error getting all emails:', error);
      return { success: false, error: error.message };
    }
  }

  async markAsRead(id: number): Promise<Result<void>> {
    try {
      this.emailMessageRepo.updateReadStatus(id, true);
      return { success: true };
    } catch (error: any) {
      console.error('Error marking email as read:', error);
      return { success: false, error: error.message };
    }
  }

  async searchEmails(emailAccountId: number, query: string): Promise<Result<EmailMessage[]>> {
    try {
      const messages = this.emailMessageRepo.search(emailAccountId, query);
      return { success: true, data: messages };
    } catch (error: any) {
      console.error('Error searching emails:', error);
      return { success: false, error: error.message };
    }
  }

  async getAccountsByUserId(userId: number): Promise<Result<EmailAccount[]>> {
    try {
      const accounts = this.emailAccountRepo.findByUserId(userId);
      return { success: true, data: accounts };
    } catch (error: any) {
      console.error('Error getting accounts:', error);
      return { success: false, error: error.message };
    }
  }

  async downloadAttachment(emailMessageId: number, attachmentId: string): Promise<Result<{ data: string; size: number }>> {
    const clientId = process.env.GMAIL_CLIENT_ID || '';
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

    try {
      const message = this.emailMessageRepo.findById(emailMessageId);
      if (!message) {
        return { success: false, error: 'Email message not found' };
      }

      const tokens = await this.getTokens(message.email_account_id);
      if (!tokens) {
        return { success: false, error: 'Tokens not found' };
      }

      const client = new GmailClient(clientId, clientSecret, redirectUri, tokens);
      const attachment = await client.getAttachment(message.message_id, attachmentId);

      return { success: true, data: attachment };
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      return { success: false, error: error.message };
    }
  }

  async analyzeEmail(emailMessageId: number): Promise<Result<{ events: any[]; es: any[] }>> {
    try {
      const message = this.emailMessageRepo.findById(emailMessageId);
      if (!message) {
        return { success: false, error: 'Email message not found' };
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { EmailParser } = require('./emailParser');
      const events = EmailParser.extractEventCandidates(message.subject || '', message.body_text || '');
      const es = EmailParser.extractESDeadlineCandidates(message.subject || '', message.body_text || '');

      return { success: true, data: { events, es } };
    } catch (error: any) {
      console.error('Error analyzing email:', error);
      return { success: false, error: error.message };
    }
  }

  private async saveTokens(emailAccountId: number, tokens: TokenData): Promise<void> {
    const accountName = `email_account_${emailAccountId}`;
    await keytar.setPassword(SERVICE_NAME, accountName, JSON.stringify(tokens));
  }

  private async getTokens(emailAccountId: number): Promise<TokenData | null> {
    const accountName = `email_account_${emailAccountId}`;
    const tokensJson = await keytar.getPassword(SERVICE_NAME, accountName);
    return tokensJson ? JSON.parse(tokensJson) : null;
  }
}
