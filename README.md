# 最中幻想Board - 科技风留言板系统

## ✨ 功能特性

- 💬 **留言功能**：访客可发表留言，支持实名/匿名
- 🔐 **管理员系统**：密码保护的管理面板
- 💬 **回复功能**：管理员可回复任意留言
- 📊 **数据统计**：实时显示留言总数、回复数量
- 🎨 **科技风UI**：玻璃态设计 + 霓虹光效 + 粒子动画
- 📝 **IP记录**：自动记录留言者IP（仅管理员可见）
- 💾 **数据持久化**：SQLite数据库，数据永久保存
- 🚀 **GitHub Actions**：自动部署，6小时运行周期

## 🛠️ 技术栈

- **后端**: Node.js + Express + SQLite3
- **前端**: 原生HTML/CSS/JS
- **安全**: express-session, helmet, rate-limit
- **部署**: GitHub Actions + bore + Docker

## 📦 部署方式

### 方式一：GitHub Actions自动部署（推荐）

1. **Fork本项目到您的GitHub仓库**

2. **设置Secrets**（仓库 Settings → Secrets and variables → Actions）：
   ```bash
   ADMIN_PASSWORD=your_secure_password_here
