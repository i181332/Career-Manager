import ical from 'ical-generator';
import { dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventService } from './eventService';

export class CalendarExportService {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  async exportToICal(userId: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // イベント一覧を取得
      const eventsResult = this.eventService.getByUserId(userId);
      if (!eventsResult.success || !eventsResult.events) {
        return { success: false, error: 'イベントの取得に失敗しました' };
      }

      // iCalカレンダーを作成
      const calendar = ical({ name: '就活管理カレンダー' });

      // イベントを追加
      eventsResult.events.forEach((event: any) => {
        calendar.createEvent({
          start: new Date(event.start_at),
          end: event.end_at ? new Date(event.end_at) : new Date(event.start_at),
          summary: event.title,
          description: event.description || '',
          location: event.location || '',
          allDay: event.all_day === 1,
        });
      });

      // 保存ダイアログを表示
      const result = await dialog.showSaveDialog({
        title: 'カレンダーをエクスポート',
        defaultPath: path.join(os.homedir(), 'Desktop', '就活カレンダー.ics'),
        filters: [
          { name: 'iCalendar', extensions: ['ics'] },
          { name: 'すべてのファイル', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'キャンセルされました' };
      }

      // ファイルに書き込み
      fs.writeFileSync(result.filePath, calendar.toString());

      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('iCal export error:', error);
      return { success: false, error: 'エクスポートに失敗しました' };
    }
  }
}
