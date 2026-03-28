// 全局变量
let isAdmin = false;
let currentReplyMessageId = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    initParticleSystem();
    loadMessages();
    loadStats();
    checkAdminStatus();
    setupEventListeners();
    
    // 自动刷新留言（每30秒）
    setInterval(() => {
        loadMessages();
        loadStats();
    }, 30000);
});

// 粒子系统
function initParticleSystem() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    
    let particles = [];
    let animationId = null;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    function createParticles() {
        const particleCount = 100;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                color: `hsl(${Math.random() * 60 + 180}, 100%, 50%)`
            });
        }
    }
    
    function drawParticles() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
            
            // 更新位置
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // 边界检查
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;
        });
        
        animationId = requestAnimationFrame(drawParticles);
    }
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        particles = [];
        createParticles();
    });
    
    resizeCanvas();
    createParticles();
    drawParticles();
}

// 设置事件监听
function setupEventListeners() {
    // 留言表单提交
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', handleSubmitMessage);
    }
    
    // 管理员登录
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', handleAdminLogin);
    }
    
    // 管理员登出
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleAdminLogout);
    }
    
    // 字符计数
    const contentInput = document.getElementById('contentInput');
    if (contentInput) {
        contentInput.addEventListener('input', updateCharCount);
    }
    
    // 匿名复选框联动
    const nameInput = document.getElementById('nameInput');
    const anonymousCheckbox = document.getElementById('anonymousCheckbox');
    if (anonymousCheckbox) {
        anonymousCheckbox.addEventListener('change', (e) => {
            if (nameInput) {
                nameInput.disabled = e.target.checked;
                if (e.target.checked) {
                    nameInput.value = '';
                }
            }
        });
    }
}

// 更新字符计数
function updateCharCount() {
    const contentInput = document.getElementById('contentInput');
    const charCount = document.getElementById('charCount');
    if (contentInput && charCount) {
        charCount.textContent = contentInput.value.length;
    }
}

// 提交留言
async function handleSubmitMessage(e) {
    e.preventDefault();
    
    const contentInput = document.getElementById('contentInput');
    const nameInput = document.getElementById('nameInput');
    const anonymousCheckbox = document.getElementById('anonymousCheckbox');
    
    const content = contentInput.value.trim();
    if (!content) {
        showToast('请填写留言内容', 'error');
        return;
    }
    
    const data = {
        content: content,
        name: nameInput.value.trim(),
        isAnonymous: anonymousCheckbox.checked
    };
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('留言发布成功！', 'success');
            contentInput.value = '';
            nameInput.value = '';
            anonymousCheckbox.checked = false;
            nameInput.disabled = false;
            updateCharCount();
            loadMessages();
            loadStats();
        } else {
            showToast(result.error || '发布失败', 'error');
        }
    } catch (error) {
        console.error('提交留言失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 加载留言列表
async function loadMessages() {
    try {
        const response = await fetch('/api/messages');
        const result = await response.json();
        
        if (result.success) {
            renderMessages(result.data);
        } else {
            showToast('加载留言失败', 'error');
        }
    } catch (error) {
        console.error('加载留言失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 渲染留言
function renderMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    
    if (!messagesList) return;
    
    if (!messages || messages.length === 0) {
        messagesList.innerHTML = '<div class="loading">暂无留言，来做第一个幻想者吧 ✨</div>';
        return;
    }
    
    messagesList.innerHTML = messages.map(message => `
        <div class="message-card" data-id="${message.id}">
            <div class="message-header">
                <div class="message-name">
                    ${message.isAnonymous ? '🔒 匿名用户' : `👤 ${escapeHtml(message.name)}`}
                    ${message.isAnonymous ? '<span class="anonymous-icon">(匿名)</span>' : ''}
                </div>
                <div class="message-time">${formatTime(message.createdAt)}</div>
            </div>
            <div class="message-content">${escapeHtml(message.content)}</div>
            ${message.reply ? `
                <div class="message-reply">
                    <div class="reply-label">✨ 管理员回复</div>
                    <div class="reply-content">${escapeHtml(message.reply)}</div>
                    <div class="reply-time">${formatTime(message.replyAt)}</div>
                </div>
            ` : ''}
            ${isAdmin ? `
                <div class="message-actions">
                    ${!message.reply ? `
                        <button class="reply-btn" onclick="showReplyForm(${message.id})">回复</button>
                    ` : ''}
                    <button class="delete-btn" onclick="deleteMessage(${message.id})">删除</button>
                </div>
                <div id="reply-form-${message.id}" class="reply-form" style="display: none;">
                    <textarea class="reply-input" placeholder="输入回复内容..." rows="2"></textarea>
                    <button class="reply-submit" onclick="submitReply(${message.id})">提交回复</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 显示回复表单
function showReplyForm(messageId) {
    const form = document.getElementById(`reply-form-${messageId}`);
    if (form) {
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    }
}

// 提交回复
async function submitReply(messageId) {
    const form = document.getElementById(`reply-form-${messageId}`);
    const textarea = form.querySelector('.reply-input');
    const reply = textarea.value.trim();
    
    if (!reply) {
        showToast('请填写回复内容', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/reply/${messageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reply })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('回复成功！', 'success');
            loadMessages();
        } else {
            showToast(result.error || '回复失败', 'error');
        }
    } catch (error) {
        console.error('回复失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 删除留言
async function deleteMessage(messageId) {
    if (!confirm('确定要删除这条留言吗？')) return;
    
    try {
        const response = await fetch(`/api/admin/message/${messageId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('删除成功', 'success');
            loadMessages();
            loadStats();
        } else {
            showToast(result.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 加载统计数据
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalMessages').textContent = result.data.totalMessages || 0;
            document.getElementById('repliedCount').textContent = result.data.repliedCount || 0;
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

// 检查管理员状态
async function checkAdminStatus() {
    try {
        const response = await fetch('/api/admin/check');
        const result = await response.json();
        
        isAdmin = result.isAdmin;
        
        const adminLoginForm = document.getElementById('adminLoginForm');
        const adminPanel = document.getElementById('adminPanel');
        
        if (isAdmin) {
            if (adminLoginForm) adminLoginForm.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'block';
        } else {
            if (adminLoginForm) adminLoginForm.style.display = 'block';
            if (adminPanel) adminPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('检查管理员状态失败:', error);
    }
}

// 管理员登录
async function handleAdminLogin() {
    const passwordInput = document.getElementById('adminPassword');
    const password = passwordInput.value;
    
    if (!password) {
        showToast('请输入密码', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('登录成功', 'success');
            isAdmin = true;
            await checkAdminStatus();
            loadMessages(); // 重新加载以显示管理按钮
        } else {
            showToast(result.error || '登录失败', 'error');
        }
    } catch (error) {
        console.error('登录失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 管理员登出
async function handleAdminLogout() {
    try {
        const response = await fetch('/api/admin/logout', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('已登出', 'success');
            isAdmin = false;
            await checkAdminStatus();
            loadMessages(); // 重新加载以隐藏管理按钮
        }
    } catch (error) {
        console.error('登出失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 工具函数：显示提示
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 工具函数：转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 工具函数：格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
