import { EventRepository } from '../../database/repositories/eventRepository';
import { Event } from '../../database/types';
import { NotificationService } from './notificationService';

export class EventService {
  private eventRepository: EventRepository;
  private notificationService: NotificationService;

  constructor() {
    this.eventRepository = new EventRepository();
    this.notificationService = new NotificationService();
  }

  create(eventData: {
    user_id: number;
    company_id?: number;
    title: string;
    description?: string;
    start_at: string;
    end_at?: string;
    all_day?: boolean;
    location?: string;
    type?: string;
    remind_before_minutes?: number;
    slack_notify?: boolean;
  }): { success: boolean; event?: Event; error?: string } {
    try {
      const event = this.eventRepository.create(eventData);

      // イベントにSlack通知が設定されている場合、通知を作成
      if (event.slack_notify) {
        this.notificationService.createNotificationForEvent(event);
      }

      return { success: true, event };
    } catch (error) {
      console.error('Create event error:', error);
      return { success: false, error: 'イベントの作成に失敗しました' };
    }
  }

  getById(id: number): { success: boolean; event?: Event; error?: string } {
    try {
      const event = this.eventRepository.findById(id);
      if (!event) {
        return { success: false, error: 'イベントが見つかりません' };
      }
      return { success: true, event };
    } catch (error) {
      console.error('Get event error:', error);
      return { success: false, error: 'イベントの取得に失敗しました' };
    }
  }

  getByUserId(userId: number): { success: boolean; events?: Event[]; error?: string } {
    try {
      const events = this.eventRepository.findByUserId(userId);
      return { success: true, events };
    } catch (error) {
      console.error('Get events error:', error);
      return { success: false, error: 'イベント一覧の取得に失敗しました' };
    }
  }

  getByDateRange(
    userId: number,
    startDate: string,
    endDate: string
  ): { success: boolean; events?: Event[]; error?: string } {
    try {
      const events = this.eventRepository.findByDateRange(userId, startDate, endDate);
      return { success: true, events };
    } catch (error) {
      console.error('Get events by date range error:', error);
      return { success: false, error: 'イベントの取得に失敗しました' };
    }
  }

  getByCompanyId(companyId: number): { success: boolean; events?: Event[]; error?: string } {
    try {
      const events = this.eventRepository.findByCompanyId(companyId);
      return { success: true, events };
    } catch (error) {
      console.error('Get events by company error:', error);
      return { success: false, error: 'イベントの取得に失敗しました' };
    }
  }

  getUpcoming(userId: number, limit?: number): { success: boolean; events?: Event[]; error?: string } {
    try {
      const events = this.eventRepository.getUpcomingEvents(userId, limit);
      return { success: true, events };
    } catch (error) {
      console.error('Get upcoming events error:', error);
      return { success: false, error: '近日のイベントの取得に失敗しました' };
    }
  }

  update(
    id: number,
    eventData: Partial<{
      company_id: number;
      title: string;
      description: string;
      start_at: string;
      end_at: string;
      all_day: number;
      location: string;
      type: string;
      remind_before_minutes: number;
      slack_notify: number;
    }>
  ): { success: boolean; event?: Event; error?: string } {
    try {
      const event = this.eventRepository.update(id, eventData);
      if (!event) {
        return { success: false, error: 'イベントが見つかりません' };
      }

      // 通知設定が変更された場合、既存の通知を削除して再作成
      if (
        eventData.slack_notify !== undefined ||
        eventData.start_at !== undefined ||
        eventData.remind_before_minutes !== undefined
      ) {
        // 既存の通知を削除
        this.notificationService.deleteByEventId(id);

        // Slack通知が有効な場合は新しい通知を作成
        if (event.slack_notify) {
          this.notificationService.createNotificationForEvent(event);
        }
      }

      return { success: true, event };
    } catch (error) {
      console.error('Update event error:', error);
      return { success: false, error: 'イベントの更新に失敗しました' };
    }
  }

  delete(id: number): { success: boolean; error?: string } {
    try {
      // イベントに紐づく通知を削除
      this.notificationService.deleteByEventId(id);

      const result = this.eventRepository.delete(id);
      if (!result) {
        return { success: false, error: 'イベントが見つかりません' };
      }
      return { success: true };
    } catch (error) {
      console.error('Delete event error:', error);
      return { success: false, error: 'イベントの削除に失敗しました' };
    }
  }
}
