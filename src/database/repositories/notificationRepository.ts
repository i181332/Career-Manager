import { getDatabase } from '../init';
import { Notification } from '../types';

export class NotificationRepository {
  create(notificationData: {
    user_id: number;
    event_id?: number;
    scheduled_at: string;
    channel?: string;
    payload?: string;
  }): Notification {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO notifications (user_id, event_id, scheduled_at, channel, payload)
        VALUES (?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        notificationData.user_id,
        notificationData.event_id || null,
        notificationData.scheduled_at,
        notificationData.channel || 'slack',
        notificationData.payload || '{}'
      );

      const newNotification = this.findById(info.lastInsertRowid as number);
      if (!newNotification) {
        throw new Error('Failed to create notification: Notification not found after insertion');
      }
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): Notification | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM notifications WHERE id = ?');
      return stmt.get(id) as Notification | undefined;
    } catch (error) {
      console.error('Error finding notification by id:', error);
      throw new Error(`Failed to find notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByUserId(userId: number): Notification[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY scheduled_at DESC'
      );
      return stmt.all(userId) as Notification[];
    } catch (error) {
      console.error('Error finding notifications by user id:', error);
      throw new Error(`Failed to find notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByStatus(userId: number, status: string): Notification[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM notifications WHERE user_id = ? AND status = ? ORDER BY scheduled_at DESC'
      );
      return stmt.all(userId, status) as Notification[];
    } catch (error) {
      console.error('Error finding notifications by status:', error);
      throw new Error(`Failed to find notifications by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findPendingNotifications(): Notification[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM notifications
        WHERE status = 'pending' AND scheduled_at <= datetime('now')
        ORDER BY scheduled_at ASC
      `);
      return stmt.all() as Notification[];
    } catch (error) {
      console.error('Error finding pending notifications:', error);
      throw new Error(`Failed to find pending notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  update(
    id: number,
    notificationData: Partial<{
      scheduled_at: string;
      sent_at: string;
      status: string;
      payload: string;
    }>
  ): Notification | undefined {
    try {
      const db = getDatabase();
      const fields = Object.keys(notificationData)
        .map((key) => `${key} = ?`)
        .join(', ');

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const stmt = db.prepare(`
        UPDATE notifications
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(...Object.values(notificationData), id);
      if (info.changes === 0) {
        throw new Error('Notification not found or no changes made');
      }
      return this.findById(id);
    } catch (error) {
      console.error('Error updating notification:', error);
      throw new Error(`Failed to update notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  markAsSent(id: number): Notification | undefined {
    try {
      return this.update(id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      throw new Error(`Failed to mark notification as sent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  markAsFailed(id: number): Notification | undefined {
    try {
      return this.update(id, {
        status: 'failed',
      });
    } catch (error) {
      console.error('Error marking notification as failed:', error);
      throw new Error(`Failed to mark notification as failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  delete(id: number): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM notifications WHERE id = ?');
      const info = stmt.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error(`Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  deleteByEventId(eventId: number): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM notifications WHERE event_id = ?');
      const info = stmt.run(eventId);
      return info.changes > 0;
    } catch (error) {
      console.error('Error deleting notifications by event id:', error);
      throw new Error(`Failed to delete notifications by event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
