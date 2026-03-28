const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, 'data', 'messages.db');

// 确保数据目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// 初始化数据库表
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 创建留言表
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          name TEXT NOT NULL,
          ip TEXT,
          isAnonymous INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          reply TEXT,
          replyAt DATETIME,
          status INTEGER DEFAULT 1
        )
      `, (err) => {
        if (err) {
          console.error('创建messages表失败:', err);
          reject(err);
        }
      });
      
      // 创建索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_createdAt ON messages(createdAt DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_status ON messages(status)`);
      
      // 创建管理员操作日志表
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT,
          messageId INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ 数据库初始化完成');
      resolve();
    });
  });
};

// 获取所有留言（按时间倒序）
const getAllMessages = () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, content, name, isAnonymous, createdAt, reply, replyAt, status 
       FROM messages 
       WHERE status = 1 
       ORDER BY createdAt DESC`,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

// 创建新留言
const createMessage = ({ content, name, ip, isAnonymous }) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO messages (content, name, ip, isAnonymous, createdAt) 
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [content, name, ip, isAnonymous ? 1 : 0],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

// 添加回复
const addReply = (messageId, reply) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE messages 
       SET reply = ?, replyAt = datetime('now') 
       WHERE id = ?`,
      [reply, messageId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // 记录管理员操作
          db.run(
            `INSERT INTO admin_logs (action, messageId, createdAt) 
             VALUES (?, ?, datetime('now'))`,
            ['reply', messageId]
          );
          resolve(this.changes);
        }
      }
    );
  });
};

// 删除留言（软删除）
const deleteMessage = (messageId) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE messages SET status = 0 WHERE id = ?`,
      [messageId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // 记录管理员操作
          db.run(
            `INSERT INTO admin_logs (action, messageId, createdAt) 
             VALUES (?, ?, datetime('now'))`,
            ['delete', messageId]
          );
          resolve(this.changes);
        }
      }
    );
  });
};

// 获取统计数据
const getStats = () => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
         COUNT(*) as totalMessages,
         SUM(CASE WHEN reply IS NOT NULL THEN 1 ELSE 0 END) as repliedCount,
         SUM(CASE WHEN isAnonymous = 1 THEN 1 ELSE 0 END) as anonymousCount,
         SUM(CASE WHEN isAnonymous = 0 AND name != '匿名用户' THEN 1 ELSE 0 END) as namedCount
       FROM messages 
       WHERE status = 1`,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
};

// 初始化数据库
initDatabase().catch(console.error);

module.exports = {
  getAllMessages,
  createMessage,
  addReply,
  deleteMessage,
  getStats
};
