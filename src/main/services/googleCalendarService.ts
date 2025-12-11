import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Result } from '../../database/types';

export class GoogleCalendarService {
    private calendar: calendar_v3.Calendar;
    private calendarId: string = 'primary'; // デフォルトはプライマリカレンダーだが、専用カレンダーを作成する場合はIDを保持する

    constructor(auth: OAuth2Client) {
        this.calendar = google.calendar({ version: 'v3', auth });
    }

    // 専用カレンダーの取得または作成
    async getOrCreateCalendar(summary: string = '就活管理'): Promise<string> {
        try {
            console.log(`Checking for existing calendar with summary: ${summary}`);
            // 既存のカレンダーリストを取得
            const res = await this.calendar.calendarList.list();
            const calendars = res.data.items || [];
            console.log(`Found ${calendars.length} calendars`);

            const existing = calendars.find(c => c.summary === summary);
            if (existing && existing.id) {
                console.log(`Found existing calendar: ${existing.id}`);
                this.calendarId = existing.id;
                return existing.id;
            }

            console.log('Calendar not found, creating new one...');
            // 新規作成
            const newCalendar = await this.calendar.calendars.insert({
                requestBody: {
                    summary: summary,
                    timeZone: 'Asia/Tokyo'
                }
            });

            if (newCalendar.data.id) {
                console.log(`Created new calendar: ${newCalendar.data.id}`);
                this.calendarId = newCalendar.data.id;
                return newCalendar.data.id;
            }

            throw new Error('Failed to create calendar');
        } catch (error) {
            console.error('Error getting/creating calendar:', error);
            throw error;
        }
    }

    async createEvent(event: {
        summary: string;
        description?: string;
        start: { dateTime?: string; date?: string };
        end: { dateTime?: string; date?: string };
        location?: string;
    }): Promise<Result<string>> {
        try {
            // カレンダーIDが未設定（初期状態）なら取得を試みる
            if (this.calendarId === 'primary') {
                await this.getOrCreateCalendar();
            }

            const res = await this.calendar.events.insert({
                calendarId: this.calendarId,
                requestBody: event,
            });

            if (res.data.id) {
                return { success: true, data: res.data.id };
            }
            return { success: false, error: 'Failed to create event' };
        } catch (error: any) {
            console.error('Error creating calendar event:', error);
            return { success: false, error: error.message };
        }
    }

    async updateEvent(eventId: string, event: {
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        location?: string;
    }): Promise<Result<void>> {
        try {
            if (this.calendarId === 'primary') {
                await this.getOrCreateCalendar();
            }

            await this.calendar.events.patch({
                calendarId: this.calendarId,
                eventId: eventId,
                requestBody: event,
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error updating calendar event:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteEvent(eventId: string): Promise<Result<void>> {
        try {
            if (this.calendarId === 'primary') {
                await this.getOrCreateCalendar();
            }

            await this.calendar.events.delete({
                calendarId: this.calendarId,
                eventId: eventId,
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error deleting calendar event:', error);
            return { success: false, error: error.message };
        }
    }
}
