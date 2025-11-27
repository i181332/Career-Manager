import cron from 'node-cron';
import { NotificationService } from './notificationService';

export class SchedulerService {
  private notificationService: NotificationService;
  private task: cron.ScheduledTask | null = null;
  private webhookUrl: string | null = null;

  constructor() {
    this.notificationService = new NotificationService();
  }

  start(webhookUrl?: string) {
    if (this.task) {
      console.log('Scheduler is already running');
      return;
    }

    if (webhookUrl) {
      this.webhookUrl = webhookUrl;
    }

    // 毎分実行
    this.task = cron.schedule('* * * * *', async () => {
      await this.checkAndSendNotifications();
    });

    console.log('Notification scheduler started');
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('Notification scheduler stopped');
    }
  }

  setWebhookUrl(url: string) {
    this.webhookUrl = url;
  }

  private async checkAndSendNotifications() {
    try {
      console.log('Checking for pending notifications...');
      const pendingNotifications = this.notificationService.getPendingNotifications();
      console.log(`Found ${pendingNotifications.length} pending notifications`);

      for (const notification of pendingNotifications) {
        console.log(`Processing notification ${notification.id}, scheduled for ${notification.scheduled_at}`);
        
        if (this.webhookUrl) {
          console.log(`Sending notification ${notification.id} to Slack...`);
          const result = await this.notificationService.sendSlackNotification(
            notification.id,
            this.webhookUrl
          );
          console.log(`Notification ${notification.id} result:`, result);
        } else {
          console.log('Slack Webhook URL not configured');
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }

  // 手動で通知チェックを実行（デバッグ用）
  async checkNow() {
    console.log('=== Manual notification check started ===');
    await this.checkAndSendNotifications();
    console.log('=== Manual notification check completed ===');
  }
}
