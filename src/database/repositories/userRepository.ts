import { getDatabase } from '../init';
import { User } from '../types';

export class UserRepository {
  create(userData: {
    name: string;
    email: string;
    password_hash: string;
    slack_user_id?: string;
  }): User {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO users (name, email, password_hash, slack_user_id)
        VALUES (?, ?, ?, ?)
      `);

      const info = stmt.run(
        userData.name,
        userData.email,
        userData.password_hash,
        userData.slack_user_id || null
      );

      const newUser = this.findById(info.lastInsertRowid as number);
      if (!newUser) {
        throw new Error('Failed to create user: User not found after insertion');
      }
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Email already exists');
      }
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): User | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      return stmt.get(id) as User | undefined;
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw new Error(`Failed to find user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findByEmail(email: string): User | undefined {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      return stmt.get(email) as User | undefined;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error(`Failed to find user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  update(
    id: number,
    userData: Partial<{
      name: string;
      email: string;
      slack_user_id: string;
      settings: string;
      ai_config: string;
    }>
  ): User | undefined {
    try {
      const db = getDatabase();
      const fields = Object.keys(userData)
        .map((key) => `${key} = ?`)
        .join(', ');

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const stmt = db.prepare(`
        UPDATE users
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(...Object.values(userData), id);
      if (info.changes === 0) {
        throw new Error('User not found or no changes made');
      }
      return this.findById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Email already exists');
      }
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  delete(id: number): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM users WHERE id = ?');
      const info = stmt.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
