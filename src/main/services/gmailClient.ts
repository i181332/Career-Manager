import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { TokenData, GmailMessage, GmailMessageDetail } from '../../database/types';

export class GmailClient {
  private oauth2Client: OAuth2Client;
  private gmail: any;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokens?: TokenData
  ) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    if (tokens) {
      this.oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      });
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // 認証URLを生成
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      prompt: 'consent', // 常にrefresh_tokenを取得
    });
  }

  // 認証コードをトークンに交換
  async getTokensFromCode(code: string): Promise<TokenData> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      throw new Error('Invalid tokens received from Google');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    };
  }

  // トークンを更新
  async refreshAccessToken(refreshToken: string): Promise<TokenData> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token || !credentials.refresh_token || !credentials.expiry_date) {
      throw new Error('Failed to refresh access token');
    }

    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
    };
  }

  // メッセージリスト取得
  async listMessages(query: string, maxResults: number = 100): Promise<GmailMessage[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      return response.data.messages || [];
    } catch (error: any) {
      if (error.code === 401) {
        throw new Error('invalid_grant');
      }
      throw error;
    }
  }

  // メッセージ詳細取得
  async getMessage(messageId: string): Promise<GmailMessageDetail> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return response.data as GmailMessageDetail;
    } catch (error: any) {
      if (error.code === 401) {
        throw new Error('invalid_grant');
      }
      throw error;
    }
  }

  // 既読マーク（オプション）
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    } catch (error: any) {
      console.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  // ヘッダーから値を取得するヘルパー
  static getHeader(headers: Array<{ name: string; value: string }>, name: string): string | undefined {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value;
  }

  // メールアドレスを抽出
  static extractEmail(fromHeader: string | undefined): string {
    if (!fromHeader) return '';
    const match = fromHeader.match(/<(.+?)>/);
    return match ? match[1] : fromHeader;
  }

  // 送信者名を抽出
  static extractName(fromHeader: string | undefined): string | undefined {
    if (!fromHeader) return undefined;
    const match = fromHeader.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '').trim() : undefined;
  }

  // ドメインを抽出
  static extractDomain(email: string): string {
    const match = email.match(/@(.+)$/);
    return match ? `@${match[1]}` : '';
  }

  // テキスト本文を抽出
  static extractTextBody(payload: any): string | undefined {
    if (payload.body?.data) {
      return this.decodeBase64(payload.body.data);
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
        if (part.parts) {
          const text = this.extractTextBody(part);
          if (text) return text;
        }
      }
    }

    return undefined;
  }

  // HTML本文を抽出
  static extractHtmlBody(payload: any): string | undefined {
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return this.decodeBase64(payload.body.data);
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
        if (part.parts) {
          const html = this.extractHtmlBody(part);
          if (html) return html;
        }
      }
    }

    return undefined;
  }

  // 添付ファイルの有無を確認
  static hasAttachments(payload: any): boolean {
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.filename.length > 0) {
          return true;
        }
        if (part.parts && this.hasAttachments(part)) {
          return true;
        }
      }
    }
    return false;
  }

  // 通知設定 (watch)
  async watch(topicName: string): Promise<{ historyId: string; expiration: string }> {
    try {
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: ['INBOX'],
          topicName,
        },
      });
      return {
        historyId: response.data.historyId,
        expiration: response.data.expiration,
      };
    } catch (error: any) {
      console.error('Failed to watch gmail:', error);
      throw error;
    }
  }

  // 通知停止 (stop)
  async stop(): Promise<void> {
    try {
      await this.gmail.users.stop({
        userId: 'me',
      });
    } catch (error: any) {
      console.error('Failed to stop gmail watch:', error);
      throw error;
    }
  }

  // 履歴取得 (listHistory)
  async listHistory(startHistoryId: string): Promise<any> {
    try {
      const response = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to list history:', error);
      throw error;
    }
  }

  // 添付ファイル取得
  async getAttachment(messageId: string, attachmentId: string): Promise<{ data: string; size: number }> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });
      return {
        data: response.data.data, // Base64URL encoded
        size: response.data.size,
      };
    } catch (error: any) {
      console.error('Failed to get attachment:', error);
      throw error;
    }
  }

  // Base64デコード
  private static decodeBase64(data: string): string {
    const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    return buff.toString('utf-8');
  }
}
