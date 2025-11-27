// テスト用通知を作成するスクリプト
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(
  os.homedir(),
  'AppData',
  'Roaming',
  'job-hunting-manager',
  'job-hunting.db'
);

console.log('Database path:', dbPath);

const db = new Database(dbPath);

// 現在のユーザーを取得
const users = db.prepare('SELECT * FROM users').all();
console.log('Users:', users);

if (users.length === 0) {
  console.log('No users found. Please register first.');
  process.exit(0);
}

const userId = users[0].id;

// テストイベントを作成
const now = new Date();
const eventStart = new Date(now.getTime() + 5 * 60000); // 5分後

const insertEvent = db.prepare(`
  INSERT INTO events (user_id, title, description, start_at, type, remind_before_minutes, slack_notify)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const eventResult = insertEvent.run(
  userId,
  'テスト通知イベント',
  'これは通知テスト用のイベントです',
  eventStart.toISOString(),
  'other',
  3, // 3分前に通知
  1
);

const eventId = eventResult.lastInsertRowid;
console.log('Created event:', eventId);

// 通知を作成（今すぐ送信されるように）
const scheduledAt = new Date(now.getTime() - 60000); // 1分前（既に過ぎている）

const insertNotification = db.prepare(`
  INSERT INTO notifications (user_id, event_id, scheduled_at, channel, status, payload)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const notifResult = insertNotification.run(
  userId,
  eventId,
  scheduledAt.toISOString(),
  'slack',
  'pending',
  JSON.stringify({
    event_title: 'テスト通知イベント',
    event_start: eventStart.toISOString(),
    event_location: 'テスト会場'
  })
);

console.log('Created notification:', notifResult.lastInsertRowid);

// 作成した通知を確認
const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ?').all(userId);
console.log('\nAll notifications:');
console.log(notifications);

// pending通知を確認
const pendingNotifications = db.prepare(`
  SELECT * FROM notifications 
  WHERE status = 'pending' 
  AND scheduled_at <= datetime('now')
  ORDER BY scheduled_at ASC
`).all();

console.log('\nPending notifications that should be sent:');
console.log(pendingNotifications);

db.close();
console.log('\n✅ Test notification created! Now click "通知をテスト" button in the app.');
