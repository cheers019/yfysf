window.defaultMusicCoverUrl = 'https://files.catbox.moe/kyj3ip.jpg';
window.musicCoverPlaceholders = new Set([
    'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png',
    'https://s3plus.meituan.net/opapisdk/op_ticket_885190757_1757748720126_qdqqd_1jt5sv.jpeg',
    'https://i.postimg.cc/nzP9sgxr/chan-125.png'
]);
// ===============================================================
// 纯工具函数库
// ===============================================================

/**
 * 图片压缩函数
 * @param {File} file - 要压缩的图片文件
 * @param {Object} options - 压缩选项
 * @param {number} options.quality - 压缩质量 (0-1)
 * @param {number} options.maxWidth - 最大宽度
 * @param {number} options.maxHeight - 最大高度
 * @returns {Promise<string>} - 压缩后的 base64 数据URL
 */
async function compressImage(file, options = {}) {
    const {
        quality = 0.8, maxWidth = 800, maxHeight = 800
    } = options;

    // --- 新增：处理GIF动图 ---
    // 如果文件是GIF，则不经过canvas压缩，直接返回原始文件数据以保留动画
    if (file.type === 'image/gif') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // --- 对其他静态图片（如PNG, JPG）进行压缩 ---
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onerror = reject;
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onerror = reject;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // 对于有透明背景的PNG图片，先填充一个白色背景
                // 这样可以防止透明区域在转换成JPEG时变黑
                if (file.type === 'image/png') {
                    ctx.fillStyle = '#FFFFFF'; // 白色背景
                    ctx.fillRect(0, 0, width, height);
                }

                ctx.drawImage(img, 0, 0, width, height);

                // --- 关键修正：将输出格式改为 'image/jpeg' ---
                // JPEG格式可以显著减小文件大小，避免浏览器处理超大Base64字符串时崩溃
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
        };
    });
}

/**
 * 随机取值函数（用于处理逗号分隔的字符串，随机返回其中一个值）
 * @param {string} str - 可能包含逗号的字符串
 * @returns {string} - 随机选择的值或原字符串
 */
function getRandomValue(str) {
    // 检查字符串是否包含逗号
    if (str.includes(',')) {
        // 用逗号分隔字符串并移除多余空格
        const arr = str.split(',').map(item => item.trim());
        // 生成随机索引 (0 到 arr.length-1)
        const randomIndex = Math.floor(Math.random() * arr.length);
        // 返回随机元素
        return arr[randomIndex];
    }
    // 没有逗号则直接返回原字符串
    return str;
}

/**
 * 数字补零函数（将数字转换为两位数字符串）
 * @param {number} num - 要补零的数字
 * @returns {string} - 补零后的字符串
 */
const pad = (num) => num.toString().padStart(2, '0');

/**
 * 文件大小格式化函数
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} - 格式化后的文件大小字符串
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * HTML转义函数（防止XSS注入）
 * @param {string} str - 要转义的字符串
 * @returns {string} - 转义后的字符串
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

// ===============================================================
// UI交互类函数
// ===============================================================

/**
 * 切换屏幕显示
 * @param {string} targetId - 目标屏幕的ID
 */
function switchScreen(targetId) {
    // 仅切换 active 类，避免直接改写 style.display 导致布局（flex）异常
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.toggle('active', s.id === targetId);
    });
    // 触发全局事件，通知其他模块屏幕已切换
    try {
        const ev = new CustomEvent('app:screenChanged', { detail: { targetId } });
        document.dispatchEvent(ev);
    } catch (e) {
        console.warn('dispatch app:screenChanged failed', e);
    }
    // 如果进入 moments-screen，渲染
    if (targetId === 'moments-screen' && typeof renderMoments === 'function') renderMoments();
}

/**
 * 显示提示框
 * @param {string} msg - 要显示的消息
 * @param {number} timeout - 超时时间（毫秒），默认2400
 */
function showToast(msg, timeout = 2400) {
    const t = document.querySelector('#toast-notification');
    if (t) {
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), timeout);
    } else {
        // fallback
        alert(msg);
    }
}

/**
 * 更新 Token 统计按钮的显示
 */
function updateTokenStatsButton() {
    const tokenStatsLabel = document.getElementById('token-stats-label');
    if (!tokenStatsLabel) return;
    
    try {
        // 固定显示为 "Token"
        tokenStatsLabel.textContent = 'Token';
    } catch (error) {
        console.error('更新 Token 统计按钮失败:', error);
        if (tokenStatsLabel) {
            tokenStatsLabel.textContent = 'Token';
        }
    }
}

/**
 * 创建上下文菜单
 * @param {Array} items - 菜单项数组 [{label, danger, action}]
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 */
function createContextMenu(items, x, y) {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    items.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        if (item.danger) menuItem.classList.add('danger');
        menuItem.textContent = item.label;
        menuItem.onclick = () => {
            item.action();
            removeContextMenu();
        };
        menu.appendChild(menuItem);
    });
    document.body.appendChild(menu);
    document.addEventListener('click', removeContextMenu, {once: true});
}

/**
 * 移除上下文菜单
 */
function removeContextMenu() {
    const menu = document.querySelector('.context-menu');
    if (menu) menu.remove();
}

const getTokenCalculatorDb = () => {
    if (window.db) return window.db;
    if (typeof db !== 'undefined') return db;
    return null;
};

function estimateTokenCount(text) {
    if (!text || typeof text !== 'string' || text.length === 0) {
        return 0;
    }
    return Math.ceil(text.length * 1.5);
};

function calculateCurrentContextTokens(chat, chatType) {
    if (!chat) {
        return { system: 0, worldInfo: 0, history: 0, stickers: 0, total: 0 };
    }

    let systemPrompt = '';
    if (chatType === 'private') {
        const character = chat;
        const currentTime = new Date().toLocaleString('zh-CN');
        const persona = character.persona || '';
        const myPersona = character.myPersona || '';
        const realName = character.realName || '';
        const myName = character.myName || '';
        systemPrompt = `你正在一个名为"404"的线上聊天软件中扮演一个角色。\n角色名是：${realName}。我的称呼是：${myName}。\n你的角色设定是：${persona}\n关于我的人设：${myPersona}\n当前时间：${currentTime}`;
        if (character.activeEffects && character.activeEffects.length > 0) {
            systemPrompt += `\n当前生效的特殊效果...`;
        }
        systemPrompt += `\n行为准则、消息格式规则、对话节奏等...`;
    } else {
        const group = chat;
        const groupName = group.name || '';
        const members = group.members || [];
        const memberInfo = members.map(m => `${m.groupNickname || m.realName}: ${m.persona || ''}`).join('\n');
        systemPrompt = `你正在一个名为"404"的群聊中。群名：${groupName}\n成员信息：\n${memberInfo}`;
    }

    const systemTokens = estimateTokenCount(systemPrompt);

    let worldInfoTokens = 0;
    const runtimeDb = getTokenCalculatorDb();
    if (chatType === 'private' && chat.worldBookIds && Array.isArray(chat.worldBookIds) && runtimeDb) {
        let lastUserMessage = null;
        if (chat.history && Array.isArray(chat.history)) {
            if (typeof chat.history.findLast === 'function') {
                lastUserMessage = chat.history.findLast(m => m.role === 'user');
            } else {
                for (let i = chat.history.length - 1; i >= 0; i--) {
                    if (chat.history[i].role === 'user') {
                        lastUserMessage = chat.history[i];
                        break;
                    }
                }
            }
        }
        const lastUserContent = lastUserMessage ? (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : '') : '';

        const triggeredWorldBooks = chat.worldBookIds
            .map(id => runtimeDb.worldBooks ? runtimeDb.worldBooks.find(wb => wb.id === id) : null)
            .filter(book => {
                if (!book) return false;
                if (book.alwaysActive) return true;
                if (!book.keywords || !lastUserContent) return false;
                const keywords = book.keywords.split(',').map(k => k.trim()).filter(Boolean);
                if (keywords.length === 0) return false;
                const contentToSearch = book.caseSensitive ? lastUserContent : lastUserContent.toLowerCase();
                return keywords.some(keyword => {
                    const keywordToSearch = book.caseSensitive ? keyword : keyword.toLowerCase();
                    return contentToSearch.includes(keywordToSearch);
                });
            });

        const worldBooksText = triggeredWorldBooks.map(wb => wb.content || '').join('\n');
        worldInfoTokens = estimateTokenCount(worldBooksText);
    }

    let historyTokens = 0;
    if (chat.history && Array.isArray(chat.history)) {
        const maxMemory = chat.maxMemory || 10;
        const historySlice = chat.history.slice(-maxMemory).filter(msg => msg.role !== 'system');
        historySlice.forEach(msg => {
            let content = '';
            if (typeof msg.content === 'string') {
                content = msg.content;
            } else if (Array.isArray(msg.content)) {
                const textParts = msg.content.filter(p => p.type === 'text').map(p => p.text || '').join('');
                content = textParts;
            } else if (msg.content) {
                content = JSON.stringify(msg.content);
            }
            historyTokens += estimateTokenCount(content);
        });
    }

    let stickersTokens = 0;
    if (chatType === 'private') {
        const character = chat;
        let availableStickers = [];
        if (runtimeDb && runtimeDb.myStickers && Array.isArray(runtimeDb.myStickers) && runtimeDb.myStickers.length > 0) {
            let allowedGroups = [];
            if (character.stickerGroups !== undefined && character.stickerGroups !== null) {
                if (typeof character.stickerGroups === 'string' && character.stickerGroups.trim() !== '') {
                    allowedGroups = character.stickerGroups.split(',').map(g => g.trim()).filter(Boolean);
                }
            }

            if (allowedGroups.length > 0) {
                availableStickers = runtimeDb.myStickers.filter(sticker => {
                    const stickerGroup = (sticker.group || '未分类').trim();
                    return allowedGroups.includes(stickerGroup);
                });
            }

            if (availableStickers.length > 0) {
                const stickerNames = availableStickers.map(s => s.name).join(', ');
                const stickersPrompt = `11. **发送表情包的规则**: 你拥有发送表情包的能力。这是一个可选功能，你可以根据对话氛围和内容，自行判断是否需要发送表情包来辅助表达，你不必在每次回复中都包含表情包。这是你的表情包库：[${stickerNames}]。当你想要发送表情包时，你的回复必须严格遵循格式：\`[${character.realName}发送的表情包：{表情包名称}]\`禁止编造表情包库里没有的表情包。\n`;
                stickersTokens = estimateTokenCount(stickersPrompt);
            }
        }
    }

    const totalTokens = systemTokens + worldInfoTokens + historyTokens + stickersTokens;

    return {
        system: systemTokens,
        worldInfo: worldInfoTokens,
        history: historyTokens,
        stickers: stickersTokens,
        total: totalTokens
    };
};

window.tokenCalculator = {
    calculate: calculateCurrentContextTokens,
    estimate: estimateTokenCount
};

