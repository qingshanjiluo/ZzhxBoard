const db = require('../db');
const path = require('path');

console.log('🔄 初始化数据库...');
console.log(`📁 数据库路径: ${path.join(__dirname, '..', 'data', 'messages.db')}`);

// 等待数据库初始化完成
setTimeout(() => {
  console.log('✅ 数据库初始化完成');
  process.exit(0);
}, 2000);
