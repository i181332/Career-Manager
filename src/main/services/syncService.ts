import { EmailService } from './emailService';
import { GoogleCalendarService } from './googleCalendarService';
import { EmailAccountRepository } from '../../database/repositories/emailAccountRepository';
import { EventRepository } from '../../database/repositories/eventRepository';
import { ESEntryRepository } from '../../database/repositories/esEntryRepository';
import { GmailClient } from './gmailClient';
import { Result } from '../../database/types';

export class SyncService {
    private emailService: EmailService;
    private emailAccountRepo: EmailAccountRepository;
    private eventRepo: EventRepository;
    private esEntryRepo: ESEntryRepository;

    constructor() {
        this.emailService = new EmailService();
        this.emailAccountRepo = new EmailAccountRepository();
        this.eventRepo = new EventRepository();
        this.esEntryRepo = new ESEntryRepository();
    }

    // 全同期（メール＆カレンダー）
    async syncAll(userId: number): Promise<Result<void>> {
        try {
            // 1. メール同期
            await this.emailService.syncAllActiveAccounts();

            // 2. カレンダー同期
            await this.syncCalendar(userId);

            return { success: true };
        } catch (error: any) {
            console.error('Error in syncAll:', error);
            return { success: false, error: error.message };
        }
    }

    // カレンダー同期（App -> Google）
    async syncCalendar(userId: number): Promise<Result<void>> {
        try {
            // ユーザーのメールアカウント（Google連携済み）を取得
            const accounts = this.emailAccountRepo.findByUserId(userId);
            const gmailAccount = accounts.find(acc => acc.provider === 'gmail' && acc.access_token);

            if (!gmailAccount) {
                return { success: false, error: 'No linked Google account found' };
            }

            // トークン情報取得
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const keytar = require('keytar');
            const SERVICE_NAME = 'CareerManagerApp';
            const accountName = `email_account_${gmailAccount.id}`;
            const tokensJson = await keytar.getPassword(SERVICE_NAME, accountName);

            if (!tokensJson) {
                return { success: false, error: 'Tokens not found' };
            }

            const tokens = JSON.parse(tokensJson);

            // GoogleCalendarService初期化
            const clientId = process.env.GMAIL_CLIENT_ID || '';
            const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
            const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

            const client = new GmailClient(clientId, clientSecret, redirectUri, tokens);
            const auth = client.getAuthClient();

            const calendarService = new GoogleCalendarService(auth);

            // 1. イベント同期
            const events = this.eventRepo.findByUserId(userId);
            for (const event of events) {
                if (!event.google_calendar_event_id) {
                    const result = await calendarService.createEvent({
                        summary: event.title,
                        description: event.description || '',
                        start: { dateTime: new Date(event.start_at).toISOString() },
                        end: event.end_at ? { dateTime: new Date(event.end_at).toISOString() } : { dateTime: new Date(new Date(event.start_at).getTime() + 60 * 60 * 1000).toISOString() }, // デフォルト1時間
                        location: event.location,
                    });

                    if (result.success && result.data) {
                        this.eventRepo.update(event.id, { google_calendar_event_id: result.data });
                    }
                }
            }

            // 2. ES締切同期
            const esEntries = this.esEntryRepo.findByUserId(userId);
            for (const es of esEntries) {
                if (es.deadline && !es.google_calendar_event_id) {
                    const result = await calendarService.createEvent({
                        summary: `【ES締切】${es.title}`,
                        description: `ステータス: ${es.status}\n${es.content || ''}`,
                        start: { dateTime: new Date(es.deadline).toISOString() },
                        end: { dateTime: new Date(new Date(es.deadline).getTime() + 60 * 60 * 1000).toISOString() },
                    });

                    if (result.success && result.data) {
                        this.esEntryRepo.update(es.id, { google_calendar_event_id: result.data });
                    }
                }
            }

            return { success: true };
        } catch (error: any) {
            console.error('Error syncing calendar:', error);
            return { success: false, error: error.message };
        }
    }

    // 単一イベント同期（App -> Google）
    async syncEventToGoogleCalendar(eventId: number): Promise<Result<void>> {
        try {
            const event = this.eventRepo.findById(eventId);
            if (!event) {
                return { success: false, error: 'Event not found' };
            }

            // ユーザーのメールアカウント（Google連携済み）を取得
            const accounts = this.emailAccountRepo.findByUserId(event.user_id);
            const gmailAccount = accounts.find(acc => acc.provider === 'gmail' && acc.access_token);

            if (!gmailAccount) {
                return { success: false, error: 'No linked Google account found' };
            }

            // トークン情報取得
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const keytar = require('keytar');
            const SERVICE_NAME = 'CareerManagerApp';
            const accountName = `email_account_${gmailAccount.id}`;
            const tokensJson = await keytar.getPassword(SERVICE_NAME, accountName);

            if (!tokensJson) {
                return { success: false, error: 'Tokens not found' };
            }

            const tokens = JSON.parse(tokensJson);

            // GoogleCalendarService初期化
            const clientId = process.env.GMAIL_CLIENT_ID || '';
            const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
            const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

            const client = new GmailClient(clientId, clientSecret, redirectUri, tokens);
            const auth = client.getAuthClient();

            const calendarService = new GoogleCalendarService(auth);

            if (!event.google_calendar_event_id) {
                const result = await calendarService.createEvent({
                    summary: event.title,
                    description: event.description || '',
                    start: { dateTime: new Date(event.start_at).toISOString() },
                    end: event.end_at ? { dateTime: new Date(event.end_at).toISOString() } : { dateTime: new Date(new Date(event.start_at).getTime() + 60 * 60 * 1000).toISOString() }, // デフォルト1時間
                    location: event.location,
                });

                if (result.success && result.data) {
                    this.eventRepo.update(event.id, { google_calendar_event_id: result.data });
                    return { success: true };
                } else {
                    return { success: false, error: result.error };
                }
            }

            return { success: true };
        } catch (error: any) {
            console.error('Error syncing event to Google Calendar:', error);
            return { success: false, error: error.message };
        }
    }
}
