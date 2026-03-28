require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ========== 安全与基础中间件 ==========
app.use(helmet({
  contentSecurityPolicy: false, // 允许内联样式
}));
app.use(compression());

// 限流配置
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100,
  message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // GitHub Actions 使用 HTTP
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ========== 静态文件服务（必须在路由之前）==========
// 提供 public 目录下的静态文件（CSS, JS, 图片等）
app.use(express.static(path.join(__dirname, 'public')));

// 显式处理根路径，返回 index.html（防止目录列表）
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 获取客户端IP
app.use((req, res, next) => {
  req.clientIp = req.headers['x-forwarded-for'] ||
                  req.socket.remoteAddress ||
                  req.connection.remoteAddress;
  next();
});

// ========== API 路由 ==========

// 获取所有留言
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.getAllMessages();
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('获取留言失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 提交留言
app.post('/api/messages', async (req, res) => {
  try {
    const { content, name, isAnonymous } = req.body;
    const ip = req.clientIp;

    if (!content || content.trim().length < 1) {
      return res.status(400).json({ success: false, error: '留言内容不能为空' });
    }
    if (content.length > 500) {
      return res.status(400).json({ success: false, error: '留言内容不能超过500字' });
    }

    const displayName = isAnonymous ? '匿名用户' : (name?.trim() || '匿名用户');

    const messageId = await db.createMessage({
      content: content.trim(),
      name: displayName,
      ip: ip,
      isAnonymous: isAnonymous || false
    });

    res.json({
      success: true,
      data: { id: messageId },
      message: '留言发布成功！'
    });
  } catch (error) {
    console.error('提交留言失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 管理员登录
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === adminPassword) {
      req.session.isAdmin = true;
      req.session.adminLoginTime = Date.now();
      res.json({ success: true, message: '登录成功' });
    } else {
      res.status(401).json({ success: false, error: '密码错误' });
    }
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 管理员登出
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: '已登出' });
});

// 检查管理员状态
app.get('/api/admin/check', (req, res) => {
  res.json({
    success: true,
    isAdmin: !!req.session.isAdmin
  });
});

// 管理员回复留言
app.post('/api/admin/reply/:id', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(403).json({ success: false, error: '未授权' });
    }

    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || reply.trim().length < 1) {
      return res.status(400).json({ success: false, error: '回复内容不能为空' });
    }
    if (reply.length > 500) {
      return res.status(400).json({ success: false, error: '回复内容不能超过500字' });
    }

    await db.addReply(id, reply.trim());
    res.json({ success: true, message: '回复成功' });
  } catch (error) {
    console.error('回复失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 删除留言（管理员）
app.delete('/api/admin/message/:id', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(403).json({ success: false, error: '未授权' });
    }

    const { id } = req.params;
    await db.deleteMessage(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 最中幻想Board 已启动`);
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`🔐 管理员密码: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  console.log(`💾 数据库路径: ${path.join(__dirname, 'data', 'messages.db')}`);
});
