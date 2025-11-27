import { NotificationRepository } from '../../database/repositories/notificationRepository';
import { Notification, Event } from '../../database/types';
import axios from 'axios';

export class NotificationService {
  private notificationRepository: NotificationRepository;

  constructor() {
    this.notificationRepository = new NotificationRepository();
  }

  createNotificationForEvent(event: Event): { success: boolean; notification?: Notification; error?: string } {
    try {
      if (!event.slack_notify) {
        return { success: true };
      }

      // リマインダー時刻を計算
      const startTime = new Date(event.start_at);
      const scheduledTime = new Date(startTime.getTime() - event.remind_before_minutes * 60000);

      // 既に過去の場合は通知を作成しない
      if (scheduledTime < new Date()) {
        return { success: true };
      }

      const notification = this.notificationRepository.create({
        user_id: event.user_id,
        event_id: event.id,
        scheduled_at: scheduledTime.toISOString(),
        channel: 'slack',
        payload: JSON.stringify({
          event_title: event.title,
          event_start: event.start_at,
          event_location: event.location,
          company_id: event.company_id,
        }),
      });

      return { success: true, notification };
    } catch (error) {
      console.error('Create notification error:', error);
      return { success: false, error: '通知の作成に失敗しました' };
    }
  }

  getByUserId(userId: number): { success: boolean; notifications?: Notification[]; error?: string } {
    try {
      const notifications = this.notificationRepository.findByUserId(userId);
      return { success: true, notifications };
    } catch (error) {
      console.error('Get notifications error:', error);
      return { success: false, error: '通知一覧の取得に失敗しました' };
    }
  }

  getByStatus(userId: number, status: string): { success: boolean; notifications?: Notification[]; error?: string } {
    try {
      const notifications = this.notificationRepository.findByStatus(userId, status);
      return { success: true, notifications };
    } catch (error) {
      console.error('Get notifications by status error:', error);
      return { success: false, error: '通知の取得に失敗しました' };
    }
  }

  async sendSlackNotification(
    notificationId: number,
    webhookUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = this.notificationRepository.findById(notificationId);
      if (!notification) {
        return { success: false, error: '通知が見つかりません' };
      }

      const payload = JSON.parse(notification.payload);

      // Slackメッセージの作成
      const message = {
        text: `<!everyone> 📅 イベントのリマインダー: ${payload.event_title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '<!everyone>',
            },
          },
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `📅 ${payload.event_title}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*日時:*\n${new Date(payload.event_start).toLocaleString('ja-JP')}`,
              },
              ...(payload.event_location
                ? [
                    {
                      type: 'mrkdwn',
                      text: `*場所:*\n${payload.event_location}`,
                    },
                  ]
                : []),
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '就活管理アプリからの通知',
              },
            ],
          },
        ],
      };

      // Slack Webhook送信
      if (webhookUrl) {
        await axios.post(webhookUrl, message);
        this.notificationRepository.markAsSent(notificationId);
        return { success: true };
      } else {
        return { success: false, error: 'Slack Webhook URLが設定されていません' };
      }
    } catch (error) {
      console.error('Send Slack notification error:', error);
      this.notificationRepository.markAsFailed(notificationId);
      return { success: false, error: 'Slack通知の送信に失敗しました' };
    }
  }

  async sendTestNotification(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date();
      const message = {
        text: '<!everyone> 🧪 就活管理アプリ - テスト通知',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🧪 テスト通知',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '<!everyone> *就活管理アプリからのテスト通知です*',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*送信日時:*\n${now.toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}`,
              },
              {
                type: 'mrkdwn',
                text: '*ステータス:*\n✅ 正常に動作しています',
              },
            ],
          },
          {
            type: 'divider',
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '💡 このメッセージが表示されれば、Slack通知が正しく設定されています。',
              },
            ],
          },
        ],
      };

      await axios.post(webhookUrl, message);
      console.log('Test notification sent successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Send test notification error:', error);
      const errorMessage = error.response?.data || error.message || '不明なエラー';
      return { 
        success: false, 
        error: `テスト通知の送信に失敗しました: ${errorMessage}` 
      };
    }
  }

  retryNotification(notificationId: number): { success: boolean; error?: string } {
    try {
      const notification = this.notificationRepository.update(notificationId, {
        status: 'pending',
      });
      if (!notification) {
        return { success: false, error: '通知が見つかりません' };
      }
      return { success: true };
    } catch (error) {
      console.error('Retry notification error:', error);
      return { success: false, error: '通知の再試行に失敗しました' };
    }
  }

  deleteByEventId(eventId: number): { success: boolean; error?: string } {
    try {
      this.notificationRepository.deleteByEventId(eventId);
      return { success: true };
    } catch (error) {
      console.error('Delete notifications error:', error);
      return { success: false, error: '通知の削除に失敗しました' };
    }
  }

  getPendingNotifications(): Notification[] {
    return this.notificationRepository.findPendingNotifications();
  }
}
