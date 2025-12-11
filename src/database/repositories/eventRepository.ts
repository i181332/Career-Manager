import { getDatabase } from '../init';
import { Event } from '../types';

export class EventRepository {
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
  }): Event {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO events (
          user_id, company_id, title, description, start_at, end_at,
          all_day, location, type, remind_before_minutes, slack_notify
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        eventData.user_id,
        eventData.company_id || null,
        eventData.title,
        eventData.description || null,
        eventData.start_at,
        eventData.end_at || null,
        eventData.all_day ? 1 : 0,
        eventData.location || null,
        eventData.type || null,
        eventData.remind_before_minutes || 60,
        eventData.slack_notify !== false ? 1 : 0
      );

      const newEvent = this.findById(info.lastInsertRowid as number);
      if (!newEvent) {
        throw new Error('Failed to create event: Event not found after insertion');
      }
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): Event | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
      return stmt.get(id) as Event | undefined;
    } catch (error) {
      console.error('Error finding event by id:', error);
      throw new Error(`Failed to find event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByUserId(userId: number): Event[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM events WHERE user_id = ? ORDER BY start_at DESC');
      return stmt.all(userId) as Event[];
    } catch (error) {
      console.error('Error finding events by user id:', error);
      throw new Error(`Failed to find events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByDateRange(userId: number, startDate: string, endDate: string): Event[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM events
        WHERE user_id = ? AND start_at >= ? AND start_at <= ?
        ORDER BY start_at ASC
      `);
      return stmt.all(userId, startDate, endDate) as Event[];
    } catch (error) {
      console.error('Error finding events by date range:', error);
      throw new Error(`Failed to find events by date range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByCompanyId(companyId: number): Event[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM events WHERE company_id = ? ORDER BY start_at DESC');
      return stmt.all(companyId) as Event[];
    } catch (error) {
      console.error('Error finding events by company id:', error);
      throw new Error(`Failed to find events by company: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      google_calendar_event_id: string;
    }>
  ): Event | undefined {
    try {
      const db = getDatabase();
      const fields = Object.keys(eventData)
        .map((key) => `${key} = ?`)
        .join(', ');

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const stmt = db.prepare(`
        UPDATE events
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(...Object.values(eventData), id);
      if (info.changes === 0) {
        throw new Error('Event not found or no changes made');
      }
      return this.findById(id);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  delete(id: number): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM events WHERE id = ?');
      const info = stmt.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getUpcomingEvents(userId: number, limit: number = 10): Event[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM events
        WHERE user_id = ? AND start_at >= datetime('now')
        ORDER BY start_at ASC
        LIMIT ?
      `);
      return stmt.all(userId, limit) as Event[];
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw new Error(`Failed to get upcoming events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
