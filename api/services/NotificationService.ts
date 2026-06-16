import { run, get, all } from '../db/database.js';
import { Notification, NotificationType } from '../../shared/types.js';

export class NotificationService {
  static create(
    userId: number,
    type: NotificationType,
    title: string,
    content: string,
    relatedId: string
  ): Notification {
    const result = run(`
      INSERT INTO notifications (user_id, type, title, content, related_id)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, type, title, content, relatedId]);
    
    return this.getById(result.lastInsertRowid as number);
  }

  static getById(id: number): Notification {
    const row = get('SELECT * FROM notifications WHERE id = ?', [id]) as any;
    return this.mapRow(row);
  }

  static getByUserId(userId: number, limit: number = 50): Notification[] {
    const rows = all(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [userId, limit]) as any[];
    
    return rows.map(row => this.mapRow(row));
  }

  static markAsRead(id: number): boolean {
    const result = run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static markAllAsRead(userId: number): boolean {
    const result = run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    return result.changes > 0;
  }

  static getUnreadCount(userId: number): number {
    const row = get(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `, [userId]) as { count: number };
    
    return row.count;
  }

  static sendToUsers(
    userIds: number[],
    type: NotificationType,
    title: string,
    content: string,
    relatedId: string
  ): Notification[] {
    return userIds.map(userId => 
      this.create(userId, type, title, content, relatedId)
    );
  }

  private static mapRow(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      content: row.content,
      relatedId: row.related_id,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at
    };
  }
}
