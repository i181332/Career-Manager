import cron from 'node-cron';
import { EmailAccountRepository } from '../../database/repositories/emailAccountRepository';
import { EmailService } from './emailService';

export class EmailSchedulerService {
  private jobs: Map<number, cron.ScheduledTask> = new Map();
  private emailAccountRepo: EmailAccountRepository;
  private emailService: EmailService;

  constructor() {
    this.emailAccountRepo = new EmailAccountRepository();
    this.emailService = new EmailService();
  }

  // ユーザーの全メールアカウントの同期スケジュールを登録
  startSyncScheduler(userId: number, intervalMinutes: number = 10): void {
    try {
      const accounts = this.emailAccountRepo.findByUserId(userId);

      accounts.forEach((account) => {
        if (account.sync_enabled) {
          // 既存のジョブがあれば停止
          this.stopSyncScheduler(account.id);

          // Cron式: 指定分ごとに実行
          const cronExpression = `*/${intervalMinutes} * * * *`;

          const job = cron.schedule(cronExpression, async () => {
            console.log(`[Email Sync] Starting sync for account ${account.id} (${account.email_address})`);
            try {
              const result = await this.emailService.syncEmails(account.id);
              if (result.success && result.data) {
                console.log(
                  `[Email Sync] Completed: ${result.data.messagesFetched} messages fetched, ${result.data.messagesAllocated} allocated`
                );
              } else {
                console.error(`[Email Sync] Failed: ${result.error}`);
              }
            } catch (error) {
              console.error(`[Email Sync] Error:`, error);
            }
          });

          this.jobs.set(account.id, job);
          console.log(`[Email Sync] Scheduled sync for account ${account.id} every ${intervalMinutes} minutes`);
        }
      });
    } catch (error) {
      console.error('Error starting sync scheduler:', error);
    }
  }

  // 特定アカウントの同期を停止
  stopSyncScheduler(emailAccountId: number): void {
    const job = this.jobs.get(emailAccountId);
    if (job) {
      job.stop();
      this.jobs.delete(emailAccountId);
      console.log(`[Email Sync] Stopped sync for account ${emailAccountId}`);
    }
  }

  // すべての同期を停止
  stopAll(userId: number): void {
    const accounts = this.emailAccountRepo.findByUserId(userId);
    accounts.forEach((account) => {
      this.stopSyncScheduler(account.id);
    });
  }

  // すべての同期を再起動
  restartAll(userId: number, intervalMinutes: number): void {
    this.stopAll(userId);
    this.startSyncScheduler(userId, intervalMinutes);
  }

  // 手動同期をトリガー
  async triggerManualSync(emailAccountId: number): Promise<void> {
    console.log(`[Email Sync] Manual sync triggered for account ${emailAccountId}`);
    try {
      const result = await this.emailService.syncEmails(emailAccountId);
      if (result.success && result.data) {
        console.log(
          `[Email Sync] Manual sync completed: ${result.data.messagesFetched} messages fetched, ${result.data.messagesAllocated} allocated`
        );
      } else {
        console.error(`[Email Sync] Manual sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`[Email Sync] Manual sync error:`, error);
    }
  }
}
