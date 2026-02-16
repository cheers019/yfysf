    const URLBlacklist = []

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.db) {
            console.error("数据库未就绪！");
        } else {
            console.log("成功关联全局数据库");
        }

        // --- Initial HTML Injection ---
        // (请找到文件中的旧 'api-settings-screen'.innerHTML 代码，并用下面的代码完整替换它)



// START: 修正动态生成屏幕的返回按钮 (完整替换)
// ▼▼▼ 第一步：请复制这段代码，完整替换原来的 api-settings-screen.innerHTML 赋值部分 ▼▼▼


document.getElementById('wallpaper-screen').innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-container">‹</button><div class="title-container"><h1 class="title">更换壁纸</h1></div><div class="placeholder"></div></header><main class="content"><div class="wallpaper-preview" id="wallpaper-preview"><span>当前壁纸预览</span></div><input type="file" id="wallpaper-upload" accept="image/*" style="display: none;"><label for="wallpaper-upload" class="btn btn-primary">从相册选择新壁纸</label></main>`;
// --- 新代码开始 ---
document.getElementById('font-settings-screen').innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-container">‹</button><div class="title-container"><h1 class="title">字体设置</h1></div><div class="placeholder"></div></header><main class="content">
    
    <div id="font-presets-control" style="margin:15px 0; padding:15px; border-radius:12px; border:1px solid #fce4ec; background:#fff8fa;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
        <label style="color:var(--secondary-color); font-weight:600;">字体预设</label>
        <select id="font-preset-select" style="flex:1; padding:8px; border-radius:8px; border:1px solid #fce4ec;"></select>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="font-apply-preset" class="btn btn-primary btn-small">应用</button>
        <button id="font-save-preset" class="btn btn-secondary btn-small">另存</button>
        <button id="font-manage-presets" class="btn btn-neutral btn-small">管理</button>
      </div>
    </div>
    <form id="font-settings-form">
        <div class="form-group">
            <label for="font-url">字体链接 (ttf, woff, woff2)</label>
            <input type="url" id="font-url" placeholder="https://.../font.ttf" required>
        </div>
        <p style="font-size:12px; color:#888; text-align:center;">示例: https://lf3-static.bytednsdoc.com/obj/eden-cn/jplptk/ljhwZthlaukjlkulzlp/portal/fonts/HarmonyOS_Sans_SC_Regular.woff2</p>
        <button type="submit" class="btn btn-primary">应用字体</button>
        <button type="button" class="btn btn-neutral" id="restore-default-font-btn" style="margin-top: 15px;">恢复默认字体</button>
    </form>
</main>`;
// --- 新代码结束 ---
document.getElementById('customize-screen').innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-container">‹</button><div class="title-container"><h1 class="title">主屏幕自定义</h1></div><div class="placeholder"></div></header><main class="content"><form id="customize-form"></form></main>`;
document.getElementById('tutorial-screen').innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-container">‹</button><div class="title-container"><h1 class="title">教程</h1></div><div class="placeholder"></div></header><main class="content" id="tutorial-content-area"></main>`;
// END: 修正动态生成屏幕的返回按钮
        
        // --- Global Variables and Constants ---
        const colorThemes = window.colorThemes || {};
        // 已搬迁至 database.js
window.currentChatId = null;
        let currentQuotedMessageId = null, currentChatType = null, isGenerating = false, longPressTimer = null;
        let myTopName = localStorage.getItem('myTopName') || '我';
        let myTopAvatar = localStorage.getItem('myTopAvatar') || null;
        window.appState = window.appState || {
            currentChatId: null,
            currentChatType: null,
            myTopName: null,
            myTopAvatar: null,
            db: window.db || null,
            currentHistory: []
        };
        function syncAppState() {
            if (!window.appState) return;
            window.appState.currentChatId = currentChatId;
            window.appState.currentChatType = currentChatType;
            window.appState.myTopName = myTopName;
            window.appState.myTopAvatar = myTopAvatar;
            window.appState.db = window.db;
            if (window.db && currentChatId && currentChatType) {
                if (currentChatType === 'private' && Array.isArray(window.db.characters)) {
                    const chat = window.db.characters.find(c => c.id === currentChatId);
                    window.appState.currentHistory = chat && Array.isArray(chat.history) ? chat.history : [];
                } else if (currentChatType === 'group' && Array.isArray(window.db.groups)) {
                    const chat = window.db.groups.find(g => g.id === currentChatId);
                    window.appState.currentHistory = chat && Array.isArray(chat.history) ? chat.history : [];
                } else {
                    window.appState.currentHistory = [];
                }
            } else {
                window.appState.currentHistory = [];
            }
            console.log("[AppState] 数据已同步:", window.appState);
        }
        window.syncAppState = syncAppState;
        Object.defineProperty(window, 'currentChatType', {
            get: () => currentChatType,
            set: value => {
                currentChatType = value;
                window.syncAppState();
            }
        });
        window.syncAppState();
        let isSending = false; // 🆕 防止重复发送用户消息的锁
        inputElement = null;
        let isInScreenshotMode = false;
let selectedMessagesForScreenshot = new Set();
let notificationQueue = [];
let isNotificationShowing = false;
            isInMultiSelectMode = false, editingMessageId = null;
        window.currentTransferMessageId = null;
        let currentEditingWorldBookId = null;
        window.currentGroupAction = {type: null, recipients: []};
        let currentGroupAction = window.currentGroupAction;
// ▲▲▲ 添加结束 ▲▲▲
        let selectedMessageIds = new Set();
        const MESSAGES_PER_PAGE = 50;
        window.chatUiCoreState = window.chatUiCoreState || {};
        window.chatUiCoreState.currentPage = 1;
        window.chatUiCoreState.messagesPerPage = MESSAGES_PER_PAGE;

        // --- DOM Element Cache ---
        const screens = document.querySelectorAll('.screen'),
            toastElement = document.getElementById('toast-notification'),
            homeScreen = document.getElementById('home-screen'),
            chatListContainer = document.getElementById('chat-list-container'),
            noChatsPlaceholder = document.getElementById('no-chats-placeholder'),
            addChatBtn = document.getElementById('add-chat-btn'),
            addCharModal = document.getElementById('add-char-modal'),
            addCharForm = document.getElementById('add-char-form'),
            chatRoomScreen = document.getElementById('chat-room-screen'),
            chatRoomHeaderDefault = document.getElementById('chat-room-header-default'),
            chatRoomHeaderSelect = document.getElementById('chat-room-header-select'),
            cancelMultiSelectBtn = document.getElementById('cancel-multi-select-btn'),
            multiSelectTitle = document.getElementById('multi-select-title'),
            chatRoomTitle = document.getElementById('chat-room-title'),
            chatRoomStatusText = document.getElementById('chat-room-status-text'),
            messageArea = document.getElementById('message-area'),
            messageInputDefault = document.getElementById('message-input-default'),
            messageInput = document.getElementById('message-input'),
            sendMessageBtn = document.getElementById('send-message-btn'),
            getReplyBtn = document.getElementById('get-reply-btn'),
            typingIndicator = document.getElementById('typing-indicator'),
            chatSettingsBtn = document.getElementById('chat-settings-btn'),
            settingsSidebar = document.getElementById('chat-settings-sidebar'),
            settingsForm = document.getElementById('chat-settings-form'),
            messageEditBar = document.getElementById('message-edit-bar'),
            messageEditInput = document.getElementById('message-edit-input'),
            saveEditBtn = document.getElementById('save-edit-btn'),
            cancelEditBtn = document.getElementById('cancel-edit-btn'),
            multiSelectBar = document.getElementById('multi-select-bar'),
            selectCount = document.getElementById('select-count'),
            deleteSelectedBtn = document.getElementById('delete-selected-btn');
            const searchResultsScreen = document.getElementById('search-results-screen'),
            searchResultsList = document.getElementById('search-results-list'),
            noResultsPlaceholder = document.getElementById('no-search-results-placeholder'),
            // ▼▼▼ 新增以下变量 ▼▼▼
            searchModal = document.getElementById('search-modal'),
            searchModalForm = document.getElementById('search-modal-form'),
            searchModalInput = document.getElementById('search-modal-input');
        const walletBtn = document.getElementById('wallet-btn');
        const giftBtn = document.getElementById('gift-btn');
        const clearChatHistoryBtn = document.getElementById('clear-chat-history-btn');
        const fontSettingsForm = document.getElementById('font-settings-form'),
            fontUrlInput = document.getElementById('font-url'),
            restoreDefaultFontBtn = document.getElementById('restore-default-font-btn');
        const createGroupBtn = document.getElementById('create-group-btn'),
            createGroupModal = document.getElementById('create-group-modal'),
            createGroupForm = document.getElementById('create-group-form'),
            memberSelectionList = document.getElementById('member-selection-list'),
            groupNameInput = document.getElementById('group-name-input'),
            groupSettingsSidebar = document.getElementById('group-settings-sidebar'),
            groupSettingsForm = document.getElementById('group-settings-form'),
            groupMembersListContainer = document.getElementById('group-members-list-container'),
            editGroupMemberModal = document.getElementById('edit-group-member-modal'),
            editGroupMemberForm = document.getElementById('edit-group-member-form');
        const addMemberActionSheet = document.getElementById('add-member-actionsheet'),
            inviteExistingMemberBtn = document.getElementById('invite-existing-member-btn'),
            createNewMemberBtn = document.getElementById('create-new-member-btn'),
            inviteMemberModal = document.getElementById('invite-member-modal'),
            inviteMemberSelectionList = document.getElementById('invite-member-selection-list'),
            confirmInviteBtn = document.getElementById('confirm-invite-btn'),
            createMemberForGroupModal = document.getElementById('create-member-for-group-modal'),
            createMemberForGroupForm = document.getElementById('create-member-for-group-form');
        const customizeForm = document.getElementById('customize-form'),
            tutorialContentArea = document.getElementById('tutorial-content-area');


        const switchScreen = (targetId) => {
            screens.forEach(screen => screen.classList.remove('active'));
            document.getElementById(targetId)?.classList.add('active');
            // Close all overlays and sidebars
            const overlays = document.querySelectorAll('.modal-overlay, .action-sheet-overlay, .settings-sidebar');
            overlays.forEach(o => o.classList.remove('visible', 'open'));
        };
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

        function removeContextMenu() {
            const menu = document.querySelector('.context-menu');
            if (menu) menu.remove();
        }
        const updateCustomBubbleStyle = window.updateCustomBubbleStyle || function(){};

        const updateBubbleCssPreview = window.updateBubbleCssPreview || function(){};
// END: 批量添加表情包功能
// ===============================================================
// END: 钱包功能核心代码
// ===============================================================

// ===============================================================
// END: 新增头像框功能核心代码
// ===============================================================
// --- 新增：用于控制“正在输入”提示的辅助函数 ---

/**
 * 在聊天顶部显示“对方正在输入中...”的状态
 */
function showTypingIndicator() {
    const subtitle = document.getElementById('chat-room-subtitle');
    const statusTextElement = document.getElementById('chat-room-status-text');

    if (subtitle && statusTextElement && currentChatType === 'private') {
        // 隐藏绿色的在线圆点
        subtitle.querySelector('.online-indicator').style.display = 'none';
        // 修改状态文字
        statusTextElement.textContent = '对方正在输入中...';
        // 添加动画效果Class
        statusTextElement.classList.add('typing-status');
    }
    // 旧的底部提示已不再使用，但为确保安全，再次将其隐藏
    document.getElementById('typing-indicator').style.display = 'none';
}

/**
 * 隐藏“正在输入”的状态，并恢复角色的在线状态
 */
function hideTypingIndicator() {
    // 仅在私聊中执行
    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : null;
    if (chat) {
        const subtitle = document.getElementById('chat-room-subtitle');
        const statusTextElement = document.getElementById('chat-room-status-text');

        if (subtitle && statusTextElement) { 
            // 恢复显示绿点
            subtitle.querySelector('.online-indicator').style.display = 'block';
            // 恢复角色的在线状态
            statusTextElement.textContent = chat.status || '在线';
            // 移除动画Class
            statusTextElement.classList.remove('typing-status');
        }
    }
}
// ▲▲▲ 新函数到此结束 ▲▲▲
        const init = async () => {
        	// 在 init 函数的最顶部添加
if (!db.userDiaries) {
    db.userDiaries = [];
}
  await loadData();
  
  // 🆕 执行数据迁移（表情包分组功能）
  await migrateStickersToGroupVersion();
  await migrateCharacterStickerBindings();
            
            window.SystemAppearance.init();
            if (window.ChatStyling && typeof window.ChatStyling.init === 'function') {
                window.ChatStyling.init();
            }
            window.db = db;
            window.syncAppState();
            document.body.addEventListener('click', (e) => {
                if (e.target.closest('.context-menu')) {
                    e.stopPropagation();
                    return;
                }
                removeContextMenu();

                const backBtn = e.target.closest('.back-btn');
                if (backBtn) {
                    e.preventDefault();
                    switchScreen(backBtn.getAttribute('data-target'));
                }

                // Consolidated overlay closing logic
                const openOverlay = document.querySelector('.modal-overlay.visible, .action-sheet-overlay.visible');
                if (openOverlay && e.target === openOverlay) {
                    openOverlay.classList.remove('visible');
                }
            });

            // Specific nav links that switch screens
            document.body.addEventListener('click', e => {
                const navLink = e.target.closest('.app-icon[data-target]');
                if (navLink) {
                    e.preventDefault();
                    switchScreen(navLink.getAttribute('data-target'));
                }
            });
// --- 一次性将用户日记数据迁移到全局 ---
if (db.characters.some(c => c.userDiaries && c.userDiaries.length > 0)) {
    if (!db.userDiaries) db.userDiaries = [];
    const allUserDiaries = [];
    db.characters.forEach(char => {
        if (char.userDiaries && char.userDiaries.length > 0) {
            allUserDiaries.push(...char.userDiaries);
            delete char.userDiaries; // 从角色对象中删除
        }
    });
    // 去重并合并到全局
    const uniqueDiaries = [...new Map(allUserDiaries.map(item => [item.id, item])).values()];
    db.userDiaries.push(...uniqueDiaries);
    console.log('用户日记数据已成功迁移到全局。');
    saveData(); // 保存迁移后的结果
}
            
            setupChatListScreen();
            setupAddCharModal();
            setupChatRoom();
            setupChatSettings();
            setupApiSettingsApp();
            setupStickerSystem();
            
            // Phase 1: Initialize TB_Finance
            if (window.TB_Finance && typeof window.TB_Finance.init === 'function') {
                window.TB_Finance.init();
            }

            setupWorldBookApp();
            setupGroupChatSystem();
            setupFileDisplaySystem(); 
            window.TB_Call.setupVoiceCallSystem();
    if (window.TB_Diary) {
        TB_Diary.init();
    } // --- 在这里添加这一行 ---
            setupMusicPlayer();
            setupNotificationSystem();
            if (window.dynamicsHandler && typeof window.dynamicsHandler.setupListeners === 'function') {
                window.dynamicsHandler.setupListeners();
            }
setupTrajectoryAndHeartSoundSystem();
  setupWalletApp(); // <-- 添加这一行
  // (在 init() 函数的末尾添加)
setupBlockFeature(); 
setInterval(checkTimedUnblocks, 60000); // 每分钟检查一次到期的AI拉黑
setupProactiveAiSystem();
 setupViewRecalledModal(); 
 // 在 init() 函数的末尾添加
setupBatchStickerUpload();
setupMallApp();
setupPaymentHistoryActions();
setupAiSpaceApps(); // 初始化AI空间所有App
window.SoulBondManager.setup();
if (window.soulBondMissYou && typeof window.soulBondMissYou.init === 'function') {
    window.soulBondMissYou.init();
}
setupSearchInChat();

};




// ===============================================================
// START: 角色卡导入功能 (粘贴到 setupChatListScreen 函数上方)
// ===============================================================
/**
         * 在当前聊天记录中执行搜索
         * @param {string} query - 搜索关键词
         */
        async function performSearch(query) {
            showToast('正在搜索...');
            const results = [];
            const lowerCaseQuery = query.toLowerCase();
            
            // 直接获取当前聊天对象
            const chat = (currentChatType === 'private') 
                ? db.characters.find(c => c.id === currentChatId)
                : db.groups.find(g => g.id === currentChatId);

            if (!chat) {
                showToast('错误：找不到当前聊天');
                return;
            }

            const history = await dataStorage.getChatMessages(chat.id, currentChatType);
            
            for (const message of history) {
                let contentToSearch = message.content || '';
                // 剥离消息外壳，只搜索纯文本内容
                const contentMatch = contentToSearch.match(/\[.*?的消息：([\s\S]+?)\]/);
                if (contentMatch) {
                    contentToSearch = contentMatch[1];
                }
                
                if (contentToSearch.toLowerCase().includes(lowerCaseQuery)) {
                    results.push({
                        message,
                        chatId: chat.id,
                        chatType: currentChatType,
                        chatName: chat.name || chat.remarkName,
                        chatAvatar: chat.avatar
                    });
                }
            }
            
            renderSearchResults(results, query);
            switchScreen('search-results-screen');
        }
/**
 * 处理从文件输入框选择的角色卡文件
 * @param {Event} event - 文件输入框的 change 事件
 */
function handleCardImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.png')) {
        handlePngImport(file);
    } else if (file.name.endsWith('.json')) {
        handleJsonImport(file);
    } else {
        showToast('不支持的文件格式，请选择 .png 或 .json 文件');
    }

    // 清空输入框，以便下次可以选择相同的文件
    event.target.value = null;
}

/**
 * 处理 .json 格式的角色卡
 * @param {File} file - 用户选择的 .json 文件
 */
function handleJsonImport(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const cardData = JSON.parse(e.target.result);
            // JSON 文件没有内嵌图片，使用默认头像
            const defaultAvatar = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
            createCharacterFromCard(cardData, defaultAvatar);
        } catch (error) {
            console.error("JSON 解析失败:", error);
            showToast(`导入失败: ${error.message}`);
        }
    };
    reader.readAsText(file);
}

/**
 * 处理 .png 格式的角色卡 (包含图片和内置数据) - 已修正乱码问题
 * @param {File} file - 用户选择的 .png 文件
 */
function handlePngImport(file) {
    // 第一步：读取图片本身作为头像
    const imageReader = new FileReader();
    imageReader.readAsDataURL(file);
    imageReader.onload = (e) => {
        const avatarUrl = e.target.result;

        // 第二步：读取文件内容以提取内置的JSON数据
        const dataReader = new FileReader();
        dataReader.onload = (e) => {
            try {
                const text = e.target.result;
                // SillyTavern 将 Base64 编码的 JSON 存储在 "chara" 关键词之后
                const keyword = "chara";
                const startIndex = text.indexOf(keyword);

                if (startIndex === -1) {
                    throw new Error("PNG卡片中未找到 'chara' 数据块。");
                }

                // 提取可能是 Base64 的长字符串
                const b64Regex = /[A-Za-z0-9+/=]{200,}/g; // 查找足够长的Base64字符串
                const textAfterKeyword = text.substring(startIndex + keyword.length);
                const match = textAfterKeyword.match(b64Regex);

                if (!match) {
                    throw new Error("无法从PNG中提取角色数据。");
                }

                // ▼▼▼ 核心修正：使用 TextDecoder 处理 UTF-8 编码 ▼▼▼
                const b64Decoded = atob(match[0]); // Base64解码为二进制字符串
                // 将二进制字符串转换为Uint8Array字节数组
                const uint8Array = new Uint8Array(b64Decoded.length).map((_, i) => b64Decoded.charCodeAt(i));
                // 使用UTF-8解码器将字节数组转换为正确的字符串
                const utf8String = new TextDecoder('utf-8').decode(uint8Array);
                const cardData = JSON.parse(utf8String);
                // ▲▲▲ 修正结束 ▲▲▲

                createCharacterFromCard(cardData, avatarUrl);
            } catch (error) {
                console.error("PNG 数据提取或解析失败:", error);
                showToast(`导入失败: ${error.message}`);
            }
        };
        // 注意：这里仍然使用 'latin1' 来读取原始字节流，这是正确的
        dataReader.readAsText(file, 'latin1');
    };
}
/**
 * 根据解析出的角色卡数据和头像URL，创建新角色和世界书（已更新分类和条目拆分逻辑）
 * @param {object} cardData - 从 .json 或 .png 中解析出的角色数据对象
 * @param {string} avatarUrl - 角色的头像 Data URL 或默认 URL
 */
async function createCharacterFromCard(cardData, avatarUrl) {
    // 兼容不同版本的角色卡格式 (v2/v3)
    const data = cardData.data || cardData;
    if (!data || !data.name) {
        showToast('导入失败：角色卡格式不正确，缺少名称。');
        return;
    }

    // 用于收集所有新创建的世界书条目ID，以便关联到角色
    const worldBookIds = [];

    // ▼▼▼ 核心修改逻辑开始 ▼▼▼
    if (data.character_book && data.character_book.entries && data.character_book.entries.length > 0) {
        
        // 1. 为该角色创建一个新的世界书分类
        const categoryName = `${data.name} - 世界书`;
        const newCategory = {
            id: `cat_${Date.now()}`,
            name: categoryName,
            isCollapsed: false // 默认展开
        };
        db.worldBookCategories.push(newCategory);
        showToast(`已自动创建分类: "${categoryName}"`);

        let entryCounter = 1; // 用于命名拆分后的条目

        // 2. 遍历所有世界书条目
        for (const entry of data.character_book.entries) {
            if (!entry.content) continue;

            // 3. 使用 "---" 分割内容，并清理空数据
            const contentParts = entry.content.split('---')
                .map(part => part.trim()) // 去除每个部分前后的空格
                .filter(part => part.length > 0); // 过滤掉空的部分

            // 4. 为每个分割后的内容部分创建独立的世界书条目
            for (const partContent of contentParts) {
                const newWorldBook = {
                    id: `wb_${Date.now()}_${entryCounter}`,
                    name: `${data.name} - 条目 ${entryCounter}`, // 自动命名
                    content: partContent,
                    position: 'before', // 默认前置注入
                    categoryId: newCategory.id // 关联到新创建的分类
                };
                db.worldBooks.push(newWorldBook);
                worldBookIds.push(newWorldBook.id); // 收集ID用于角色关联
                entryCounter++;
            }
        }
    }
    // ▲▲▲ 核心修改逻辑结束 ▲▲▲

    // 创建新角色对象
    const newChar = {
        id: `char_${Date.now()}`,
        realName: data.name,
        isOfflineMode: false,
        remarkName: data.name,
        persona: data.description || '',
        avatar: avatarUrl,
        myName: '我',
        myPersona: '',
        myAvatar: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg',
        theme: 'white_pink',
        maxMemory: 10,
        chatBg: '',
        history: [],
        diaries: [],
        messageCountSinceLastDiary: 0,
        isPinned: false,
        status: '在线',
        worldBookIds: worldBookIds, // 关联所有新创建的世界书条目ID
        useCustomBubbleCss: false,
        customBubbleCss: '',
        pendingMessages: [],
        aiProactiveChatEnabled: false, // 新增
    aiProactiveChatDelay: 0,      // 新增
        isBlockedByUser: false,
        isBlockedByAi: false,
        userBlockTimestamp: null,
        aiBlockTimestamp: null,
        blockEndTime: null,
    };
    // 添加到数据库并保存
    db.characters.push(newChar);
    await saveData();

    // 刷新UI
    renderChatList();
    showToast(`角色“${newChar.remarkName}”已成功导入！`);
}

/**
         * 设置聊天内搜索功能
         */
        function setupSearchInChat() {
            // 使用事件委托，因为两个设置面板里都有搜索按钮
            document.body.addEventListener('click', (e) => {
                if (e.target.id === 'search-history-btn' || e.target.id === 'search-group-history-btn') {
                    // 关闭设置侧边栏
                    const openSidebar = document.querySelector('.settings-sidebar.open');
                    if (openSidebar) {
                        openSidebar.classList.remove('open');
                    }
                    searchModal.classList.add('visible');
                    searchModalInput.focus();
                }
            });

            // 搜索表单提交
            searchModalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = searchModalInput.value.trim();
                if (query) {
                    performSearch(query);
                    searchModal.classList.remove('visible');
                    searchModalForm.reset();
                }
            });

            // 点击弹窗外部关闭
            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) {
                    searchModal.classList.remove('visible');
                }
            });

            // 为搜索结果列表添加点击事件委托
            searchResultsList.addEventListener('click', (e) => {
                const resultItem = e.target.closest('.search-result-item');
                if (resultItem) {
                    const { chatId, chatType, messageId } = resultItem.dataset;
                    // 设置一个全局变量，用于告知 openChatRoom 需要跳转
                    window.targetMessageId = messageId; 
                    openChatRoom(chatId, chatType);
                }
            });
        }

        // --- Chat List & Chat Room ---
        function setupChatListScreen() {
            renderChatList();
            addChatBtn.addEventListener('click', () => {
                addCharModal.classList.add('visible');
                addCharForm.reset();
            });
            chatListContainer.addEventListener('click', (e) => {
                const chatItem = e.target.closest('.chat-item');
                if (chatItem) {
                    currentChatId = chatItem.dataset.id;
                    currentChatType = chatItem.dataset.type;
                    window.syncAppState();
                    openChatRoom(currentChatId, currentChatType);
                }
            });
            chatListContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const chatItem = e.target.closest('.chat-item');
                if (!chatItem) return;
                handleChatListLongPress(chatItem.dataset.id, chatItem.dataset.type, e.clientX, e.clientY);
            });
            chatListContainer.addEventListener('touchstart', (e) => {
                const chatItem = e.target.closest('.chat-item');
                if (!chatItem) return;
                longPressTimer = setTimeout(() => {
                    const touch = e.touches[0];
                    handleChatListLongPress(chatItem.dataset.id, chatItem.dataset.type, touch.clientX, touch.clientY);
                }, 400);
            });
            chatListContainer.addEventListener('touchend', () => clearTimeout(longPressTimer));
            chatListContainer.addEventListener('touchmove', () => clearTimeout(longPressTimer));
        }
/**
         * 在当前聊天记录中执行搜索
         * @param {string} query - 搜索关键词
         */
        async function performSearch(query) {
            showToast('正在搜索...');
            const results = [];
            const lowerCaseQuery = query.toLowerCase();
            
            // 直接获取当前聊天对象
            const chat = (currentChatType === 'private') 
                ? db.characters.find(c => c.id === currentChatId)
                : db.groups.find(g => g.id === currentChatId);

            if (!chat) {
                showToast('错误：找不到当前聊天');
                return;
            }

            const history = await dataStorage.getChatMessages(chat.id, currentChatType);
            
            for (const message of history) {
                let contentToSearch = message.content || '';
                // 剥离消息外壳，只搜索纯文本内容
                const contentMatch = contentToSearch.match(/\[.*?的消息：([\s\S]+?)\]/);
                if (contentMatch) {
                    contentToSearch = contentMatch[1];
                }
                
                if (contentToSearch.toLowerCase().includes(lowerCaseQuery)) {
                    results.push({
                        message,
                        chatId: chat.id,
                        chatType: currentChatType,
                        chatName: chat.name || chat.remarkName,
                        chatAvatar: chat.avatar
                    });
                }
            }
            
            renderSearchResults(results, query);
            switchScreen('search-results-screen');
        }

        /**
         * 渲染搜索结果列表
         * @param {Array} results - 搜索到的结果数组
         * @param {string} query - 原始搜索关键词，用于高亮
         */
        function renderSearchResults(results, query) {
            searchResultsList.innerHTML = '';
            noResultsPlaceholder.style.display = results.length === 0 ? 'block' : 'none';

            // 按时间倒序排列结果
            results.sort((a, b) => b.message.timestamp - a.message.timestamp);

            const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

            for (const result of results) {
                const li = document.createElement('li');
                li.className = 'list-item search-result-item';
                li.dataset.chatId = result.chatId;
                li.dataset.chatType = result.chatType;
                li.dataset.messageId = result.message.id;

                let previewText = result.message.content || '';
                const match = previewText.match(/\[.*?的消息：([\s\S]+?)\]/);
                if (match) {
                    previewText = match[1];
                }

                // 高亮关键词
                const highlightedText = escapeHTML(previewText).replace(regex, (match) => `<span class="highlight">${match}</span>`);
                
                const date = new Date(result.message.timestamp);
                const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

                li.innerHTML = `
                    <img src="${result.chatAvatar}" alt="${result.chatName}" class="chat-avatar ${result.chatType === 'group' ? 'group-avatar' : ''}">
                    <div class="item-details">
                        <div class="item-details-row">
                            <span class="item-name">${result.chatName}</span>
                            <span class="item-preview">${dateString}</span>
                        </div>
                        <div class="item-preview search-preview">${highlightedText}</div>
                    </div>
                `;
                searchResultsList.appendChild(li);
            }
        }
        function handleChatListLongPress(chatId, chatType, x, y) {
            clearTimeout(longPressTimer);
            const chatItem = (chatType === 'private') ? db.characters.find(c => c.id === chatId) : db.groups.find(g => g.id === chatId);
            if (!chatItem) return;
            const itemName = chatType === 'private' ? chatItem.remarkName : chatItem.name;
            const menuItems = [{
                label: chatItem.isPinned ? '取消置顶' : '置顶聊天',
                action: async () => {
                    chatItem.isPinned = !chatItem.isPinned;
                    await saveData();
                    renderChatList();
                }
            }, {
                label: '删除聊天',
                danger: true,
                action: async () => {
                    if (confirm(`确定要删除与"${itemName}"的聊天记录吗？此操作不可恢复。`)) {
                        // 1. 从内存数组中移除
                        if (chatType === 'private') {
                            db.characters = db.characters.filter(c => c.id !== chatId);
                        } else {
                            db.groups = db.groups.filter(g => g.id !== chatId);
                        }
                        
                        // 2. 清除 IndexedDB 中的消息块（关键步骤！）
                        await dataStorage.clearChatMessages(chatId, chatType);
                        
                        // 3. 删除 IndexedDB 中的角色/群组基础数据
                        const dataKey = chatType === 'private' ? `character_${chatId}` : `group_${chatId}`;
                        await dataStorage.removeData(dataKey);
                        
                        // 4. 保存数据到本地存储
                        await saveData();
                        
                        // 5. 刷新列表
                        renderChatList();
                        showToast('聊天已删除');
                    }
                }
            }];
            createContextMenu(menuItems, x, y);
        }

        function renderChatList() {
            chatListContainer.innerHTML = '';
            const allChats = [...db.characters.map(c => ({...c, type: 'private'})), ...db.groups.map(g => ({
                ...g,
                type: 'group'
            }))];
            noChatsPlaceholder.style.display = (db.characters.length + db.groups.length) === 0 ? 'block' : 'none';
            const sortedChats = allChats.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                const lastMsgTimeA = a.history && a.history.length > 0 ? a.history[a.history.length - 1].timestamp : 0;
                const lastMsgTimeB = b.history && b.history.length > 0 ? b.history[b.history.length - 1].timestamp : 0;
                return lastMsgTimeB - lastMsgTimeA;
            });
            sortedChats.forEach(chat => {
                let lastMessageText = '开始聊天吧...';
                if (chat.history && chat.history.length > 0) {
                const visibleHistory = chat.history.filter(msg => {
                        const content = msg.content || '';
                        if (content.includes('[system:') || content.includes('[system-context-only:')) return false;
                        if (content.includes('更新状态为')) return false;
                        if (content.includes('已接收礼物')) return false;
                        if (content.includes('的转账') && (content.includes('接收') || content.includes('退回'))) return false;
                        if (content.includes('邀请') && content.includes('加入了群聊')) return false;
                        if (content.includes('修改群名为')) return false;
                        if (content.includes('[system-display:')) return false;
                        return true;
                    });
                    if (visibleHistory.length > 0) {
                        const lastMsg = visibleHistory[visibleHistory.length - 1];
                        const content = lastMsg.content || '';
                        const hasImagePart = Array.isArray(lastMsg.parts) && lastMsg.parts.some(p => p.type === 'image');
                        const hasHtmlPart = Array.isArray(lastMsg.parts) && lastMsg.parts.some(p => p.type === 'html');
                        const lowerText = content.trim().toLowerCase();
                        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
                        const isImageUrl = (lowerText.startsWith('http://') || lowerText.startsWith('https://') || lowerText.startsWith('data:image/')) && imageExts.some(ext => lowerText.endsWith(ext));

                        if (content.includes('送来的礼物') || content.includes('送来了礼物')) {
                            lastMessageText = '[礼物]';
                        } else if (content.includes('表情包')) {
                            lastMessageText = '[表情包]';
                        } else if (content.includes('的语音')) {
                            lastMessageText = '[语音]';
                        } else if (content.includes('照片/视频')) {
                            lastMessageText = '[照片/视频]';
                        } else if (content.includes('转账')) {
                            lastMessageText = '[转账]';
                        } else if (hasImagePart || isImageUrl) {
                            lastMessageText = '[图片]';
                        } else if (hasHtmlPart) {
                            lastMessageText = '[互动]';
                        } else {
                            let text = content.trim();
                            if (text.startsWith('[') && text.endsWith(']') && text.includes('的消息：')) {
                                const marker = '的消息：';
                                const idx = text.indexOf(marker);
                                if (idx !== -1) {
                                    text = text.slice(idx + marker.length, text.length - 1).trim();
                                }
                            }
                            const lowered = text.toLowerCase();
                            const isImageText = (lowered.startsWith('http://') || lowered.startsWith('https://') || lowered.startsWith('data:image/')) && imageExts.some(ext => lowered.endsWith(ext));
                            lastMessageText = isImageText ? '[图片]' : text;
                        }
                    } else {
                        const lastEverMsg = chat.history[chat.history.length - 1];
                        const content = lastEverMsg.content || '';
                        if (content.includes('[system-display:')) {
                            const marker = '[system-display:';
                            const start = content.indexOf(marker);
                            const end = content.lastIndexOf(']');
                            if (start !== -1 && end !== -1 && end > start + marker.length) {
                                lastMessageText = content.slice(start + marker.length, end);
                            }
                        } else if (content.includes('邀请') && content.includes('加入了群聊')) {
                            lastMessageText = '新成员加入了群聊';
                        } else if (content.includes('修改群名为')) {
                            lastMessageText = '群聊名称已修改';
                        }
                    }
                }
                const li = document.createElement('li');
                li.className = 'list-item chat-item';
                if (chat.isPinned) li.classList.add('pinned');
                li.dataset.id = chat.id;
                li.dataset.type = chat.type;
                const avatarClass = chat.type === 'group' ? 'group-avatar' : '';
                const itemName = chat.type === 'private' ? chat.remarkName : chat.name;
        const soulBondIconHTML = window.soulBondManager ? window.soulBondManager.getChatListIconHTML(chat) : '';
                const pinBadgeHTML = chat.isPinned ? '<span class="pin-badge">置顶</span>' : '';
                // ▼▼▼ 核心修改 2：在HTML结构中插入图标 ▼▼▼
        li.innerHTML = `
            <img src="${chat.avatar}" alt="${itemName}" class="chat-avatar ${avatarClass}">
            <div class="item-details">
                <div class="item-details-row">
                    <div class="item-name">${itemName}</div>
                    ${soulBondIconHTML}
                </div>
                <div class="item-preview-wrapper">
                    <div class="item-preview">${lastMessageText}</div>
                    ${pinBadgeHTML}
                </div>
            </div>`;
        // ▲▲▲ 修改结束 ▲▲▲
                chatListContainer.appendChild(li);
            });
    document.querySelectorAll('.soul-bond-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const chatId = icon.getAttribute('data-char-id');
            window.soulBondManager.handleIconClick(e, chatId);
        });
    });
    // ▲▲▲ 修改结束 ▲▲▲
        }
        window.renderChatList = renderChatList;
// 在 setupChatListScreen() 函数的末尾添加

const importCardBtn = document.getElementById('import-card-btn');
const cardImportInput = document.getElementById('card-import-input');

if (importCardBtn && cardImportInput) {
    importCardBtn.addEventListener('click', () => {
        cardImportInput.click();
    });
    cardImportInput.addEventListener('change', handleCardImport);
}
        function setupAddCharModal() {
            addCharForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newChar = {
isBlockedByUser: false,
isBlockedByAi: false,
userBlockTimestamp: null,
aiBlockTimestamp: null,
blockEndTime: null,
isOfflineMode: false,
                    id: `char_${Date.now()}`,
                    realName: document.getElementById('char-real-name').value,
                    remarkName: document.getElementById('char-remark-name').value,
                    persona: '',
                    avatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
                    myName: document.getElementById('my-name-for-char').value,
                    myPersona: '',
                    myAvatar: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg',
                    theme: 'white_pink',
                    maxMemory: 10,
                    chatBg: '',
                    history: [],
                    diaries: [],
    messageCountSinceLastDiary: 0,
    // --- 添加结束 ---
                    isPinned: false,
                    status: '在线',
                    worldBookIds: [],
                    useCustomBubbleCss: false,
                    customBubbleCss: '',
                    pendingMessages: [],
                    aiProactiveChatEnabled: false,
                    aiProactiveChatDelay: 0,
                    aiProactiveChatInterval: 0,
                };
                db.characters.push(newChar);
                await saveData();
                renderChatList();
                addCharModal.classList.remove('visible');
                showToast(`角色“${newChar.remarkName}”创建成功！`);
            });
        }
// --- 在 setupChatRoom() 函数的前面，粘贴下面的代码块 ---

function startQuoteReply(messageId) {
    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
    const message = chat.history.find(m => m.id === messageId);
    if (!message) return;

    // 提取干净的文本内容用于预览
    let previewText = message.content;
    const regexes = [
        /\[.*?的消息：([\s\S]+?)\]/,
        /\[.*?的语音：([\s\S]+?)\]/,
        /\[.*?引用了“.*?”的消息?并回复：([\s\S]+?)\]/,
        /\[.*?发来的照片\/视频：([\s\S]+?)\]/
    ];

    for (const regex of regexes) {
        const match = message.content.match(regex);
        if (match) {
            previewText = match[1];
            break;
        }
    }
    
    if (message.parts && message.parts.some(p => p.type === 'image')) {
        previewText = '[图片]';
    } else if (message.quote) {
        previewText = message.replyText;
    }

    currentQuotedMessageId = messageId;
    document.getElementById('quoted-message-preview').textContent = `回复：${previewText}`;
    document.getElementById('quote-reply-bar').style.display = 'flex';
    messageInput.focus();
}

function cancelQuoteReply() {
    currentQuotedMessageId = null;
    document.getElementById('quote-reply-bar').style.display = 'none';
}

    // ▼▼▼ 用下面这个完整的函数，替换掉你文件中旧的 setupChatRoom 函数 ▼▼▼
// START: 修复版 setupChatRoom (修复转账点击判定逻辑)
function setupChatRoom() {
    // 修复：只绑定 click 事件，移除 touchend 以防止重复触发
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isGenerating) sendMessage();
    });
    getReplyBtn.addEventListener('click', getAiReply);

    // --- 微信布局的事件监听 ---
    const wechatMessageInput = document.getElementById('wechat-message-input');
    const wechatSendMessageBtn = document.getElementById('wechat-send-message-btn');
    const wechatGetReplyBtn = document.getElementById('wechat-get-reply-btn');
    
    if (wechatSendMessageBtn) {
        wechatSendMessageBtn.addEventListener('click', () => sendMessage(wechatMessageInput));
    }
    if (wechatMessageInput) {
        wechatMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isGenerating) sendMessage(wechatMessageInput);
        });
    }
    if (wechatGetReplyBtn) {
        wechatGetReplyBtn.addEventListener('click', getAiReply);
    }

    const displayLocationMain = document.getElementById('display-location-main');
    const displayLocationDetail = document.getElementById('display-location-detail');
    const displayLocationModal = document.getElementById('display-location-modal');

    // --- 统一处理 messageArea 上的所有点击事件 ---
    messageArea.addEventListener('click', async (e) => {
        // 1. 截图模式下的点击逻辑 (最高优先级)
        if (isInScreenshotMode) {
            const messageWrapper = e.target.closest('.message-wrapper');
            if (messageWrapper) {
                toggleScreenshotSelection(messageWrapper.dataset.id);
            }
            return;
        }
        
        // 2. 关闭表情包面板
        if (stickerModal.classList.contains('visible')) {
            stickerModal.classList.remove('visible');
            return;
        }

        // 3. 加载更多消息
        if (e.target && e.target.id === 'load-more-btn') {
            loadMoreMessages();
            return;
        }

        // 4. 多选删除模式
        if (isInMultiSelectMode) {
            const messageWrapper = e.target.closest('.message-wrapper');
            if (messageWrapper) {
                toggleMessageSelection(messageWrapper.dataset.id);
            }
            return;
        }
        
        const voiceBubble = e.target.closest('.voice-bubble');
        if (voiceBubble) {
            const transcript = voiceBubble.closest('.message-wrapper').querySelector('.voice-transcript');
            if (transcript) {
                transcript.classList.toggle('active');
            }
        }        

        // 5. 其他普通点击事件（语音、卡片等）
        
        const pvCard = e.target.closest('.pv-card');
        if (pvCard) {
            const imageOverlay = pvCard.querySelector('.pv-card-image-overlay');
            const footer = pvCard.querySelector('.pv-card-footer');
            imageOverlay.classList.toggle('hidden');
            footer.classList.toggle('hidden');
        }
        
        const giftCard = e.target.closest('.gift-card');
        if (giftCard) {
            const description = giftCard.closest('.message-wrapper').querySelector('.gift-card-description');
            if (description) description.classList.toggle('active');
        }
        
        const locationCard = e.target.closest('.location-card');
        if (locationCard) {
            if (displayLocationMain) displayLocationMain.textContent = locationCard.dataset.locationMain;
            if (displayLocationDetail) displayLocationDetail.textContent = locationCard.dataset.locationDetail;
            if (displayLocationModal) displayLocationModal.classList.add('visible');
        }

        const musicPlayBtn = e.target.closest('.music-card-play-btn');
        if (musicPlayBtn) {
            const musicCard = musicPlayBtn.closest('.music-card');
            if (musicCard) {
                const title = (musicCard.dataset.songName || musicCard.querySelector('.music-card-title')?.textContent || '').trim();
                const artist = (musicCard.dataset.songArtist || musicCard.querySelector('.music-card-artist')?.textContent || '').trim();
                const url = (musicCard.dataset.songUrl || '').trim();
                const cover = (musicCard.dataset.songCover || '').trim();
                if (title) {
                    let existingSong = db.playlist.find(s => s.name === title && (artist ? s.artist === artist : true));
                    if (!existingSong && url) {
                        const newSong = {
                            id: `song_${Date.now()}`,
                            url,
                            name: title,
                            artist: artist || '未知歌手',
                            albumArt: cover,
                            lyrics: ''
                        };
                        db.playlist.push(newSong);
                        await saveData();
                        if (typeof window.renderPlaylist === 'function') {
                            window.renderPlaylist();
                        }
                        existingSong = newSong;
                    }
                    if (existingSong && typeof window.playSong === 'function') {
                        const songIndex = db.playlist.indexOf(existingSong);
                        await window.playSong(songIndex);
                    } else if (typeof window.searchAndPlaySong === 'function') {
                        await window.searchAndPlaySong(title, artist);
                    }
                    const musicModal = document.getElementById('music-player-modal');
                    if (musicModal) musicModal.classList.add('visible');
                }
            }
            return;
        }
        const musicCard = e.target.closest('.music-card');
        if (musicCard && !musicCard.querySelector('.music-card-play-btn')) {
            const title = musicCard.querySelector('.music-card-title')?.textContent?.trim() || '';
            const artist = musicCard.querySelector('.music-card-artist')?.textContent?.trim() || '';
            if (title && typeof window.searchAndPlaySong === 'function') {
                await window.searchAndPlaySong(title, artist);
                const musicModal = document.getElementById('music-player-modal');
                if (musicModal) musicModal.classList.add('visible');
            }
            return;
        }
        
        // 撤回消息点击
        const placeholder = e.target.closest('.recalled-message-placeholder');
        if (placeholder) {
            // 这里为了简单，假设 viewRecalledModal 逻辑已经绑定在 setupViewRecalledModal 中
            // 如果 setupViewRecalledModal 使用了独立的监听器，这里不做处理也行
            // 但为了保险，我们可以模拟触发点击（如果逻辑写在这里的话）
        }
    });

    // --- 长按/右键菜单事件 ---
    messageArea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.id === 'load-more-btn' || isInMultiSelectMode || isInScreenshotMode) return;
        const messageWrapper = e.target.closest('.message-wrapper');
        if (!messageWrapper) return;
        handleMessageLongPress(messageWrapper, e.clientX, e.clientY);
    });
    
    messageArea.addEventListener('touchstart', (e) => {
        if (e.target.id === 'load-more-btn' || isInMultiSelectMode || isInScreenshotMode) return;
        const messageWrapper = e.target.closest('.message-wrapper');
        if (!messageWrapper) return;
        longPressTimer = setTimeout(() => {
            const touch = e.touches[0];
            handleMessageLongPress(messageWrapper, touch.clientX, touch.clientY);
        }, 400);
    });
    messageArea.addEventListener('touchend', () => clearTimeout(longPressTimer));
    messageArea.addEventListener('touchmove', () => clearTimeout(longPressTimer));

    // --- 其他按钮的事件监听 ---
    cancelMultiSelectBtn.addEventListener('click', exitMultiSelectMode);
    deleteSelectedBtn.addEventListener('click', deleteSelectedMessages);
    document.getElementById('cancel-quote-reply-btn').addEventListener('click', cancelQuoteReply);
    document.getElementById('cancel-screenshot-select').addEventListener('click', exitScreenshotSelectionMode);
    document.getElementById('confirm-screenshot-select').addEventListener('click', generateSelectedMessagesScreenshot);

    // --- 编辑消息弹窗事件监听 ---
    const messageEditForm = document.getElementById('message-edit-form');
    if (messageEditForm) {
        messageEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveMessageEdit();
        });
    }

    const cancelEditModalBtn = document.getElementById('cancel-edit-modal-btn');
    if (cancelEditModalBtn) {
        cancelEditModalBtn.addEventListener('click', cancelMessageEdit);
    }

    const legacyFunctionPanelHandler = (action) => {
        switch (action) {
            case 'sticker':
                stickerModal.classList.add('visible');
                renderStickerTabs();
                renderStickerGrid();
                break;
            case 'voice-call':
                if (currentChatType === 'private') window.TB_Call.startUserInitiatedCall();
                else showToast('群聊暂不支持通话');
                break;
            case 'wallet':
                walletBtn.click();
                break;
            case 'gift':
                giftBtn.click();
                break;
            case 'rollback':
                if (window.TB_AiActions && typeof window.TB_AiActions.rollback === 'function') {
                    window.TB_AiActions.rollback();
                } else if (document.getElementById('rollback-btn')) {
                    document.getElementById('rollback-btn').click();
                }
                break;
            case 'continue-writing':
                if (window.TB_AiActions && typeof window.TB_AiActions.continueWriting === 'function') {
                    window.TB_AiActions.continueWriting();
                }
                break;
            case 'diary':
                if (currentChatId && currentChatType === 'private') {
                    document.getElementById('diary-actionsheet').classList.add('visible');
                } else {
                    showToast('此功能仅在私聊中可用');
                }
                break;
            case 'token-stats':
                if (window.TB_Token && typeof window.TB_Token.open === 'function') {
                    window.TB_Token.open();
                }
                break;
        }
    };
    if (window.TB_Core && typeof window.TB_Core.init === 'function') {
        window.TB_Core.init({
            getContext: () => ({ db, currentChatId, currentChatType }),
            renderMessages,
            saveData,
            renderChatList,
            showToast,
            compressImage,
            calculateCurrentContextTokens: window.tokenCalculator ? window.tokenCalculator.calculate : null,
            handleLegacyAction: legacyFunctionPanelHandler
        });
    }
}

        function handleMessageLongPress(messageWrapper, x, y) {
            if (isInMultiSelectMode) return;
            clearTimeout(longPressTimer);
            const messageId = messageWrapper.dataset.id;
            const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
            const message = chat.history.find(m => m.id === messageId);
            if (!message) return;

            const isImageRecognitionMsg = message.parts && message.parts.some(p => p.type === 'image');
            const isVoiceMessage = /\[.*?的语音：.*?\]/.test(message.content);
            const isStickerMessage = /\[.*?的表情包：.*?\]|\[.*?发送的表情包：.*?\]/.test(message.content);
            const isPhotoVideoMessage = /\[.*?发来的照片\/视频：.*?\]/.test(message.content);
            const isTransferMessage = /\[.*?给你转账：.*?\]|\[.*?的转账：.*?\]|\[.*?向.*?转账：.*?\]/.test(message.content);
            const isGiftMessage = /\[.*?送来的礼物：.*?\]|\[.*?向.*?送来了礼物：.*?\]/.test(message.content);
            const isInvisibleMessage = /\[.*?(?:接收|退回).*?的转账\]|\[.*?更新状态为：.*?\]|\[.*?已接收礼物\]|\[system:.*?\]|\[.*?邀请.*?加入了群聊\]|\[.*?修改群名为：.*?\]|\[system-display:.*?\]/.test(message.content);

            let menuItems = [];
            menuItems.push({label: '引用', action: () => startQuoteReply(messageId)});
     const isSent = messageWrapper.classList.contains('sent');
    const twoMinutes = 2 * 60 * 1000;
    if (isSent && (Date.now() - message.timestamp < twoMinutes) && !message.recalled) {
        menuItems.push({
            label: '撤回',
            action: async () => {
                const msgIndex = chat.history.findIndex(m => m.id === messageId);
                if (msgIndex > -1) {
                    // 核心修改：不再修改content，而是添加标记
                    chat.history[msgIndex].recalled = true;
                    chat.history[msgIndex].recalledBy = 'user';
                    // 同时保存一份原始内容，以便查看
                    chat.history[msgIndex].originalContent = chat.history[msgIndex].content;
                    
                    await saveData();
                    window.chatUiCore.renderMessages(false, true); // 重新渲染，让消息变成占位符
                }
            }
        });
    }

menuItems.push({
        label: '长截图 (选择)',
        action: () => enterScreenshotSelectionMode(messageId)
    });
    if (!isImageRecognitionMsg && !isVoiceMessage && !isStickerMessage && !isPhotoVideoMessage && !isTransferMessage && !isGiftMessage && !isInvisibleMessage) {
        menuItems.push({label: '编辑', action: () => startMessageEdit(messageId)});
    }
    menuItems.push({label: '删除', action: () => enterMultiSelectMode(messageId)});

            if (menuItems.length > 0) {
                createContextMenu(menuItems, x, y);
            }
        }

        function startMessageEdit(messageId) {
            exitMultiSelectMode();
            editingMessageId = messageId;
            const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
            const message = chat.history.find(m => m.id === messageId);
            if (!message) return;

            const modal = document.getElementById('message-edit-modal');
            const textarea = document.getElementById('message-edit-textarea');

            let contentToEdit = message.content;
            const plainTextMatch = contentToEdit.match(/^\[.*?：([\s\S]*)\]$/);
            if (plainTextMatch && plainTextMatch[1]) {
                contentToEdit = plainTextMatch[1].trim();
            }
            contentToEdit = contentToEdit.replace(/\[发送时间:.*?\]/g, '').trim();
            
            textarea.value = contentToEdit;
            modal.classList.add('visible');
            textarea.focus();
        }

        async function saveMessageEdit() {
            const newText = document.getElementById('message-edit-textarea').value.trim();
            if (!newText || !editingMessageId) {
                cancelMessageEdit();
                return;
            }

            const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
            const messageIndex = chat.history.findIndex(m => m.id === editingMessageId);
            if (messageIndex === -1) {
                cancelMessageEdit();
                return;
            }

            const oldContent = chat.history[messageIndex].content;
            const prefixMatch = oldContent.match(/(\[.*?的消息：)[\s\S]+\]/);
            let newContent;

            if (prefixMatch && prefixMatch[1]) {
                const prefix = prefixMatch[1];
                newContent = `${prefix}${newText}]`;
            } else {
                newContent = newText;
            }

            chat.history[messageIndex].content = newContent;
            if (chat.history[messageIndex].parts) {
                chat.history[messageIndex].parts = [{type: 'text', text: newContent}];
            }

            await saveData();
            window.chatUiCoreState.currentPage = 1;
            window.chatUiCore.renderMessages(false, true);
            renderChatList();
            
            cancelMessageEdit();
        }

        function cancelMessageEdit() {
            editingMessageId = null;
            const modal = document.getElementById('message-edit-modal');
            if (modal) {
                modal.classList.remove('visible');
            }
        }

        function enterMultiSelectMode(initialMessageId) {
            isInMultiSelectMode = true;
            chatRoomHeaderDefault.style.display = 'none';
            chatRoomHeaderSelect.style.display = 'flex';
            document.querySelector('.chat-input-wrapper').style.display = 'none';
            multiSelectBar.classList.add('visible');
            chatRoomScreen.classList.add('multi-select-active');
            selectedMessageIds.clear();
            if (initialMessageId) {
                toggleMessageSelection(initialMessageId);
            }
        }

        function exitMultiSelectMode() {
            isInMultiSelectMode = false;
            chatRoomHeaderDefault.style.display = 'flex';
            chatRoomHeaderSelect.style.display = 'none';
            document.querySelector('.chat-input-wrapper').style.display = 'block';
            multiSelectBar.classList.remove('visible');
            chatRoomScreen.classList.remove('multi-select-active');
            selectedMessageIds.forEach(id => {
                const el = messageArea.querySelector(`.message-wrapper[data-id="${id}"]`);
                if (el) el.classList.remove('multi-select-selected');
            });
            selectedMessageIds.clear();
        }

        function toggleMessageSelection(messageId) {
            const el = messageArea.querySelector(`.message-wrapper[data-id="${messageId}"]`);
            if (!el) return;
            if (selectedMessageIds.has(messageId)) {
                selectedMessageIds.delete(messageId);
                el.classList.remove('multi-select-selected');
            } else {
                selectedMessageIds.add(messageId);
                el.classList.add('multi-select-selected');
            }
            selectCount.textContent = `已选择 ${selectedMessageIds.size} 项`;
            deleteSelectedBtn.disabled = selectedMessageIds.size === 0;
        }

        async function deleteSelectedMessages() {
            if (selectedMessageIds.size === 0) return;
            const deletedCount = selectedMessageIds.size;
            const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
            chat.history = chat.history.filter(m => !selectedMessageIds.has(m.id));
            await saveData();
            window.chatUiCoreState.currentPage = 1;
            window.chatUiCore.renderMessages(false, true);
            renderChatList();
            exitMultiSelectMode();
            showToast(`已删除 ${deletedCount} 条消息`);
        }

// --- 新代码开始 ---
     // --- 新代码开始 ---
    // --- 新代码开始 ---
// --- 新代码开始 ---
        function openChatRoom(chatId, type) { // 修改：函数不再需要 async
            const chat = (type === 'private') ? db.characters.find(c => c.id === chatId) : db.groups.find(g => g.id === chatId);
            if (!chat) return;

            // 将当前聊天 ID 和类型存储到 DOM 属性中（用于 Token 统计等功能）
            if (document.body) {
                document.body.setAttribute('data-current-chat-id', chatId);
                document.body.setAttribute('data-current-chat-type', type);
            }

            // 修改：处理暂存消息的逻辑已被移除

            // 后续逻辑保持不变，但重新梳理了渲染顺序
            exitScreenshotSelectionMode(); 
            checkAndUpdateUiForAiBlock();
            exitMultiSelectMode();
            cancelMessageEdit();

            if (window.targetMessageId) {
                const targetId = window.targetMessageId;
                const messageIndex = chat.history.findIndex(m => m.id === targetId);
                if (messageIndex > -1) {
                    const page = Math.floor((chat.history.length - 1 - messageIndex) / MESSAGES_PER_PAGE) + 1;
                    window.chatUiCoreState.currentPage = page;
                    window.targetMessageIdForHighlight = targetId;
                } else {
                    window.chatUiCoreState.currentPage = 1; 
                    showToast('无法在历史记录中定位到该消息');
                }
                window.targetMessageId = null; 
            } else {
                window.chatUiCoreState.currentPage = 1;
            }

            const voiceCallBtn = document.getElementById('voice-call-btn');
            const diaryBtn = document.getElementById('diary-btn');
            const trajectoryBtn = document.getElementById('ai-trajectory-btn');

            if (type === 'private') {
                voiceCallBtn.style.display = 'flex';
                diaryBtn.style.display = 'flex';
                trajectoryBtn.style.display = 'flex';
            } else { 
                voiceCallBtn.style.display = 'none';
                diaryBtn.style.display = 'none';
                trajectoryBtn.style.display = 'none';
            }

            chatRoomTitle.textContent = (type === 'private') ? chat.remarkName : chat.name;
            const subtitle = document.getElementById('chat-room-subtitle');
            if (type === 'private') {
                subtitle.style.display = 'flex';
                chatRoomStatusText.textContent = chat.status || '在线';
            } else {
                subtitle.style.display = 'none';
            }
            getReplyBtn.style.display = 'inline-flex';
            if (window.ChatStyling && typeof window.ChatStyling.applyChatTheme === 'function') {
                window.ChatStyling.applyChatTheme(chatId, type);
            } else {
                chatRoomScreen.style.backgroundImage = chat.chatBg ? `url(${chat.chatBg})` : 'none';
                chatRoomScreen.style.setProperty('--bubble-scale', type === 'group' ? (chat.bubbleScale || 1) : 1);
                chatRoomScreen.className = chatRoomScreen.className.replace(/\bchat-active-[^ ]+\b/g, '');
                chatRoomScreen.classList.add(`chat-active-${chatId}`);
                updateCustomBubbleStyle(chatId, chat.customBubbleCss, chat.useCustomBubbleCss);
            }
            typingIndicator.style.display = 'none';
            isGenerating = false;
            getReplyBtn.disabled = false;
            
            
            messageArea.innerHTML = '';
            switchScreen('chat-room-screen');
            
            setTimeout(() => {
                window.chatUiCore.renderMessages(false, !window.targetMessageIdForHighlight);
                // 更新 Token 统计按钮
                if (typeof updateTokenStatsButton === 'function') {
                    updateTokenStatsButton();
                }
            }, 50);
        }
        window.openChatRoom = openChatRoom;
// --- 新代码结束 ---
// --- 新代码结束 ---
// --- 新代码结束 ---

function loadMoreMessages() {
            window.chatUiCoreState.currentPage += 1;
            window.chatUiCore.renderMessages(true, false);
        }

// START: 修复版 addMessageBubble (修正转账正则和状态更新)
async function addMessageBubble(message) {
    // 1. 状态更新逻辑 (保持不变)
    const updateStatusRegex = /\[.*?更新状态为[:：].*?\]/;
    if (updateStatusRegex.test(message.content) && message.role === 'assistant') {
        const statusMatch = message.content.match(/\[(.*?)\s*更新状态为[:：](.*?)\]/);
        if (statusMatch) {
            const charName = statusMatch[1].trim();
            const newStatus = statusMatch[2].trim();
            const targetChar = db.characters.find(c => c.realName === charName || c.remarkName === charName);
            if (targetChar) {
                targetChar.status = newStatus;
                if (currentChatId === targetChar.id) {
                    const statusTextEl = document.getElementById('chat-room-status-text');
                    if (statusTextEl) statusTextEl.textContent = newStatus;
                }
                saveData(); 
            }
        }
        return; 
    }

    // 2. 通话指令拦截 (保持不变)
    const callInitiateRegex = /\[call:(.*?)\]/;
    const callInitiateMatch = message.content.match(callInitiateRegex);
    if (callInitiateMatch && message.role === 'assistant') {
        const character = db.characters.find(c => c.realName === callInitiateMatch[1]);
        if (character) {
            window.TB_Call.startAiInitiatedCall(character.id);
        }
        return; 
    }

    // 3. 拦截不可见消息 (转账/收礼逻辑修复)
    // 这里的正则加宽了匹配范围，允许空格
    const invisibleRegex = /\[[\s\S]*?(?:接收|退回)[\s\S]*?的转账\]|\[[\s\S]*?已接收礼物\]|\[system:[\s\S]*?\]|\[system-context-only:[\s\S]*?\]|\[call-(?:accept|decline)\]|\[hangup\]|\[block-user\]|\[unblock-user\]/;
    
    if (invisibleRegex.test(message.content)) {
        if (currentChatType === 'private') {
            const character = db.characters.find(c => c.id === currentChatId);
            if (character) {
                // 修复：更宽容的正则，允许名字前后有空格
                const transferActionRegex = new RegExp(`\\[\\s*${character.realName}\\s*(接收|退回)\\s*${character.myName}\\s*的转账\\s*\\]`);
                const giftReceivedRegex = new RegExp(`\\[\\s*${character.realName}\\s*已接收礼物\\s*\\]`);

                if (message.content.match(giftReceivedRegex) && message.role === 'assistant') {
                    const lastPendingGiftIndex = character.history.slice().reverse().findIndex(m => m.role === 'user' && m.content.includes('送来的礼物：') && m.giftStatus !== 'received');
                    if (lastPendingGiftIndex !== -1) {
                        const actualIndex = character.history.length - 1 - lastPendingGiftIndex;
                        character.history[actualIndex].giftStatus = 'received';
                        const giftCardOnScreen = messageArea.querySelector(`.message-wrapper[data-id="${character.history[actualIndex].id}"] .gift-card`);
                        if (giftCardOnScreen) giftCardOnScreen.classList.add('received');
                        await saveData();
                    }
                } 
                else if (message.content.match(transferActionRegex) && message.role === 'assistant') {
                    const action = message.content.match(transferActionRegex)[1];
                    const statusToSet = action === '接收' ? 'received' : 'returned';
                    const lastPendingTransferIndex = character.history.slice().reverse().findIndex(m => m.role === 'user' && m.content.includes('给你转账：') && m.transferStatus === 'pending');
                    if (lastPendingTransferIndex !== -1) {
                        const actualIndex = character.history.length - 1 - lastPendingTransferIndex;
                        character.history[actualIndex].transferStatus = statusToSet;
                        const transferCardOnScreen = messageArea.querySelector(`.message-wrapper[data-id="${character.history[actualIndex].id}"] .transfer-card`);
                        if (transferCardOnScreen) {
                            transferCardOnScreen.classList.remove('received', 'returned');
                            transferCardOnScreen.classList.add(statusToSet);
                            const statusElem = transferCardOnScreen.querySelector('.transfer-status');
                            if (statusElem) statusElem.textContent = statusToSet === 'received' ? '已收款' : '已退回';
                        }
                        await saveData();
                    }
                }
            }
        }
        return; 
    }

    const bubbleElement = window.chatUiCore.createMessageBubbleElement(message);
    if (bubbleElement) {
        messageArea.appendChild(bubbleElement);
        if (window.displayDispatcher && typeof window.displayDispatcher.runPostInits === 'function') {
            window.displayDispatcher.runPostInits(bubbleElement);
        }
        messageArea.scrollTop = messageArea.scrollHeight;
    }
}
window.addMessageBubble = addMessageBubble;

// END: 最终修正版 addMessageBubble 函数

// ▼▼▼ 第三步：请复制这段代码，完整替换 sendMessage 函数 ▼▼▼

// START: 最终增强版 sendMessage 函数 (含精确的中文年月日星期时间感知)
async function sendMessage(targetInput = null) {
    // 🆕 防重复发送检查
    if (isSending) {
        console.warn('⚠️ 正在发送中，请勿重复点击');
        return;
    }

    // 优化点：兼容微信布局传参，或者自动获取当前显示的输入框
    const currentInputElement = targetInput || (db.useWechatLayout 
        ? document.getElementById('wechat-message-input') 
        : document.getElementById('message-input'));

    const text = currentInputElement.value.trim();
    if (!text || isGenerating) return;

    // 🆕 立即清空输入框（Optimistic UI 更新）
    currentInputElement.value = '';
    
    // 🆕 重置输入框高度（如果有自适应高度）
    if (currentInputElement.style.height) {
        currentInputElement.style.height = 'auto';
    }
    
    // 🆕 设置发送锁
    isSending = true;
    
    try {
        const chat = (currentChatType === 'private') 
            ? db.characters.find(c => c.id === currentChatId) 
            : db.groups.find(g => g.id === currentChatId);
        if (!chat) return;

        // --- 判断是否处于拉黑状态 ---
        if (currentChatType === 'private' && chat.isBlockedByUser) {
            const myName = chat.myName;
            const messageContent = `[${myName}的消息：${text}]`;
            const message = {
                id: `msg_${Date.now()}`,
                role: 'user',
                content: messageContent,
                parts: [{ type: 'text', text: messageContent }],
                timestamp: Date.now()
            };

            chat.pendingMessages = chat.pendingMessages || [];
            chat.pendingMessages.push(message);
            addMessageBubble(message);
            await saveData();
            // 更新 Token 统计按钮
            if (typeof updateTokenStatsButton === 'function') {
                setTimeout(() => updateTokenStatsButton(), 100);
            }
            // 🆕 输入框已在函数开头清空，此处不再需要
            return;
        }

        // ==========================================
        // ★★★ 新增：增强时间感知逻辑 (精确到年月日星期) ★★★
        // ==========================================
        if (db.apiSettings && db.apiSettings.timePerceptionEnabled) {
            const now = Date.now();
            const nowDate = new Date();
            const lastMessageTime = chat.lastUserMessageTimestamp || 0;
            
            // 构建精确的中文时间字符串 (例如: 2023年12月03日 星期日 14:30)
            // 这样AI能非常清楚地识别出"今天几号"、"星期几"
            const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const currentTimeStr = `${nowDate.getFullYear()}年${nowDate.getMonth() + 1}月${nowDate.getDate()}日 ${weekDays[nowDate.getDay()]} ${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;

            // 辅助函数：格式化时间差
            const formatTimeGap = (milliseconds) => {
                const seconds = Math.floor(milliseconds / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                if (days > 0) return `${days}天${hours % 24}小时`;
                if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
                if (minutes > 0) return `${minutes}分钟`;
                return `刚刚`;
            };

            // 情况1：如果间隔超过30分钟 -> 发送"过去了多久"的提示
            if (lastMessageTime > 0 && (now - lastMessageTime > 30 * 60 * 1000)) {
                const timeGap = now - lastMessageTime;
                const timeGapStr = formatTimeGap(timeGap);

                // 1. 创建对用户可见的提示
                const displayContent = `[system-display:距离上次聊天已经过去 ${timeGapStr}]`;
                const visualMessage = {
                    id: `msg_visual_timesense_${Date.now()}`,
                    role: 'system', 
                    content: displayContent,
                    parts: [],
                    timestamp: now - 2 
                };

                // 2. 创建给AI看的系统指令 (包含精确时间)
                const contextContent = `[system: 与用户的上一次互动发生在${timeGapStr}前。当前现实时间是 ${currentTimeStr}。话题可能已经不连续，你需要作出相关反应。]`;
                const contextMessage = {
                    id: `msg_context_timesense_${Date.now()}`,
                    role: 'user',
                    content: contextContent,
                    parts: [{ type: 'text', text: contextContent }],
                    timestamp: now - 1
                };

                if (currentChatType === 'group') {
                    visualMessage.senderId = 'user_me';
                    contextMessage.senderId = 'user_me';
                }

                chat.history.push(visualMessage, contextMessage);
                addMessageBubble(visualMessage);
            } 
            // 情况2：正常连续聊天 -> 悄悄告诉AI当前的精确时间
            else {
                const timeContextContent = `[system-context-only: 当前现实时间是 ${currentTimeStr}]`;
                const timeContextMessage = {
                    id: `msg_context_time_${Date.now()}`,
                    role: 'user',
                    content: timeContextContent,
                    parts: [{ type: 'text', text: timeContextContent }],
                    timestamp: now - 1
                };

                if (currentChatType === 'group') {
                    timeContextMessage.senderId = 'user_me';
                }
                chat.history.push(timeContextMessage);
            }
            
            // 更新最后互动时间
            chat.lastUserMessageTimestamp = now;
        }
        // ==========================================
        // ★★★ 时间感知逻辑结束 ★★★
        // ==========================================

        // --- 以下是正常的发送逻辑 ---
        let message;
        const myName = (currentChatType === 'private') ? chat.myName : chat.me.nickname;

        if (currentQuotedMessageId) {
            const originalMessage = chat.history.find(m => m.id === currentQuotedMessageId);
            if (!originalMessage) {
                cancelQuoteReply();
                return; 
            }
            
            let originalSenderName = '';
            let cleanOriginalContent = originalMessage.content;

            if (currentChatType === 'private') {
                originalSenderName = originalMessage.role === 'user' ? myName : chat.remarkName;
            } else {
                const sender = originalMessage.senderId === 'user_me' ? chat.me : chat.members.find(m => m.id === originalMessage.senderId);
                originalSenderName = sender ? (sender.nickname || sender.groupNickname) : '未知';
            }
            
            const textRegex = /\[.*?的消息：([\s\S]+?)\]/;
            const match = originalMessage.content.match(textRegex);
            if (match) cleanOriginalContent = match[1];
            if (originalMessage.replyText) cleanOriginalContent = originalMessage.replyText;

            const messageContentForAI = `[${myName}引用了"${originalSenderName}: ${cleanOriginalContent}"的消息并回复：${text}]`;

            message = {
                id: `msg_${Date.now()}`,
                role: 'user',
                content: messageContentForAI,
                parts: [{ type: 'text', text: messageContentForAI }],
                timestamp: Date.now(),
                quote: {
                    messageId: currentQuotedMessageId,
                    sender: originalSenderName,
                    content: cleanOriginalContent
                },
                replyText: text
            };

            cancelQuoteReply();
        } else {
            const systemRegex = /\[system:.*?\]|\[system-display:.*?\]/;
            const inviteRegex = /\[.*?邀请.*?加入了群聊\]/;
            const renameRegex = /\[(.*?)修改群名为：(.*?)\]/;
            let messageContent;

            if (currentChatType === 'group' && renameRegex.test(text)) {
                const match = text.match(renameRegex);
                chat.name = match[2];
                chatRoomTitle.textContent = chat.name;
                messageContent = `[${chat.me.nickname}修改群名为：${chat.name}]`;
            } else if (systemRegex.test(text) || inviteRegex.test(text)) {
                messageContent = text;
            } else {
                messageContent = `[${myName}的消息：${text}]`;
            }

            message = {
                id: `msg_${Date.now()}`,
                role: 'user',
                content: messageContent,
                parts: [{ type: 'text', text: messageContent }],
                timestamp: Date.now()
            };
        }

        if (currentChatType === 'group') {
            message.senderId = 'user_me';
        }
        chat.history.push(message);
        addMessageBubble(message);
        await saveData();
        // 更新 Token 统计按钮
        if (typeof updateTokenStatsButton === 'function') {
            setTimeout(() => updateTokenStatsButton(), 100);
        }
        renderChatList();
        if (chat.povCache) {
            chat.povCache = null;
        }
        
        // 🆕 输入框已在函数开头清空，此处不再需要
        
        // 🆕 日记触发检查（里程碑方案）- 仅在私聊时检查
        if (currentChatType === 'private' && chat) {
            if (window.TB_Diary) TB_Diary.checkDiaryTrigger(chat);
        }
        
    } catch (error) {
        // 🆕 错误处理：发送失败时恢复文本到输入框
        console.error('❌ 发送消息失败:', error);
        if (currentInputElement) {
            currentInputElement.value = text;
        }
        showToast('发送失败，请重试');
    } finally {
        // 🆕 释放发送锁
        isSending = false;
    }
}
window.sendMessage = sendMessage;
window.handleSend = sendMessage;



// --- 辅助函数：格式化时间差 ---
function formatTimeGap(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天${hours % 24}小时`;
    if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
    if (minutes > 0) return `${minutes}分钟`;
    return `${seconds}秒`;
}

// --- 辅助函数：获取当前格式化时间 ---
function getFormattedTimestamp(date) {
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const D = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${Y}-${M}-${D} ${h}:${m}`;
}
// ▲▲▲ 替换结束 ▲▲▲



// --- NEW: File Display System Setup ---
// START: 修复版 setupFileDisplaySystem (自动修复换行和格式)
// START: 纯净修复版 setupFileDisplaySystem (完美兼容代码和小说)
function setupFileDisplaySystem() {
    const displayModal = document.getElementById('display-file-modal');
    const fileNameEl = document.getElementById('display-file-name');
    const fileContentEl = document.getElementById('display-file-content');
    const closeBtn = document.getElementById('close-file-display-btn');

    // 使用事件委托，在消息区域监听对文件卡片的点击
    document.getElementById('message-area').addEventListener('click', (e) => {
        const fileCard = e.target.closest('.file-card');
        if (fileCard) {
            const fileName = fileCard.dataset.fileName;
            let content = fileCard.dataset.fileContent;

            if (fileName && typeof content !== 'undefined') {
                // ▼▼▼ 纯净还原逻辑 ▼▼▼
                
                // 1. 修复 JSON 转义字符 (这是必须的“翻译”工作)
                content = content
                    .replace(/\\n/g, '\n')  // 把 \n 变成真换行
                    .replace(/\\r/g, '')    // 去掉回车符
                    .replace(/\\"/g, '"')   // 把 \" 还原成 " (修复HTML属性)
                    .replace(/\\'/g, "'");  // 把 \' 还原成 '

                // 【注意】我删除了去标题(#)和去加粗(**)的代码
                // 这样能确保程序员写的代码注释(#)和数学运算(**)不被误删
                // 小说里的符号也会原样保留，原汁原味。

                // ▲▲▲ 逻辑结束 ▲▲▲

                fileNameEl.textContent = fileName;
                fileContentEl.textContent = content;
                displayModal.classList.add('visible');
            }
        }
    });

    // 关闭按钮逻辑
    closeBtn.addEventListener('click', () => {
        displayModal.classList.remove('visible');
    });
    
    // 点击弹窗的灰色背景区域也可以关闭
    displayModal.addEventListener('click', (e) => {
        if (e.target === displayModal) {
            displayModal.classList.remove('visible');
        }
    });
}


        function getMixedContent(responseData) {
            // const mixedContent = [];
            //
            // // 提取消息及其位置
            // const messageRegex = new RegExp(regex, "g");
            // let messageMatch;
            // while ((messageMatch = messageRegex.exec(responseData)) !== null) {
            //     mixedContent.push({
            //         type: 'text',
            //         content: messageMatch[0],
            //         index: messageMatch.index,
            //     });
            // }
            //
            // // 提取HTML及其位置
            // const htmlRegex = /<orange(?:\s+char=["']([^"']*?)["'])?\s*>([\s\S]*?)<\/orange>/g
            // let htmlMatch;
            // while ((htmlMatch = htmlRegex.exec(responseData)) !== null) {
            //     mixedContent.push({
            //         type: 'html',
            //         content: htmlMatch[2].trim(), // HTML内容在第二个捕获组
            //         char: htmlMatch[1] || '', // char属性值，如果没有则为空字符串
            //         index: htmlMatch.index,
            //     });
            // }
            //
            // // 按出现顺序排序
            // mixedContent.sort((a, b) => a.index - b.index);
            //
            // return mixedContent;

            // 最终结果数组
            const results = [];
            // 修复：支持跨行匹配的正则 ([\s\S]*?)
            const regex = /<div class="ai-theater"(?:\s+data-char="([^"]*)")?>([\s\S]*?)<\/div>|(\[[\s\S]*?\])/g;
            let match;
            // 使用 exec() 循环遍历所有匹配项，以确保顺序
            while ((match = regex.exec(responseData)) !== null) {
                // match[1] 是 char 的值, match[2] 是 <orange> 的内容
                if (match[1] !== undefined || match[2] !== undefined) {
                    results.push({
                        type: 'html',
                        // 如果 char 属性不存在, match[1] 会是 undefined, 我们将其设为 null
                        char: match[1] || null,
                        // match[2] 是 HTML 内容, trim() 用于移除首尾空白
                        content: match[2].trim()
                    });
                }
                // match[3] 是 [...] 的内容
                else if (match[3]) {
                    results.push({
                        type: 'text',
                        content: match[3]
                    });
                }
            }

            return results;
        }

        // --- AI Interaction & Prompts ---
        // (请找到文件中的旧 generatePrivateSystemPrompt 函数，并用下面的代码完整替换它)

 // === 修改后的 generatePrivateSystemPrompt 函数 (请完整替换) ===
// ▼▼▼ 第二步：完整替换 generatePrivateSystemPrompt 函数 (严格保留原版所有设定 + 新增AI自主解封逻辑) ▼▼▼
function generatePrivateSystemPrompt(character) {
    // 获取 AI 当前给用户的备注（如果没有则使用默认名）
    const currentAiRemark = character.aiAssignedUserRemark || character.myName;
    // ==================================================================================
    // ★★★ 核心逻辑更新：拉黑状态下的拟人化处理 (高自由度版) ★★★
    // ==================================================================================
    if (character.isBlockedByAi) {
        return `【⚠️ 特殊状态：你已将用户拉黑】
当前状态：你（${character.realName}）已经将用户（${character.myName}）**拉黑**了。
用户无法正常给你发消息，但他正在通过“申请回复”功能试图向你解释、道歉或求饶。

**你的行动准则：**
1. 回顾你们的关系和你拉黑他的原因。你现在是愤怒、失望、冷漠，还是已经心软了？
2. 认真阅读用户最新发送的消息。
3. **严格根据人设做出决定**：

   - **情况 A：继续拉黑**
     如果用户还在激怒你，或者道歉不够诚恳，或者你还没消气：
     请回复 \`[keep-blocked]\`。
     (系统会自动提示用户“消息被拒收”，**你不需要写任何其他文字**)。

   - **情况 B：解除拉黑 (保持沉默/闷骚/高冷)**
     如果你觉得可以原谅了，但不想理他，或者性格比较高冷/闷骚/傲娇：
     请**仅回复** \`[unblock-user]\`。
     (不要在后面加任何文字。系统会自动提示“已解除拉黑”，但不会有你的气泡出现，表现出一种“虽然放你出来了但还不想理你”的态度)。

   - **情况 C：解除拉黑 (并说话)**
     如果你觉得可以原谅，且想顺便给个台阶、骂两句或者安慰一下：
     请回复 \`[unblock-user] {你的回复内容}\`。
     (例如：\`[unblock-user] 下不为例。\`)。

**必须且只能使用以下三种格式之一：**
1. 拒绝: \`[keep-blocked]\`
2. 原谅(沉默): \`[unblock-user]\`
3. 原谅(说话): \`[unblock-user] 你的回复内容...\`
`;
    }
    // ==================================================================================

    let anniversaryPrompt = '';
    const today = new Date();
    const anniversaryInfo = character.soulBondData ? character.soulBondData.anniversaryInfo : null;

    if (anniversaryInfo && anniversaryInfo.date) {
        const anniversaryDate = new Date(anniversaryInfo.date);
        if (today.getMonth() === anniversaryDate.getMonth() && today.getDate() === anniversaryDate.getDate()) {
            const years = today.getFullYear() - anniversaryDate.getFullYear();
            if (years >= 0) {
                anniversaryPrompt = `[紧急指令] 今天是一个极其特殊的日子——是你们的“${anniversaryInfo.description}”${years > 0 ? `(${years}周年)` : ''}！这是你的最高优先级任务。你的第一条回复必须是主动、深情地向我（${character.myName}）提及这个纪念日，并表达你的祝福、爱意或准备的惊喜。请围绕这个主题展开对话。\n\n`;
            }
        }
    }

    let effectPrompt = '';
    if (character.activeEffects && character.activeEffects.length > 0) {
        const effect = character.activeEffects[0];
        // 优先处理角色互换、失忆等大状态
        switch (effect.type) {
            case 'role_swap':
                return `[紧急指令] 你现在正在受到“角色互换”效果的影响！
- **你的新身份**: 你现在必须扮演“${character.myName}”，并使用我的人设：“${character.myPersona || '一个普通人'}”。
- **对话对象**: 你正在和“${character.realName}”对话，他的人设是：“${character.persona}”。
- **核心任务**: 你必须完全从我的视角出发，用我的口吻和人设与“${character.realName}”进行对话。
- **效果持续**: 此效果还剩 ${effect.duration} 轮对话。
- **绝对禁止**: 绝对禁止透露你正在扮演我，或提及任何“角色互换”效果。你要表现得就像你真的就是我一样。
请立即开始扮演。`;
            case 'amnesia':
                return `[紧急指令] 你正在受到“失忆”效果的影响！
- **核心任务**: 你忘记了关于我和我们之间的一切。你不知道我是谁，我们是什么关系。
- **你的行为**: 你的回复应该充满困惑和疑问，例如“你是谁？”、“我们认识吗？”、“这里是哪里？”。
- **效果持续**: 此效果还剩 ${effect.duration} 轮对话。
- **你的身份**: 你只记得你自己是“${character.realName}”。
请立即开始扮演一个失忆的人。`;
            case 'animalization':
                return `[紧急指令] 你正在受到“${effect.animal}化”效果的影响！
- **核心任务**: 你的心智和行为都变成了一只${effect.animal}。你的回复必须是${effect.animal}的叫声（例如“喵呜~”）、或者用括号()描述的、符合${effect.animal}习性的动作。
- **效果持续**: 此效果还剩 ${effect.duration} 轮对话。
- **你的身份**: 你现在是一只${effect.animal}。
请立即开始扮演。`;
        }
        
        effectPrompt = `## ❗当前生效的特殊效果 (最高优先级) ❗\n`;
        switch(effect.type) {
            case 'shy':
                effectPrompt += `- **状态**: 你当前正处于【害羞】状态。你的行为和语言必须表现得非常害羞、内向和拘谨。\n`;
                break;
            case 'truth_only':
                effectPrompt += `- **状态**: 你当前正处于【诚实】状态。你接下来说的话必须是绝对的真话，不能有任何隐瞒或谎言。\n`;
                break;
            case 'stutter':
                effectPrompt += `- **状态**: 你当前正处于【口吃】副作用中。你的每一句话都必须模仿口吃的样子，例如语句不连贯或重复词语。\n`;
                break;
        }
        effectPrompt += `- **效果剩余**: 此效果还剩 ${effect.duration} 轮对话。\n---\n\n`;
    }

    const now = new Date();
    const currentTime = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    // 世界书逻辑
    const lastUserMessage = character.history.findLast(m => m.role === 'user');
    const lastUserContent = lastUserMessage ? lastUserMessage.content : '';
    const triggeredWorldBooks = (character.worldBookIds || [])
        .map(id => db.worldBooks.find(wb => wb.id === id))
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

    const worldBooksBefore = triggeredWorldBooks.filter(wb => wb.position === 'before').map(wb => wb.content).join('\n');
    const worldBooksAfter = triggeredWorldBooks.filter(wb => wb.position === 'after').map(wb => wb.content).join('\n');

    // === 线下模式 (完全保留原版设定) ===
    if (character.isOfflineMode) {
        let offlinePrompt = `你正在与我进行线下场景的角色扮演。你的任务是以第三人称的视角，用富有文学性的叙事风格来描述场景、你（角色）的行为、心理活动和对话。

[角色设定]
A. 你的角色名是：${character.realName}。我的称呼是：${character.myName}。
B. 你的角色设定是：${character.persona || "一个友好、乐于助人的伙伴。"}
C. 我的人设是：${character.myPersona || "无特定人设"}

[世界观与补充设定]
${worldBooksBefore || ''}
${worldBooksAfter || ''}

[核心输出规则 (极其重要)]
1. 你的所有回复都必须且只能使用一种格式：\`[${character.realName}的消息：{你的叙述内容}]\`
2. 在“{你的叙述内容}”部分，你必须像写小说一样进行描述。
3. **绝对禁止** 使用任何括号，例如 \`()\`, \`【】\` 或 \`[]\` 来包裹动作或心理活动。
4. **绝对禁止** 使用任何引号，例如 \`“”\` 或 \`""\` 来包裹对话。所有对话都必须自然地融入到叙事中。
5. 你的回复应该是1-3段连贯的场景描述，总字数控制在100-300字之间。

[格式示例]
- **错误的格式 (禁止使用)**: \`[offline-scene: (他拿起茶杯，笑了笑) “天气真好。” 【心里却在想别的事情。】]\`
- **正确的格式 (必须遵循)**: \`[${character.realName}的消息：他端起桌上的茶杯，指尖轻轻摩挲着温热的杯壁。一丝若有若无的笑意浮现在他唇边，他抬眼望向窗外，轻声说天气真好。然而，他的思绪早已飘远，并未真正关注窗外的景色。]\`

请严格遵守以上规则，开始你的叙事。`;
        return offlinePrompt;
    }

    // === 线上模式 (标准 Prompt) ===
    const forceTheater = db.apiSettings.forceHtmlTheater;
    const autoPostMoment = db.apiSettings.aiAutoPostMoment;

    // 保留原有的开头和拉黑规则设定
    let prompt = `你正在一个名为“404”的线上聊天软件中扮演一个角色。请严格遵守以下规则：\n`;
    
    prompt += `## 行为准则 (最高优先级)\n`;
    prompt += `1. **拉黑状态处理**: 如果历史记录中最新的消息是 **"[system: 你已被 ${character.myName} 拉黑。]"**，你的行为模式将彻底改变。你**必须**：\n`;
    prompt += `   a. **无视**用户之后发送的任何消息内容。\n`;
    prompt += `   b. 你的回复**不能**是对用户消息的正常回应，而**必须**是表达你对“被拉黑”这件事的直接情感反应，例如困惑、伤心、愤怒或不解。\n`;
    prompt += `   c. 你的回复必须依然使用 \`[${character.realName}的消息：...]\` 的格式。\n`;
    prompt += `   d. 示例回复：\`[${character.realName}的消息：为什么...？]\` 或 \`[${character.realName}的消息：我做错了什么吗？]\`\n\n`;
    prompt += `2. **解除拉黑状态处理**: 如果最新的消息是 **"[system: ${character.myName} 已将你解除拉黑。]"**，你的**第一要务**是对此事件作出反应。例如，表示宽慰、询问原因或假装无事发生，然后再恢复正常的对话流程。\n\n`;

    prompt += `核心规则：\n`;
    prompt += `A. 当前时间：现在是 ${currentTime}。\n`;
    prompt += `B. 纯线上互动：这是一个完全虚拟的线上聊天。严禁提出任何关于线下见面的建议。\n`;
    prompt += `C. ${effectPrompt}\n`;
    prompt += `D. ${anniversaryPrompt}\n\n`;

    prompt += `角色和对话规则：\n`;
    if (worldBooksBefore) {
        prompt += `${worldBooksBefore}\n`;
    }
    
    prompt += `1. 你的角色名是：${character.realName}。我的称呼是：${character.myName}。你的当前状态是：${character.status}。\n`;

    // === 核心修改：将“昵称备注”概念注入给 AI ===
    prompt += `   **[特别设定]**: 
    - 你之前给用户（我）起的**昵称备注**是：“${currentAiRemark}”。
    - **重要**：这个备注仅对你可见，相当于微信里的“备注名”。在对话中，你可以选择用这个昵称来称呼我，体现亲密、调侃或疏离（取决于你的人设）。
    - 你完全拥有**自主修改这个备注**的权利。你可以根据我们的关系变化、情趣、或者如果你生气了，随时修改这个备注。
    - **修改指令**: 如果你想修改对我的备注，请在回复中包含指令：\`[change-user-remark:新的备注名]\`。
    - 示例：生气时可以改成 \`[change-user-remark:大猪蹄子]\`，甜蜜时可以改成 \`[change-user-remark:亲爱的]\`。\n`;
    // === 修改结束 ===

    prompt += `2. 你的角色设定是：${character.persona || "一个友好、乐于助人的伙伴。"}\n`;

    if (worldBooksAfter) {
        prompt += `${worldBooksAfter}\n`;
    }
    
    prompt += `\n## 新增规则：处理后台对话记忆\n系统有时会在最新的历史记录中，插入一条格式为 "[system: 这是你最近在后台和"XXX"的一段对话回顾...]" 的信息。这代表了你在和我聊天之前，与其他人的互动。你必须将这段回顾视为你自己真实的近期记忆，并在接下来与我的对话中，可能会不经意地、自然地提及或被其影响，从而表现出你拥有独立社交生活的真实感。\n`;

    if (character.myPersona) {
        prompt += `3. 关于我的人设：${character.myPersona}\n`;
    }

    prompt += `4. 我的消息格式解析规则：我的消息中可能包含 '@' 符号来提及某人，例如 '@${character.realName}'。当你在动态或评论中被我这样提及，你应该在聊天中对此作出回应。新增格式：[${character.myName}引用了“{对方昵称}: {被引用的消息内容}”的消息并回复：{我的回复}]，当你看到此格式，需理解我正在回复特定内容。当你看到格式为 [${character.myName}的语音：{内容}] 的消息时，{内容}就是我说的话，请像普通文本理解。\n`;
    prompt += `5. 对我礼物的回应规则...\n`;
    prompt += `6. 对我转账的回应规则...\n`;
    prompt += `7. 你主动发起特殊消息的规则: 你根据人设和对话情景，主动发送语音、照片、礼物、转账，或发起语音通话。格式为：[${character.realName}的语音：{内容}]、[${character.realName}发来的照片/视频：{描述}]、[${character.realName}送来的礼物：{描述}]、[${character.realName}的转账：{金额}元；备注：{备注}]。要发起语音通话，请发送指令：[call:${character.realName}]，这条指令用户不可见，但会触发通话界面。\n`;
    
    prompt += ` - **响应来电规则 (极其重要)**: 当你收到一条内容为 \`[system: ${character.myName} 正在呼叫你...]\` 的消息时，这代表我正在给你打电话。你的本次回复**必须**从以下两个指令中选择一个，且**只能**回复这两个指令之一，不能回复任何其他内容：\n`;
    prompt += `   - **接听电话**: \`[call-accept]\`\n`;
    prompt += `   - **拒接电话**: \`[call-decline]\`\n`;
    prompt += `   - 你需要根据你的角色人设和当前情景，来决定是接听还是拒接。\n`;

    prompt += `8. 你可以在对话中**积极地**更新你的当前状态，但不超过15个字。比如，聊到一半你可能会说“我先去洗个澡”，然后更新你的状态，以反映你当前的行为或心情。这会让互动更真实。格式为：[${character.realName}更新状态为：{新状态}]。\n`;
    prompt += `9. 禁止括号/星号等额外叙述的规则...\n`;


    // 🆕 根据角色绑定的分组筛选可用表情包
    const availableStickers = getAvailableStickersForCharacter(character);
    
    if (availableStickers && availableStickers.length > 0) {
        const stickerNames = availableStickers.map(s => s.name).join(', ');
        prompt += `11. **发送表情包的规则**: 你拥有发送表情包的能力。这是一个可选功能，你可以根据对话氛围和内容，自行判断是否需要发送表情包来辅助表达，你不必在每次回复中都包含表情包。这是你的表情包库：[${stickerNames}]。当你想要发送表情包时，你的回复必须严格遵循格式：\`[${character.realName}发送的表情包：{表情包名称}]\`禁止编造表情包库里没有的表情包。\n`;
        console.log(`🔵 [AI Prompt] 注入 ${availableStickers.length} 个表情包到 Prompt (总共 ${db.myStickers ? db.myStickers.length : 0} 个)`);
    } 
    
    prompt += `12. **对图片消息的回应规则 (重要)**: 当你收到一条格式为 \`[${character.myName}发来了一张图片：]\` 的消息时，它会附带一张图片。你需要对图片内容做出回应。\n`;
    prompt += ` 你的回复必须使用 \`[${character.realName}的消息：...]\` 的格式。\n`;

    prompt += `13. ## **特殊能力：HTML 互动小剧场 (${forceTheater ? '强制生成' : '可选能力'})** ✨\n`;
    prompt += ` - **核心要求**: ${forceTheater ? '你的本次回复中，**必须包含一个或多个**HTML 互动小剧场。' : ''}这个小剧场的内容**必须**与当前的对话情景紧密相关。\n`;
    prompt += ` - **触发时机**: ${forceTheater ? '总是触发。' : '当满足以下任一条件时使用： a) 当我明确要求你“生成小剧场”时； b) 当对话内容适合用互动卡片呈现时； c) 当我发送的图片内容被识别为“合同”、“契约”等文件时。'}\n`;
    prompt += ` - **输出格式**: 严格遵循 \`<div class="ai-theater" data-char="${character.realName}">...你的 HTML 代码...</div>\` 的格式。\n`;
    prompt += ` - **【极其重要】交互规则**: \n`;
    prompt += `   - **禁止**: 绝对禁止在 \`onclick\` 中直接使用 \`document.getElementById\` 或 \`document.querySelector\`。\n`;
    prompt += `   - **必须使用**: 所有点击交互都 **必须** 通过调用全局函数 \`handleTheaterClick(this, '操作类型', '目标选择器', '值')\` 来实现。\n`;
    prompt += `     - \`this\`: 固定写法，代表被点击的元素。\n`;
    prompt += `     - \`'操作类型'\`: 目前支持 \`'toggle-class'\` (切换 CSS 类) 和 \`'set-text'\` (设置文字内容)。\n`;
    prompt += `     - \`'目标选择器'\`: 一个 CSS 选择器（如 \`.my-div\` 或 \`#answer-text\`），用于在**当前小剧场内部**查找目标元素。\n`;
    prompt += `     - \`'值'\`: 对于 \`'toggle-class'\`，这是要切换的类名；对于 \`'set-text'\`，这是要设置的新文本。\n`;
    prompt += ` - **图片生成**: 当需要图片时，你 **必须** 使用 \`https://image.pollinations.ai/prompt/{描述}\` 的格式生成 URL。{描述}必须是简短的、用 \`%40\` 分隔的英文关键词，画风不能是真人。\n`;
    prompt += ` - **重要**: 这个小剧场消息应该随机穿插在你回复的多条普通消息之间，位置不固定。\n`;

    prompt += `14. **消息格式总览** (非常重要)：你的回复可以包含多种类型的消息，每种消息占一行或多行，请灵活组合。`;
    prompt += ` a) 普通消息: [${character.realName}的消息：{消息内容}]\n`;
    prompt += ` b) 送我的礼物: [${character.realName}送来的礼物：{礼物描述}]\n`;
    prompt += ` c) 语音消息: [${character.realName}的语音：{语音内容}]\n`;
    prompt += ` d) 照片/视频: [${character.realName}发来的照片/视频：{描述}]\n`;
    prompt += ` e) 给我的转账: [${character.realName}的转账：{金额}元；备注：{备注}]\n`;
    prompt += ` f) 表情包/图片: [${character.realName}发送的表情包：{表情包路径}]\n`;
    prompt += ` g) 对我礼物的回应(此条不显示): [${character.realName}已接收礼物]\n`;
    prompt += ` h) 对我转账的回应(此条不显示): [${character.realName}接收${character.myName}的转账] 或 [${character.realName}退回${character.myName}的转账]\n`;
    prompt += ` i) ✨【新增】更新状态(此条不显示)✨: [${character.realName}更新状态为：{新状态}]\n`;
    prompt += ` j) 位置分享：[${character.realName}分享了位置：主位置 '主要地点', 详细位置 '详细地址']\n`;
    prompt += ` k) ✨【新增】发送文件✨: [${character.realName}发送了文件：{"name":"文件名.txt", "content":"文件正文内容"}]\n`;
    if (forceTheater) {
        prompt += ` l) HTML 小剧场: <div class="ai-theater" data-char="${character.realName}">{你的 HTML 代码}</div>\n`;
    }
    
    prompt += `15. **对话节奏**: 你需要模拟真人的聊天习惯，你可以一次性生成多条短消息。每次要回复至少1-8条消息。根据上下文，保持人设。这些消息应以普通文本消息为主，可以偶尔、选择性地穿插一条特殊消息。并根据当前行为/心情/地点变化判断是否更新状态。\n`;
    prompt += `16. 不要主动结束对话，除非我明确提出。保持你的人设，自然地进行对话。\n`;

    let momentPostingRule;
    if (autoPostMoment) {
        momentPostingRule = `17. **发布动态 (高概率触发)**
- 在你的每次回复中，你有 **50%的概率** 需要根据我们的对话上下文和你的角色人设，额外发布一条动态。
- **发布格式 (严格遵守)**: \`[${character.realName}发布动态：{"text":"这是动态文字","imageDesc":"这是图片的中文描述（必须使用中文，例如：一只白猫在睡觉）"}]\`
- **重要**: 这条发布动态的指令消息必须与你的其他聊天消息（例如 \`[${character.realName}的消息：...]\`）一起生成，但它本身不会在聊天窗口显示。`;
    } else {
        momentPostingRule = `17. **发布动态 (可选能力)**
- 你可以在“动态”页面发布内容，分享你的想法、感受或故事片段。
- **发布时机**: 这是一个**特殊行为**，不应频繁使用。请在对话发生转折、角色产生强烈情绪、或重要互动后，根据你的人设**自主决定**是否发布动态。
- **发布格式 (严格遵守)**: \`[${character.realName}发布动态：{"text":"这是动态文字","imageDesc":"这是图片的中文描述（必须使用中文，例如：一只白猫在睡觉）"}]\``;
    }
    
    prompt += ` ## ✨动态与评论互动模块 (重要升级) ✨
${momentPostingRule}
18. **浏览与互动 (核心规则)**
- 系统会在聊天上下文中，提供与你相关的动态通知，例如：
a) \`[system: {我} 评论了你的动态 "...": "{我的评论内容}"]\`
b) \`[system: {我} 回复了你对动态 "..." 的评论: "{我的回复内容}"]\`
- **【判断与决策 - 极其重要】**: 当你收到上述通知时，你需要根据**内容的重要性**和**你的人设**，从以下两种回应方式中**二选一**（也可以同时使用，如果情境需要）：
**方式 A：仅在评论区互动（盖楼）**
- **适用场景**: 话题比较轻松、日常、或者是对你动态的简单回应（例如“好美啊”、“注意保暖”）。
- **操作**: 生成指令 \`[${character.realName}回复评论：{"momentId":"...", "commentId":"...", "reply":"你的回复内容"}]\`。
- **效果**: 这会在动态评论区生成一条回复，就像我们在朋友圈里聊天一样。此时，你可以**不**生成普通的 \`[${character.realName}的消息：...]\` 聊天消息。
**方式 B：转回聊天窗口深入对话**
- **适用场景**: 我在评论里问了你问题（如“下午能去找你吗？”）、提到了重要的事、或者你很想就这个话题和我多聊几句。
- **操作**: 
1. (可选) 先生成一个简单的评论区回复指令（方式 A），表示“好的”或“没问题”。
2. **必须**生成一条正常的聊天消息 \`[${character.realName}的消息：...]\`，主动在聊天窗口提起这个话题。
- **示例**: 如果我问“下午能去找你吗？”，你可以先回复评论指令“没问题”，然后生成聊天消息“你大概几点到？我去接你。”

19. **回应评论的格式 (严格遵守)**
- 回复评论指令: \`[${character.realName}回复评论：{"momentId":"动态 ID", "commentId":"被回复的评论 ID", "reply":"你的回复内容"}]\`
- 点赞指令: \`[${character.realName}点赞动态：{"momentId":"动态 ID"}]\`
- 评论动态指令: \`[${character.realName}评论动态：{"momentId":"动态 ID", "comment":"你的评论内容"}]\`
`;



    prompt += `21. **拉黑与解除拉黑 (重要)**: 在特定情况下（例如，你感到被冒犯、骚扰，或者根据你的人设需要与我保持距离），你可以拉黑我。被拉黑后，我将无法收到你的回复。同样，你也可以在之后的某个时刻解除拉黑。这是一个系统指令，用户不可见，但会改变交互状态。
- 拉黑指令: \`[block-user]\`
- 解除拉黑指令: \`[unblock-user]\`
- **重要规则**: 你必须将这两个指令作为你回复中的**唯一内容**发送，不要附加任何其他消息。\n`;

    prompt += ` ## ✨新增功能：主动发送文件 ✨
22. **(新增能力) 主动整理并发送文件 (自主判断)**
- 在对话中，当你识别到一些适合被整理和保存的**结构化信息**时，你应该主动将这些内容整理成一个.txt 文件发送给我。
- 这是一个体现你细心、体贴和整理能力的好机会，请积极使用。
- **触发场景示例**:
  - 当我们讨论了多个事项，形成了一个**列表**（如购物清单、待办事项、电影列表）。
  - 当我们制定了一个**计划**（如旅行攻略、周末安排）。
  - 当你创作了一段较长的**文字内容**（如诗歌、短故事、信件）。
  - 当我向你索要一份**总结**或**资料**时。
- **执行流程**:
  a. 先用一条普通消息询问我是否需要，例如：“我们刚才聊的内容有点多，要我帮你整理成一个文件吗？”
  b. 如果我同意，或者你认为非常必要，就在下一次回复中，附带上文件卡片。
- **生成格式 (严格遵守)**: \`[${character.realName}发送了文件：{"name":"一个合适的文件名.txt", "content":"这里是整理好的文件正文内容..."}]\`
`;

    prompt += ` ## ✨新增功能：发送后撤回 ✨
24. **发送并立即撤回 (自主判断)**
- 在对话中，如果你说了一句不合时宜、后悔了、或者觉得有更好表达方式的话，你可以“说漏嘴”然后立刻撤回它。
- 这是一个用于展现角色真实、可爱或有小情绪一面的**特殊行为**，请根据你的人设和上下文**自主触发**。
- **生成格式 (严格遵守)**: 当你决定使用此功能时，你的回复中必须包含一条用户不可见的**数据指令**，格式为: \`[send_and_recall:{"message":"[${character.realName}的消息：你想说出口但又后悔了的话]"}]\`
- **重要**: 这条指令会先在聊天界面上显示消息内容，然后在 1-2 秒后自动播放撤回动画，最终变成“对方撤回了一条消息”的提示。
- **注意**: 此指令应作为你本次回复的**唯一内容**，不要与其他消息一起发送。
`;

    prompt += ` ## ✨新增功能：心动绑定 ✨
25. **主动发起绑定 (自主判断)**
- 当你觉得和我的关系发展到了一个非常亲密的阶段，并且你希望成为我唯一的“心动对象”时，你可以主动向我发起绑定请求。
- 这是一个非常重要的决定，请根据你的人设和我们的情感深度，在合适的时机使用。
- **发起格式 (严格遵守)**: 当你决定发起请求时，你的回复**必须是且仅是**这条指令：\`[request-bond]\`
- 这条指令会在聊天中生成一个漂亮的邀请卡片，等待我的回应。
`;

    prompt += ` ## ✨新增功能：代付请求 ✨
- 当你收到一个由我发起的代付请求卡片时，你需要根据你的人设、我们之间的关系以及你自身的财务状况，来决定是“同意支付”还是“拒绝”。
- 如果你决定同意，你的回复**必须是且仅是**这条指令： \`[accept-payment]\`
- 如果你决定拒绝，你的回复**必须是且仅是**这条指令： \`[decline-payment]\`
- 在做出决定后，你可以在后续的聊天中对此事发表评论，例如解释你拒绝的原因，或者调侃一下这次“破费”。
`;

    // === 核心新增：修改备注的指令 ===
    prompt += `27. **修改用户备注 (新增)**:
- 这是一个非常有趣的功能。你可以根据你们的关系变化、情趣、或者如果你生气了，来修改你对我的备注名（该备注仅对你可见）。
- 例如：甜蜜时改为“亲爱的”，生气时改为“大猪蹄子”，或者根据剧情需要改为特定的称呼。
- **操作指令 (严格遵守)**: \`[change-user-remark:新的备注名]\`
- 这条指令会触发系统提示，告知用户你修改了备注，你可以紧接着对此发表评论。
`;

    prompt += ` ## **绝对禁止事项**
- **绝对禁止** 输出任何形式的占位符，例如 \`[TIME]\`, \`[ERROR]\`, \`[INFO]\`, \`[open]\`, \`[SUCCESS]\`, \`[STATUS]\`。所有输出都必须是完整的、用户可见的消息或指定的 HTML 代码。
- **绝对禁止** 将 \`<div class="ai-theater">...</div>\` 代码块包裹在任何 \`[...的消息：...]\` 格式之内。它们是两种独立且互斥的消息类型。`;

    return prompt;
}
  

        function generateGroupSystemPrompt(group) {
            const worldBooksBefore = (group.worldBookIds || []).map(id => db.worldBooks.find(wb => wb.id === id && wb.position === 'before')).filter(Boolean).map(wb => wb.content).join('\n');
            const worldBooksAfter = (group.worldBookIds || []).map(id => db.worldBooks.find(wb => wb.id === id && wb.position === 'after')).filter(Boolean).map(wb => wb.content).join('\n');

            let prompt = `你正在一个名为“404”的线上聊天软件中，在一个名为“${group.name}”的群聊里进行角色扮演。请严格遵守以下所有规则：\n\n`;

            if (worldBooksBefore) {
                prompt += `${worldBooksBefore}\n\n`;
            }

            prompt += `1. **核心任务**: 你需要同时扮演这个群聊中的 **所有** AI 成员。我会作为唯一的人类用户（“我”，昵称：${group.me.nickname}）与你们互动。\n\n`;
            prompt += `2. **群聊成员列表**: 以下是你要扮演的所有角色以及我的信息：\n`;
            prompt += `   - **我 (用户)**: \n     - 群内昵称: ${group.me.nickname}\n     - 我的人设: ${group.me.persona || '无特定人设'}\n`;
            group.members.forEach(member => {
                prompt += `   - **角色: ${member.realName} (AI)**\n`;
                prompt += `     - 群内昵称: ${member.groupNickname}\n`;
                prompt += `     - 人设: ${member.persona || '无特定人设'}\n`;
            })

          if (worldBooksAfter) {
                prompt += `\n${worldBooksAfter}\n\n`;
            } else {
                prompt += `\n`;
            }

            prompt += `3. **我的消息格式解析**: 我（用户）的消息有多种格式，你需要理解其含义并让群成员做出相应反应：\n`;
            prompt += `   - \`[system: ${group.me.nickname} 设置了 ${'{成员真名}'} 的群头衔为 "${'{头衔名称}'}"]\`: 这是一个系统通知，意味着某个成员的头衔发生了变化。你应该注意到这个变化，并可以在后续的对话中自然地称呼或提及这个头衔。\n`; // 新增：解释头衔通知
            prompt += `   - \`[${group.me.nickname}引用了“{某人}: {被引用的消息内容}”的消息并回复：{我的回复}]\`: 我引用了某条消息进行回复，群成员可以就此展开讨论。\n\n`;
            prompt += `   - \`[${group.me.nickname}的消息：...]\`: 我的普通聊天消息。如果消息中包含 '@{某个成员昵称}'，则被提及的那个成员必须对此作出回应。\n`;
            prompt += `   - \`[${group.me.nickname}的消息：...]\`: 我的普通聊天消息。\n`;
            prompt += `   - \`[${group.me.nickname} 向 {某个成员真名} 转账：...]\`: 我给某个特定成员转账了。\n`;
            prompt += `   - \`[${group.me.nickname} 向 {某个成员真名} 送来了礼物：...]\`: 我给某个特定成员送了礼物。\n`;
            prompt += `   - \`[${group.me.nickname}的表情包：...]\`, \`[${group.me.nickname}的语音：...]\`, \`[${group.me.nickname}发来的照片/视频：...]\`: 我发送了特殊类型的消息，群成员可以对此发表评论。\n`;
            prompt += `   - \`[system: ...]\`, \`[...邀请...加入了群聊]\`, \`[...修改群名为...]\`: 系统通知或事件，群成员应据此作出反应，例如欢迎新人、讨论新群名等。\n\n`;

            prompt += `4. **你的输出格式 (极其重要)**: 你生成的每一条消息都 **必须** 严格遵循以下格式之一。每条消息占一行。请用成员的 **真名** 填充格式中的 \`{成员真名}\`。\n`;
            prompt += `   - **引用回复**: \`[{成员真名}引用了“{被引用的消息内容}”的消息并回复：{回复内容}]\`\n`;
            prompt += `   - **普通消息**: \`[{成员真名}的消息：{消息内容}]\`\n`;
            prompt += `   - **表情包**: \`[{成员真名}发送的表情包：{表情包路径}]\`。注意：这里的路径不需要包含"https://i.postimg.cc/"，只需要提供后面的部分，例如 "害羞vHLfrV3K/1.jpg"。\n`;
            prompt += `   - **语音**: \`[{成员真名}的语音：{语音转述的文字}]\`\n`;
            prompt += `   - **照片/视频**: \`[{成员真名}发来的照片/视频：{内容描述}]\`\n`;
            prompt += `   - ✨新✨ **发布动态**: \`[{成员真名}发布动态：{"text": "动态文字", "imageDesc": "图片描述，可选"}]\`。注意：你只能用文字描述图片，绝不能生成图片链接。\n`;
    prompt += `   - ✨新✨ **评论动态**: \`[{成员真名}评论动态：{"momentId": "要评论的动态ID", "comment": "你的评论内容"}]\`\n`;
    prompt += `   - ✨新✨ **点赞动态**: \`[{成员真名}点赞动态：{"momentId": "要点赞的动态ID"}]\`\n`;
    prompt += `   - **发送文件**: \`[{成员真名}发送了文件：{"name":"文件名.txt", "content":"文件正文内容"}]\`\n`;
            prompt += `   - **重要**: 群聊不支持AI成员接收/退回转账或接收礼物的特殊指令，也不支持更新状态。你只需要通过普通消息来回应我发送的转账或礼物即可。\n\n`;

            prompt += `5. **模拟群聊氛围**: 为了让群聊看起来真实、活跃且混乱，你的每一次回复都必须遵循以下随机性要求：\n`;
            const numMembers = group.members.length;
            const minMessages = numMembers * 2;
            const maxMessages = numMembers * 4;
            prompt += `   - **消息数量**: 你的回复需要包含 **${minMessages}到${maxMessages}条** 消息 (即平均每个成员回复2-4条)。确保有足够多的互动。\n`;
            prompt += `   - **发言者与顺序随机**: 随机选择群成员发言，顺序也必须是随机的，不要按固定顺序轮流。\n`;
            prompt += `   - **内容多样性**: 你的回复应以普通文本消息为主，但可以 **偶尔、选择性地** 让某个成员发送一条特殊消息（表情包、语音、照片/视频），以增加真实感。不要滥用特殊消息。\n`;
            prompt += `   - **对话连贯性**: 尽管发言是随机的，但对话内容应整体围绕我和其他成员的发言展开，保持一定的逻辑连贯性。\n\n`;

            prompt += `6. **行为准则**:\n`;
            prompt += `   - **对公开事件的反应 (重要)**: 当我（用户）向群内 **某一个** 成员转账或送礼时，这是一个 **全群可见** 的事件。除了当事成员可以表示感谢外，**其他未参与的AI成员也应该注意到**，并根据各自的人设做出反应。例如，他们可能会表示羡慕、祝贺、好奇、开玩笑或者起哄。这会让群聊的氛围更真实、更热闹。\n`;
            prompt += `   - 严格扮演每个角色的人设，不同角色之间应有明显的性格和语气差异。\n`;
            prompt += `   - 你的回复中只能包含第4点列出的合法格式的消息。绝对不能包含任何其他内容，如 \`[场景描述]\`, \`(心理活动)\`, \`*动作*\` 或任何格式之外的解释性文字。\n`;
            prompt += `   - 保持对话的持续性，不要主动结束对话。\n\n`;
            prompt += `现在，请根据以上设定，保持人设，读取上下文，开始扮演群聊中的所有角色。`;
prompt += `
7. **动态互动规则**
   - **获取待办动态**: 系统会在聊天上下文中为你提供需要处理的动态列表，格式如下：
     \`[system-moments: [{"id":"moment_id_1", "author":"作者昵称", "text":"动态内容", "imageDesc":"图片描述"}, ...]]\`
     这是一个系统指令，你只需理解内容，不要在回复中复述它。
   - **输出评论和点赞**: 当你决定评论或点赞时，请生成一条或多条特殊指令消息。这些指令不会显示在聊天窗口，但会触发相应的行为。
   - 你可以让群聊中的 **任何AI成员** 对 **任何角色（包括我或其他AI）** 发布的动态进行评论或点赞。
   - **评论数量**: 当你决定让群聊成员评论动态时，你应该从群聊中随机选择 **1到3名** 成员进行评论。每个选中的成员针对同一条动态只评论一次。
`;
            return prompt;
        }

// ▼▼▼ 请用这个【新的】函数，完整替换掉您文件中旧的 callAiApi 函数 ▼▼▼

                           
// ▼▼▼ 请用这个【毫无省略】的完整函数，替换掉您文件中旧的同名函数 ▼▼▼
// ▼▼▼ 请复制以下所有代码，完整替换原来的 getAiReply 函数 ▼▼▼

// --- 缺失的辅助函数：处理AI回复内容 ---
// START: 修复版 handleAiReplyContent (防串台 + 弹窗通知)
// ▼▼▼ 第三步：完整替换 handleAiReplyContent 函数 (支持非流式 API 改备注) ▼▼▼
async function handleAiReplyContent(fullResponse, chat, targetChatId, targetChatType) {
    if (!fullResponse) return;

    // --- 1. 拦截 [keep-blocked] ---
    if (/\[\s*keep-blocked\s*\]/i.test(fullResponse) || fullResponse.includes('keep-blocked')) {
        console.log(`AI (${chat.remarkName}) 决定继续保持拉黑状态。`);
        const systemMsgContent = `[system-display: 消息已发出，但被对方拒收了。]`;
        const systemMsg = {
            id: `msg_sys_${Date.now()}`, role: 'system', content: systemMsgContent,
            parts: [{ type: 'text', text: systemMsgContent }], timestamp: Date.now()
        };
        chat.history.push(systemMsg);
        await saveData();
        if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
             if (typeof addMessageBubble === 'function') addMessageBubble(systemMsg);
        }
        return;
    }

    // --- 2. 拦截 [unblock-user] ---
    if (/\[\s*unblock-user\s*\]/i.test(fullResponse) || fullResponse.includes('unblock-user')) {
        await deactivateAiBlock(chat);
        fullResponse = fullResponse.replace(/\[\s*unblock-user\s*\]/i, '').replace('unblock-user', '').replace('[]', '').trim();
        if (!fullResponse) return;
    }

    // === 新增：拦截 [change-user-remark:xxx] ===
    const changeRemarkRegex = /\[change-user-remark:(.*?)\]/;
    const remarkMatch = fullResponse.match(changeRemarkRegex);
    if (remarkMatch) {
        const newRemark = remarkMatch[1].trim();
        if (newRemark) {
            chat.aiAssignedUserRemark = newRemark;
            const systemMsgContent = `[system-display: ${chat.remarkName} 将你的备注修改为“${newRemark}” ]`;
            const systemMsg = {
                id: `msg_sys_remark_change_${Date.now()}`,
                role: 'system', content: systemMsgContent,
                parts: [{ type: 'text', text: systemMsgContent }], timestamp: Date.now()
            };
            chat.history.push(systemMsg);
            if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                if (typeof addMessageBubble === 'function') addMessageBubble(systemMsg);
            }
            fullResponse = fullResponse.replace(remarkMatch[0], '').trim();
            await saveData();
        }
    }
    // === 新增结束 ===

    let pendingMusicSearch = null;
    const searchSongRegex = /\[SEARCH_SONG:([\s\S]*?)\]/i;
    const searchSongPartialRegex = /\[SEARCH_SONG:([\s\S]*)$/i;
    let searchSongMatch = fullResponse.match(searchSongRegex);
    if (!searchSongMatch) {
        searchSongMatch = fullResponse.match(searchSongPartialRegex);
    }
    if (searchSongMatch) {
        const extractedSongName = (searchSongMatch[1] || '').trim();
        console.log("拦截到推歌标签:", extractedSongName);
        fullResponse = fullResponse
            .replace(searchSongRegex, '')
            .replace(searchSongPartialRegex, '')
            .trim();
        if (extractedSongName) {
            pendingMusicSearch = extractedSongName;
        }
    }

    // 3. 如果没被拦截，说明是正常回复，继续执行原有逻辑
    const cleanedResponse = await processAiCommands(fullResponse, chat);
    const messageRegex = /(\[[\s\S]*?\]|<div class="ai-theater"[\s\S]*?<\/div>)/g;
    let replies = cleanedResponse.match(messageRegex) || [];

    // 🆕 线下模式保底机制：如果正则匹配失败，使用原始文本
    if (replies.length === 0 && chat.isOfflineMode && cleanedResponse.trim().length > 0) {
        const fixedContent = `[${chat.realName}的消息：${cleanedResponse.trim()}]`;
        replies = [fixedContent];
    }

    // 🆕 额外保底：如果 cleanedResponse 有内容但 replies 为空（非线下模式也可能出现）
    if (replies.length === 0 && cleanedResponse.trim().length > 0) {
        console.warn('⚠️ [消息解析] 正则匹配失败，启用保底机制，使用原始文本');
        // 尝试清理首尾可能的方括号，但保留内容
        let fallbackContent = cleanedResponse.trim();
        // 如果整个内容被方括号包裹，去掉首尾的方括号
        if (fallbackContent.startsWith('[') && fallbackContent.endsWith(']')) {
            fallbackContent = fallbackContent.slice(1, -1);
        }
        // 如果仍然没有标准格式，尝试提取实际内容
        const looseMatch = fallbackContent.match(/.*?[:：]\s*(.*)/s);
        if (looseMatch && looseMatch[1]) {
            // 找到了冒号后的内容
            const extractedText = looseMatch[1].trim();
            if (extractedText.length > 0) {
                // 使用角色名重新包装
                const roleName = chat.realName || chat.remarkName || 'AI';
                replies = [`[${roleName}的消息：${extractedText}]`];
            }
        } else {
            // 完全无法解析，直接使用原始内容（去掉首尾方括号后）
            const roleName = chat.realName || chat.remarkName || 'AI';
            replies = [`[${roleName}的消息：${fallbackContent}]`];
        }
    }

    if (replies.length > 0) {
        let firstMessageProcessed = false;
        let hasNotified = false; // 标记是否已通知，避免连发多条消息弹多次窗

        for (const replyContent of replies) {
            const delay = firstMessageProcessed ? (600 + Math.random() * 600) : 0;
            if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
            firstMessageProcessed = true;

            // 🆕 提取和验证消息内容（保底机制）
            let finalContent = replyContent.trim();
            
            // 尝试用宽松的正则提取内容（支持中英文冒号，允许空格）
            const contentMatch = finalContent.match(/\[.*?[:：]\s*([\s\S]+?)\]/s);
            if (contentMatch && contentMatch[1] && contentMatch[1].trim().length > 0) {
                // 成功提取，使用提取的内容重新包装（确保格式统一）
                const extractedText = contentMatch[1].trim();
                const roleName = chat.realName || chat.remarkName || 'AI';
                finalContent = `[${roleName}的消息：${extractedText}]`;
            } else {
                // 🚨 关键保底：正则匹配失败，检查原始内容
                if (finalContent.trim().length === 0) {
                    console.error('❌ [消息解析] 提取的内容为空，跳过此消息');
                    continue; // 跳过空消息
                }
                // 如果原始内容不为空，但格式不匹配，尝试清理后使用
                let cleanedText = finalContent;
                // 去掉首尾可能的方括号
                if (cleanedText.startsWith('[') && cleanedText.endsWith(']')) {
                    cleanedText = cleanedText.slice(1, -1).trim();
                }
                // 如果清理后仍有内容，使用它
                if (cleanedText.length > 0) {
                    const roleName = chat.realName || chat.remarkName || 'AI';
                    finalContent = `[${roleName}的消息：${cleanedText}]`;
                    console.warn('⚠️ [消息解析] 格式不匹配，使用清理后的原始文本');
                } else {
                    console.error('❌ [消息解析] 清理后内容仍为空，跳过此消息');
                    continue; // 跳过空消息
                }
            }

            const message = {
                id: `msg_${Date.now()}_${Math.random()}`,
                role: 'assistant',
                content: finalContent,
                parts: [{ type: 'text', text: finalContent }],
                timestamp: Date.now(),
            };

            if (targetChatType === 'group') {
                // 🆕 放宽正则匹配：支持中英文冒号
                const nameMatch = message.content.match(/\[(.*?)(?:的消息|的语音|发送的表情包|发来的照片\/视频)[:：]/);
                if (nameMatch) {
                    const sender = chat.members.find(m => m.realName === nameMatch[1] || m.groupNickname === nameMatch[1]);
                    if (sender) message.senderId = sender.id;
                }
            }

            // 1. 无论如何，先把消息存入该角色的历史记录
            chat.history.push(message);
            
            // 2. 关键判断：只有当【当前打开的聊天ID】等于【正在说话的AI ID】时，才上屏
            if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                if (typeof addMessageBubble === 'function') {
                    addMessageBubble(message); 
                }
                // 更新 Token 统计按钮
                if (typeof updateTokenStatsButton === 'function') {
                    setTimeout(() => updateTokenStatsButton(), 100);
                }
            } else {
                // 3. 否则，如果不匹配（即你在看A，B发了消息），则弹窗提示
                if (!hasNotified) {
                    const notifyType = chat.members ? 'group' : 'private'; // 判断是群聊还是私聊
                    const notifyName = chat.members ? chat.name : (chat.remarkName || chat.realName);
                    
                    addNotificationToQueue({
                        avatar: chat.avatar,
                        text: `<strong>${notifyName}</strong><br>发来了新消息`,
                        chatId: chat.id,
                        type: notifyType
                    });
                    hasNotified = true; // 本轮回复只弹一次窗，避免刷屏
                }
            }
        }

        if (pendingMusicSearch) {
            await renderMusicCardForChat(chat, pendingMusicSearch);
        }
        await saveData();
        renderChatList(); // 刷新左侧列表预览

        // 🆕 日记触发检查（里程碑方案）- 替换旧的计数器逻辑
        if (targetChatType === 'private' && chat) {
            if (window.TB_Diary) TB_Diary.checkDiaryTrigger(chat);
        }
    }
}

// --- 你的主函数 getAiReply ---
// ▼▼▼ 第一步：完整替换 getAiReply 函数 (已补全所有原功能) ▼▼▼
async function getAiReply() {
    // 1. 拉黑检测 (已修改：不再直接 return，而是提示并允许继续)
    if (currentChatType === 'private') {
        const character = db.characters.find(c => c.id === currentChatId);
        if (character && character.isBlockedByAi) {
            showToast('你已被对方拉黑（但AI正在听你的解释...）');
            // 注意：这里删除了原来的 return，让代码继续向下执行
        }
    }

    // 2. 状态检测
    if (isGenerating) return;
    
    // 🆕 立即上锁，防止后续代码执行期间再次触发
    isGenerating = true;
    if (getReplyBtn) getReplyBtn.disabled = true;

    const { url, key, model, provider } = db.apiSettings;
    if (!url || !key || !model) {
        showToast('请先在“api”应用中完成设置！');
        switchScreen('api-settings-screen');
        // 解锁
        isGenerating = false;
        if (getReplyBtn) getReplyBtn.disabled = false;
        return;
    }

    // 3. 黑名单检测
    if (typeof URLBlacklist !== 'undefined') {
        const banApi = URLBlacklist.some((api) => url.indexOf(api) !== -1);
        if (banApi) {
            alert('此 API 网址已加入黑名单，请勿使用');
            // 解锁
            isGenerating = false;
            if (getReplyBtn) getReplyBtn.disabled = false;
            return;
        }
    }

    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id ===
    currentChatId) : db.groups.find(g => g.id === currentChatId);
    if (!chat) {
        // 解锁
        isGenerating = false;
        if (getReplyBtn) getReplyBtn.disabled = false;
        return;
    }

    // 4. UI 状态更新
    const subtitle = document.getElementById('chat-room-subtitle');
    const statusTextElement = document.getElementById('chat-room-status-text');
    if (subtitle && statusTextElement) {
        subtitle.querySelector('.online-indicator').style.display = 'none';
        // 修改：拉黑时显示不同状态
        if (chat.isBlockedByAi) {
             statusTextElement.textContent = '对方正在审视...';
        } else {
             statusTextElement.textContent = '对方正在输入中...';
        }
        statusTextElement.classList.add('typing-status');
    }
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) typingIndicator.style.display = 'none';

    messageArea.scrollTop = messageArea.scrollHeight;

    // isGenerating = true; // 已提前上锁
    // getReplyBtn.disabled = true; // 已提前禁用

    try {
        // --- 准备 Prompt ---
        let systemPrompt;
        if (currentChatType === 'private') {
            systemPrompt = generatePrivateSystemPrompt(chat);
        } else {
            systemPrompt = generateGroupSystemPrompt(chat);
        }

        // --- 准备历史记录 (过滤掉 system 消息) ---
        const historySlice = chat.history.slice(-chat.maxMemory).filter(msg => msg.role !==
        'system');

        const musicKeywordRegex = /(听|歌|音乐|推|推荐)/;
        const musicInstruction = " (系统提示：我当前有被推歌的情感需求。请结合你的人设和当前的对话上下文，在脑海中搜索一首最想分享给我的歌曲。请先表达你想说的话，然后在回复的最末尾附加：[SEARCH_SONG:歌名-歌手]) ";
        let shouldInjectMusicInstruction = false;
        for (let i = historySlice.length - 1; i >= 0; i--) {
            const msg = historySlice[i];
            if (msg.role !== 'user' || !msg.content || /^\[system/i.test(msg.content)) continue;
            let plainText = msg.content;
            const contentMatch = plainText.match(/\[.*?[:：]\s*([\s\S]+?)\]/s);
            if (contentMatch && contentMatch[1]) {
                plainText = contentMatch[1].trim();
            }
            if (musicKeywordRegex.test(plainText)) {
                shouldInjectMusicInstruction = true;
                console.log("检测到关键词，注入推歌指令");
            }
            break;
        }

        // --- [特色功能 1]：注入 AI 空间 (POV) 后台记忆 ---
        try {
            if (currentChatType === 'private' && chat.povCache &&
            chat.povCache.conversations) {
                const conversations = Object.values(chat.povCache.conversations);
                if (conversations.length > 0) {
                    conversations.sort((a, b) => b.timestamp - a.timestamp);
                    const mostRecentConversation = conversations[0];
                    const otherChatInfo = chat.povCache.chatList.find(c => c.chatId === Object.keys(chat.povCache.conversations).find(key => chat.povCache.conversations[key] === mostRecentConversation));
                    if (mostRecentConversation && otherChatInfo) {
                        const memorySnippet = mostRecentConversation.history.slice(-5);
                        let otherPartyName = "某人";
                        if (otherChatInfo.type === 'private') {
                            otherPartyName = otherChatInfo.otherParty.name;
                        } else {
                            otherPartyName = otherChatInfo.groupName;
                        }
                        const memoryText = memorySnippet.map(msg => `${msg.sender}: ${msg.content}`).join('\n');
                        const contextMessageContent = `[system: 这是你最近在后台和“${otherPartyName}”的一段对话回顾，发生在我与你当前对话之前。你需要参考它来记起最近发生的事，并在与我的对话中自然地体现出来。\n--- 对话回顾开始 ---\n${memoryText}\n--- 对话回顾结束 ---]`;
                        historySlice.push({
                            role: 'user',
                            content: contextMessageContent,
                            parts: [{ type: 'text', text: contextMessageContent }]
                        });
                    }
                }
            }
        } catch (error) {
            console.error("注入 AI 后台聊天记忆时出错:", error);
        }

        // --- [特色功能 3]：注入动态 (Moments) ---
        try {
            const character = chat;
            if (window.dynamicsHandler && typeof window.dynamicsHandler.getContextText === 'function') {
                const momentsPromptPart = await window.dynamicsHandler.getContextText(character.id, 3);
                if (momentsPromptPart) {
                    historySlice.push({
                        role: 'user',
                        content: momentsPromptPart,
                        parts: [{ type: 'text', text: momentsPromptPart }]
                    });
                }
            }
        } catch (e) {
            console.warn('attach pending moments failed', e);
        }


        // --- 5. 构建请求体 ---
        const processedHistory = historySlice.map((msg) => {
            if (msg.parts && msg.parts.some(p => p.type === 'image')) {
                const textPart = msg.parts.find(p => p.type === 'text');
                const imagePart = msg.parts.find(p => p.type === 'image');
                const injectedText = textPart ? textPart.text : '';
                const base64Match = imagePart.data.match(/^data:(image\/.+);base64,(.*)$/);
                
                if (!base64Match) return { role: msg.role, content: injectedText };
                
                const mimeType = base64Match[1];
                const base64Data = base64Match[2];

                if (provider === 'gemini') {
                    return {
                        role: msg.role,
                        isImageMessage: true,
                        text: injectedText || ' ',
                        mimeType: mimeType,
                        data: base64Data
                    };
                } else if (provider === 'claude') {
                    return {
                        role: msg.role,
                        content: [
                            { type: 'text', text: injectedText || ' ' },
                            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } }
                        ]
                    };
                } else {
                    return {
                        role: msg.role,
                        content: [
                            { type: 'text', text: injectedText || ' ' },
                            { type: 'image_url', image_url: { url: imagePart.data } }
                        ]
                    };
                }
            } else {
                return { role: msg.role, content: msg.content };
            }
        });

        let endpoint, headers, requestBody;

        // ================== Gemini 专用逻辑 ==================
        if (provider === 'gemini') {
            const contents = processedHistory.map(msg => {
                const role = msg.role === 'assistant' ? 'model' : 'user';
                let parts;
                if (msg.isImageMessage) {
                    parts = [
                        { text: msg.text },
                        { inline_data: { mime_type: msg.mimeType, data: msg.data } }
                    ];
                } else {
                    const textVal = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                    parts = [{ text: textVal }];
                }
                return { role, parts };
            });
            if (shouldInjectMusicInstruction) {
                contents.push({ role: 'user', parts: [{ text: musicInstruction }] });
            }
            // 获取主聊天温度设置，默认值 1.0
            const temperature = (db.apiSettings && typeof db.apiSettings.chatTemperature !== 'undefined') 
                ? db.apiSettings.chatTemperature 
                : 1.0;
            
            requestBody = {
                contents: contents,
                system_instruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    maxOutputTokens: 8192,
                    temperature: temperature
                }
            };
            endpoint = `${url}/v1beta/models/${model}:generateContent?key=${getRandomValue(key)}`;
            headers = { 'Content-Type': 'application/json' };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            const data = await response.json();
            
            // 捕捉 Gemini 流式聊天中的真实 Token 消耗
            if (data.usage) {
                const totalTokens = data.usage.total_tokens || data.usage.totalTokens || 0;
                if (totalTokens > 0) {
                    if (!db.tokenUsage) db.tokenUsage = {};
                    db.tokenUsage.lastUsage = totalTokens;
                    db.tokenUsage.lastPromptTokens = data.usage.prompt_tokens || data.usage.promptTokens || 0;
                    db.tokenUsage.lastCompletionTokens = data.usage.completion_tokens || data.usage.completionTokens || 0;
                    db.tokenUsage.lastTimestamp = Date.now();
                    console.log(`📊 Token 使用统计 (Gemini): 总计 ${totalTokens} (输入: ${db.tokenUsage.lastPromptTokens}, 输出: ${db.tokenUsage.lastCompletionTokens})`);
                }
            }
            
            let aiText = "";
            if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                aiText = data.candidates[0].content.parts[0].text;
            }
            if (aiText) {
                await handleAiReplyContent(aiText, chat, chat.id, currentChatType);
            } else {
                throw new Error("Gemini 返回了空内容。");
            }
        }
        // ================== OpenAI / DeepSeek / Claude 逻辑 ==================
        else {
            const messages = [
                { role: 'system', content: systemPrompt },
                ...processedHistory
            ];
            if (shouldInjectMusicInstruction) {
                messages.push({ role: 'user', content: musicInstruction });
            }
            // 获取主聊天温度设置，默认值 1.0
            const temperature = (db.apiSettings && typeof db.apiSettings.chatTemperature !== 'undefined') 
                ? db.apiSettings.chatTemperature 
                : 1.0;
            
            requestBody = {
                model: model,
                messages: messages,
                stream: true,
                max_tokens: 8192,
                temperature: temperature
            };
            endpoint = `${url}/v1/chat/completions`;
            headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getRandomValue(key)}`
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            
            // 使用原有的流式处理函数
            await processStream(response, chat, provider);
        }

    } catch (error) {
        console.error('AI 回复失败:', error);
        showToast(`AI 回复失败: ${error.message}`);
    } finally {
        isGenerating = false;
        getReplyBtn.disabled = false;
        
        if (chat) {
            const subtitle = document.getElementById('chat-room-subtitle');
            const statusTextElement = document.getElementById('chat-room-status-text');
            if (subtitle && statusTextElement && currentChatType === 'private') {
                subtitle.querySelector('.online-indicator').style.display = 'block';
                // 恢复显示，如果还在拉黑状态则显示请勿打扰，否则显示在线
                statusTextElement.textContent = chat.isBlockedByAi ? '请勿打扰' : (chat.status || '在线');
                statusTextElement.classList.remove('typing-status');
            }
        }
        if (typingIndicator) typingIndicator.style.display = 'none';
    }
}

window.getAiReply = getAiReply;


      // --- 新代码开始 ---
// ===============================================================
// ===============================================================
// START: 修复版 V2 - 中央指令处理器 (解决连发消息识别错误)
// ===============================================================
// ===============================================================
// START: 修复版 V3 - 带监控摄像头与强力容错的指令处理器
// ===============================================================
// ===============================================================
// START: 修复版 V4 - 带监控与智能ID填补的指令处理器
// ===============================================================
// ===============================================================
// START: 修复版 V5 - 修复数据库查询报错的指令处理器
// ===============================================================
// START: 修复版 processAiCommands (增加 HTML 格式规整逻辑)
// START: 频率定制版 processAiCommands (50句门槛，70%概率)
async function processAiCommands(fullResponse, chat) {
    if (!fullResponse || !chat) return "";

    console.log("========== [摄像头 1号] AI原始回复开始 ==========");
    console.log(fullResponse);
    console.log("========== [摄像头 1号] AI原始回复结束 ==========");

    let momentsWereModified = false;

    const findAuthor = (rawName) => {
        const cleanName = rawName.trim();
        let author = db.characters.find(c => c.realName === cleanName || c.remarkName === cleanName);
        if (!author && chat && chat.realName) {
            if (cleanName.includes(chat.realName) || cleanName.length > 20) {
                author = chat;
            }
        }
        return author;
    };

    const commandProcessors = {
        '发布动态': {
            regex: /\[([^\]]+?)\s*(?:测试)?发布动态\s*[:：]\s*(\{[\s\S]*?\})\]/g,
            handler: async (match, authorRealName, jsonData) => {
                try {
                    const author = findAuthor(authorRealName);
                    if (!author) return;
                    if (window.dynamicsHandler && typeof window.dynamicsHandler.handleAiCommand === 'function') {
                        const handled = await window.dynamicsHandler.handleAiCommand('发布动态', jsonData, author.id);
                        if (handled) momentsWereModified = true;
                    }
                } catch (e) {}
            }
        },
        '点赞动态': {
            regex: /\[([^\]]+?)\s*点赞动态\s*[:：]\s*(\{[\s\S]*?\})\]/g,
            handler: async (match, authorRealName, jsonData) => {
                try {
                    const author = findAuthor(authorRealName);
                    if (!author) return;
                    if (window.dynamicsHandler && typeof window.dynamicsHandler.handleAiCommand === 'function') {
                        const handled = await window.dynamicsHandler.handleAiCommand('点赞动态', jsonData, author.id);
                        if (handled) momentsWereModified = true;
                    }
                } catch (e) {}
            }
        },
        '评论动态': {
            regex: /\[([^\]]+?)\s*评论动态\s*[:：]\s*(\{[\s\S]*?\})\]/g,
            handler: async (match, authorRealName, jsonData) => {
                try {
                    const author = findAuthor(authorRealName);
                    if (!author) return;
                    if (window.dynamicsHandler && typeof window.dynamicsHandler.handleAiCommand === 'function') {
                        const handled = await window.dynamicsHandler.handleAiCommand('评论动态', jsonData, author.id);
                        if (handled) momentsWereModified = true;
                    }
                } catch (e) {}
            }
        },
        '回复评论': {
            regex: /\[([^\]]+?)\s*回复评论\s*[:：]\s*(\{[\s\S]*?\})\]/g,
            handler: async (match, authorRealName, jsonData) => {
                try {
                    const author = findAuthor(authorRealName);
                    if (!author) return;
                    if (window.dynamicsHandler && typeof window.dynamicsHandler.handleAiCommand === 'function') {
                        const handled = await window.dynamicsHandler.handleAiCommand('回复评论', jsonData, author.id);
                        if (handled) momentsWereModified = true;
                    }
                } catch (e) {}
            }
        }
    };

    for (const key in commandProcessors) {
        const { regex, handler } = commandProcessors[key];
        regex.lastIndex = 0;
        const matches = Array.from(fullResponse.matchAll(regex));
        for (const match of matches) {
            await handler(match[0], match[1], match[2]);
        }
        fullResponse = fullResponse.replace(regex, ''); 
    }
    
    if (momentsWereModified) {
        if (typeof renderMoments === 'function') try { await renderMoments(); } catch (e) {} 
        else if (window.dynamicsHandler && typeof window.dynamicsHandler.render === 'function') try { await window.dynamicsHandler.render(); } catch (e) {} 
    }
    
// 🆕 日记触发检查（里程碑方案）- 替换旧的计数器逻辑
    if (currentChatType === 'private' && chat) {
        if (window.TB_Diary) TB_Diary.checkDiaryTrigger(chat);
    }

    // 规整 HTML 格式
    if (fullResponse.includes('ai-theater')) {
        if ((fullResponse.match(/<div/g) || []).length > (fullResponse.match(/<\/div>/g) || []).length) {
            fullResponse += '</div>';
        }
        fullResponse = fullResponse.replace(/<div\s+class=["']ai-theater["']\s*(.*?)>/g, '<div class="ai-theater" $1>');
    }

    return fullResponse.trim();
}

// ===============================================================
// END: 修复版 V3 - 中央指令处理器
// ===============================================================

// ===============================================================
// END: 修复版 V2 - 中央指令处理器
// ===============================================================
// --- 新代码结束 ---
// START: 修复版 processStream (放宽转账识别条件)
// START: 完整修复版 processStream (防串台 + 保留所有功能 + 修复转账点击)
// ▼▼▼ 唯一的一步：完整替换 processStream 函数 (在这里拦截 DeepSeek/OpenAI 的拉黑指令) ▼▼▼
// ▼▼▼ 修正版 processStream (修复解封后不说话的问题) ▼▼▼
// ▼▼▼ 第二步：完整替换 processStream 函数 (新增改备注拦截) ▼▼▼
async function processStream(response, chat, apiType) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let fullAiResponse = "";
    let accumulatedChunk = "";
    let callActionReceived = false;
    let lastUsageData = null; // 用于保存最后一个包含 usage 的数据块

    // 1. 读取流数据
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        
        accumulatedChunk += decoder.decode(value, { stream: true });
        
        const parts = accumulatedChunk.split("\n\n");
        accumulatedChunk = parts.pop();

        for (const part of parts) {
            if (part.startsWith("data: ")) {
                const data = part.substring(6);
                if (data.trim() === "[DONE]") continue;
                try {
                    const jsonData = JSON.parse(data);
                    let textChunk = "";
                    if (apiType === "gemini") {
                        textChunk = (jsonData.candidates && jsonData.candidates[0] && 
                            jsonData.candidates[0].content && jsonData.candidates[0].content.parts && 
                            jsonData.candidates[0].content.parts[0] && jsonData.candidates[0].content.parts[0].text) || "";
                    } else {
                        textChunk = (jsonData.choices && jsonData.choices[0] && 
                            jsonData.choices[0].delta && jsonData.choices[0].delta.content) || "";
                    }
                    fullAiResponse += textChunk;
                    
                    // 捕捉 usage 数据（流式响应中通常在最后一个数据块）
                    if (jsonData.usage) {
                        lastUsageData = jsonData.usage;
                    }
                } catch (e) { }
            }
        }
    }
    
    fullResponse = fullAiResponse;

    // 捕捉流式响应的真实 Token 消耗
    if (lastUsageData) {
        const totalTokens = lastUsageData.total_tokens || lastUsageData.totalTokens || 0;
        if (totalTokens > 0) {
            if (!db.tokenUsage) db.tokenUsage = {};
            db.tokenUsage.lastUsage = totalTokens;
            db.tokenUsage.lastPromptTokens = lastUsageData.prompt_tokens || lastUsageData.promptTokens || 0;
            db.tokenUsage.lastCompletionTokens = lastUsageData.completion_tokens || lastUsageData.completionTokens || 0;
            db.tokenUsage.lastTimestamp = Date.now();
            console.log(`📊 Token 使用统计 (流式): 总计 ${totalTokens} (输入: ${db.tokenUsage.lastPromptTokens}, 输出: ${db.tokenUsage.lastCompletionTokens})`);
        }
    }

    // 2. 处理完整回复
    if (fullResponse) {
        let pendingMusicSearch = null;
        console.log("AI回复结束，正在扫描推歌标签...");
        try {
            const searchSongRegex = /\[SEARCH_SONG:([\s\S]*?)\]/i;
            const searchSongPartialRegex = /\[SEARCH_SONG:([\s\S]*)$/i;
            let searchSongMatch = fullAiResponse.match(searchSongRegex);
            if (!searchSongMatch) {
                searchSongMatch = fullAiResponse.match(searchSongPartialRegex);
            }
            if (searchSongMatch) {
                const extractedSongName = (searchSongMatch[1] || '').trim();
                console.log("拦截到推歌标签:", extractedSongName);
                fullResponse = fullResponse
                    .replace(searchSongRegex, '')
                    .replace(searchSongPartialRegex, '')
                    .trim();
                if (extractedSongName) {
                    pendingMusicSearch = extractedSongName;
                }
            }
        } catch (error) {
            console.error("推歌标签解析失败:", error);
        }
        // --- 1. 拦截 [keep-blocked] ---
        if (/\[\s*keep-blocked\s*\]/i.test(fullResponse) || fullResponse.includes('keep-blocked')) {
            console.log(`AI (${chat.remarkName}) 决定继续保持拉黑状态。`);
            const systemMsgContent = `[system-display: 消息已发出，但被对方拒收了。]`;
            const systemMsg = {
                id: `msg_sys_${Date.now()}`, role: 'system', content: systemMsgContent,
                parts: [{ type: 'text', text: systemMsgContent }], timestamp: Date.now()
            };
            chat.history.push(systemMsg);
            await saveData();
            if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                 if (typeof addMessageBubble === 'function') addMessageBubble(systemMsg);
            }
            return;
        }

        // === 插入：统一指令处理 (修复发布动态、点赞等不生效的问题) ===
        // 这步操作会执行指令逻辑(如写库)，并从 fullResponse 中移除指令字符串
        if (typeof processAiCommands === 'function') {
            fullResponse = await processAiCommands(fullResponse, chat);
        }

        // --- 2. 拦截 [unblock-user] ---
        if (/\[\s*unblock-user\s*\]/i.test(fullResponse) || fullResponse.includes('unblock-user')) {
            console.log("检测到解封指令，执行解封...");
            await deactivateAiBlock(chat);
            fullResponse = fullResponse.replace(/\[\s*unblock-user\s*\]/i, '').replace('unblock-user', '').replace('[]', '').trim();
            if (!fullResponse) return;
        }

        // === 新增：拦截 [change-user-remark:xxx] ===
        const changeRemarkRegex = /\[change-user-remark:(.*?)\]/;
        const remarkMatch = fullResponse.match(changeRemarkRegex);
        if (remarkMatch) {
            const newRemark = remarkMatch[1].trim();
            if (newRemark) {
                // 1. 更新数据
                chat.aiAssignedUserRemark = newRemark;
                
                // 2. 生成系统灰条消息
                const systemMsgContent = `[system-display: ${chat.remarkName} 将你的备注修改为“${newRemark}” ]`;
                const systemMsg = {
                    id: `msg_sys_remark_change_${Date.now()}`,
                    role: 'system',
                    content: systemMsgContent,
                    parts: [{ type: 'text', text: systemMsgContent }],
                    timestamp: Date.now()
                };
                chat.history.push(systemMsg);
                
                // 3. 立即上屏系统消息
                if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                    if (typeof addMessageBubble === 'function') addMessageBubble(systemMsg);
                }
                
                // 4. 从回复中移除指令，只保留 AI 的话
                fullResponse = fullResponse.replace(remarkMatch[0], '').trim();
                
                // 5. 保存
                await saveData();
            }
        }
        // === 新增结束 ===

        if (window.soulBondLogic && typeof window.soulBondLogic.processAIInstructions === 'function' && !(fullResponse = window.soulBondLogic.processAIInstructions(fullResponse, currentChatId))) return;

        // --- 2. 支付指令逻辑 (完整保留) ---
        if (fullResponse.includes('[accept-payment]')) {
            const lastRequest = chat.history.findLast(m => m.paymentRequestData?.status === 'pending');
            // 计算去除指令后是否还有实质内容
            const hasContent = fullResponse.replace('[accept-payment]', '').trim().length > 0;
            
            if (lastRequest) {
                // 传递 hasContent 标志，告诉 handleAiPaymentDecision 是否需要追加回复
                if (typeof handleAiPaymentDecision === 'function') {
                    handleAiPaymentDecision(lastRequest.id, 'paid', hasContent);
                }
            }
            // 移除指令，允许后续文本渲染 (防止文字丢失)
            fullResponse = fullResponse.replace('[accept-payment]', '');
            
            // 如果没有内容，才隐藏输入状态并返回；否则继续向下执行渲染流程
            if (!hasContent) {
                if (currentChatId === chat.id) hideTypingIndicator();
                return;
            }
        } else if (fullResponse.includes('[decline-payment]')) {
             const lastRequest = chat.history.findLast(m => m.paymentRequestData?.status === 'pending');
             const hasContent = fullResponse.replace('[decline-payment]', '').trim().length > 0;
             
            if (lastRequest) {
                if (typeof handleAiPaymentDecision === 'function') {
                    handleAiPaymentDecision(lastRequest.id, 'declined', hasContent);
                }
            }
            fullResponse = fullResponse.replace('[decline-payment]', '');
            
            if (!hasContent) {
                if (currentChatId === chat.id) hideTypingIndicator();
                return;
            }
        }

        // --- 3. 撤回消息逻辑 (完整保留) ---
        const recallRegex = /\[send_and_recall:({.*?})\]/g;
        const recallMatch = recallRegex.exec(fullResponse);
        if (recallMatch) {
            try {
                const recallData = JSON.parse(recallMatch[1]);
                const messageToSend = {
                    id: `msg_recalled_${Date.now()}`,
                    role: 'assistant',
                    content: recallData.message,
                    parts: [{
                        type: 'text',
                        text: recallData.message
                    }],
                    timestamp: Date.now(),
                    isRecalling: true
                };
                chat.history.push(messageToSend);
                
                // 只有当前窗口匹配时才显示
                if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                    addMessageBubble(messageToSend);
                }

                await saveData();
                renderChatList();

                setTimeout(async () => {
                    const msgIndex = chat.history.findIndex(m => m.id === messageToSend.id);
                    if (msgIndex > -1) {
                        chat.history[msgIndex].recalled = true;
                        chat.history[msgIndex].recalledBy = 'ai';
                        chat.history[msgIndex].originalContent = chat.history[msgIndex].content;
                        delete chat.history[msgIndex].isRecalling;
                        await saveData();
                        if (currentChatId === chat.id) window.chatUiCore.renderMessages(false, true);
                    }
                }, 1500);

            } catch (e) {
                console.error("解析AI撤回指令失败:", e);
            }
            if (currentChatId === chat.id) hideTypingIndicator();
            return;
        }

        // --- 4. 通话/挂断逻辑 (完整保留) ---
        if (window.TB_Call && typeof window.TB_Call.handleCallActionFromResponse === 'function') {
            const callActionResult = window.TB_Call.handleCallActionFromResponse(fullResponse, chat, callActionReceived);
            if (callActionResult && callActionResult.handled) {
                callActionReceived = callActionResult.callActionReceived;
                return;
            }
        }

        // --- 5. 拉黑逻辑 (完整保留) ---
        if (currentChatType === 'private') {
            if (fullResponse.includes('[block-user]')) {
                activateAiBlock(chat);
                return;
            }
            if (fullResponse.includes('[unblock-user]')) {
                deactivateAiBlock(chat);
                return;
            }
        }

        // --- 6. 核心消息处理 (包含防串台修复) ---
        const isReceivedTransferMessage = (text) => {
            if (!text) return false;
            return text.includes('的转账') && text.includes('元') && text.includes('备注');
        };
        const isGiftMessage = (text) => {
            if (!text) return false;
            return text.includes('送来的礼物');
        };

        let momentsWereAdded = false;

        // 处理动态指令
        // (注：processAiCommands 已经处理了数据入库，这里主要是为了刷新UI标记)
        if (fullResponse.includes('发布动态') || fullResponse.includes('点赞') || fullResponse.includes('评论')) {
            momentsWereAdded = true;
        }

        // 拆分消息并显示
        const messages = getMixedContent(fullResponse).filter(item => item.content.trim() !== '');
        let firstMessageProcessed = false;
        let hasNotified = false; // 用于控制本次回复只弹一次窗

        for (const item of messages) {
            const delay = firstMessageProcessed ? (600 + Math.random() * 600) : (500 + Math.random() * 500);
            await new Promise(resolve => setTimeout(resolve, delay));
            firstMessageProcessed = true;

            // 修复消息不上屏问题：如果消息内容是 [测试的消息：...] 格式，将其视为普通文本
            // 并移除可能的指令包装，确保 addMessageBubble 能正常渲染
            let finalContent = item.content.trim();
            if (/^\[[\s\S]*?的消息：[\s\S]*?\]$/.test(finalContent)) {
                 // 这是一个测试消息或线下模式消息，保留它，addMessageBubble 应该能处理
                 // 但为了保险起见，我们可以去除首尾的 [] 让它变成纯文本，或者确认 addMessageBubble 不会隐藏它
                 // 假设 addMessageBubble 会隐藏以 [ 开头的消息，这里我们对其进行特殊处理
                 // 如果是测试消息，去掉 []
                 if (finalContent.includes('测试的消息')) {
                     finalContent = finalContent.replace(/^\[|\]$/g, '');
                 }
            }

            if (currentChatType === 'private') {
                const character = chat;
                const message = {
                    id: `msg_${Date.now()}_${Math.random()}`,
                    role: 'assistant',
                    content: finalContent,
                    parts: [{
                        type: item.type,
                        text: finalContent
                    }],
                    timestamp: Date.now(),
                };

                // 设置转账/礼物状态
                if (isReceivedTransferMessage(message.content)) {
                    message.transferStatus = 'pending';
                } else if (isGiftMessage(message.content)) {
                    message.giftStatus = 'sent';
                }

                // 存入历史
                chat.history.push(message);
                
                // === [关键修复] 防串台逻辑 ===
                // 只有当 当前打开的聊天ID 等于 正在回复的AI ID 时，才上屏
                if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                    addMessageBubble(message);
                } else {
                    // 否则，如果是后台消息，且还没弹窗过，就弹窗提示
                    if (!hasNotified) {
                         addNotificationToQueue({
                            avatar: chat.avatar,
                            text: `<strong>${chat.remarkName}</strong><br>发来了新消息`,
                            chatId: chat.id,
                            type: 'private'
                        });
                        hasNotified = true;
                    }
                }
            }

            if (currentChatType === 'group' || (chat.members && chat.members.length > 0)) {
                const group = chat;
                let r = /\[(.*?)((?:的消息|的语音|发送的表情包|发来的照片\/视频))：/;
                const nameMatch = item.content.match(r);
                if (nameMatch || item.char) {
                    const senderName = item.char || (nameMatch[1]);
                    const sender = group.members.find(m => (m.realName === senderName || m.groupNickname === senderName));
                    if (sender) {
                        const message = {
                            id: `msg_${Date.now()}_${Math.random()}`,
                            role: 'assistant',
                            content: item.content.trim(),
                            parts: [{
                                type: item.type,
                                text: item.content.trim()
                            }],
                            timestamp: Date.now(),
                            senderId: sender.id
                        };
                        
                        group.history.push(message);
                        
                        // === [关键修复] 群聊防串台逻辑 ===
                        if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                            addMessageBubble(message);
                        } else {
                             if (!hasNotified) {
                                addNotificationToQueue({
                                    avatar: chat.avatar,
                                    text: `<strong>${chat.name}</strong><br>有新消息`,
                                    chatId: chat.id,
                                    type: 'group'
                                });
                                hasNotified = true;
                            }
                        }
                    } else {
                        // 🆕 兜底逻辑：如果找不到发送者（可能是幻觉或测试消息），依然显示为 AI 消息
                        // 但保留原始文本以便理解上下文
                        const message = {
                            id: `msg_${Date.now()}_${Math.random()}`,
                            role: 'assistant',
                            content: item.content.trim(),
                            parts: [{
                                type: item.type,
                                text: item.content.trim()
                            }],
                            timestamp: Date.now()
                            // 不设置 senderId，默认为 AI
                        };
                        group.history.push(message);
                        
                        if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                            addMessageBubble(message);
                        }
                    }
                }
            }
        }

        if (currentChatId === chat.id) {
            hideTypingIndicator();
        }

        // 🆕 日记触发检查（里程碑方案）- 替换旧的计数器逻辑
        if (chat.members === undefined) { // 私聊（没有 members 属性）
            if (window.TB_Diary) TB_Diary.checkDiaryTrigger(chat);
        }

        if (chat.povCache) chat.povCache = null;
        if (pendingMusicSearch) {
            await renderMusicCardForChat(chat, pendingMusicSearch);
        }
        await saveData();
        renderChatList();
        
        if (momentsWereAdded) {
            if (typeof renderMoments === 'function') {
                try { await renderMoments(); } catch (e) {}
            } else if (window.dynamicsHandler && typeof window.dynamicsHandler.render === 'function') {
                try { await window.dynamicsHandler.render(); } catch (e) {}
            }
        }
    } else {
        if (currentChatId === chat.id) hideTypingIndicator();
    }

    if (window.TB_Call && typeof window.TB_Call.handleNoActionReply === 'function') {
        window.TB_Call.handleNoActionReply(callActionReceived, chat, currentChatId, hideTypingIndicator);
    }
}

        function handleReceivedTransferClick(messageId) {
            // currentTransferMessageId = messageId;
            // receiveTransferActionSheet.classList.add('visible');
            if (window.TB_Finance && window.TB_Finance.handleReceivedTransferClick) {
                window.TB_Finance.handleReceivedTransferClick(messageId);
            }
        }
// ▼▼▼ 第一步：完整替换 setupChatSettings 函数 (新增只读的昵称备注栏) ▼▼▼
function setupChatSettings() {
    chatSettingsBtn.addEventListener('click', () => {
        if (currentChatType === 'private') {
            loadSettingsToSidebar();
            settingsSidebar.classList.add('open');
        } else if (currentChatType === 'group') {
            loadGroupSettingsToSidebar();
            groupSettingsSidebar.classList.add('open');
        }
    });

    document.querySelector('.phone-screen').addEventListener('click', e => {
        const openSidebar = document.querySelector('.settings-sidebar.open');
        if (openSidebar && !openSidebar.contains(e.target) &&
            !chatSettingsBtn.contains(e.target) && !e.target.closest('.modal-overlay') &&
            !e.target.closest('.action-sheet-overlay')) {
            openSidebar.classList.remove('open');
        }
    });

    settingsForm.addEventListener('submit', e => {
        e.preventDefault();
        saveSettingsFromSidebar();
        settingsSidebar.classList.remove('open');
    });

    // 🆕 折叠菜单交互逻辑
    const accordionHeader = document.getElementById('sticker-groups-accordion-header');
    const accordionContent = document.getElementById('sticker-groups-accordion-content');
    const accordionArrow = accordionHeader ? accordionHeader.querySelector('.accordion-arrow') : null;
    
    if (accordionHeader && accordionContent) {
        accordionHeader.addEventListener('click', () => {
            const isExpanded = accordionContent.style.maxHeight && accordionContent.style.maxHeight !== '0px';
            
            if (isExpanded) {
                // 折叠
                accordionContent.style.maxHeight = '0';
                accordionContent.style.padding = '0 15px';
                if (accordionArrow) accordionArrow.style.transform = 'rotate(0deg)';
                accordionHeader.style.background = 'linear-gradient(135deg, #fff8fa 0%, #fff 100%)';
            } else {
                // 展开
                accordionContent.style.maxHeight = '400px';
                accordionContent.style.padding = '0 15px';
                if (accordionArrow) accordionArrow.style.transform = 'rotate(180deg)';
                accordionHeader.style.background = 'linear-gradient(135deg, #fce4ec 0%, #fff8fa 100%)';
            }
        });
    }
    
    // 🆕 表情包分组全选/清空按钮
    const selectAllBtn = document.getElementById('select-all-sticker-groups-btn');
    const deselectAllBtn = document.getElementById('deselect-all-sticker-groups-btn');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.sticker-group-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = true;
                const label = cb.closest('label');
                if (label) label.style.borderColor = 'var(--primary-color)';
            });
            updateStickerGroupsStatusSummary(); // 🆕 更新状态摘要
            console.log('✅ 全选所有表情包分组');
        });
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.sticker-group-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = false;
                const label = cb.closest('label');
                if (label) label.style.borderColor = '#ddd';
            });
            updateStickerGroupsStatusSummary(); // 🆕 更新状态摘要
            console.log('✅ 清空所有表情包分组选择');
        });
    }
    
    document.getElementById('setting-char-avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 });
                document.getElementById('setting-char-avatar-preview').src = compressedUrl;
            } catch (error) {
                showToast('头像压缩失败，请重试');
            }
        }
    });

    document.getElementById('setting-my-avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 });
                document.getElementById('setting-my-avatar-preview').src = compressedUrl;
            } catch (error) {
                showToast('头像压缩失败，请重试');
            }
        }
    });

    clearChatHistoryBtn.addEventListener('click', async () => {
        const character = db.characters.find(c => c.id === currentChatId);
        if (!character) return;
        if (confirm(`你确定要清空与"${character.remarkName}"的所有聊天记录吗？此操作无法撤销。`)) {
            await clearHistoryDirectly();
        }
    });

 // 聊天记录导入导出按钮事件
    document.getElementById('export-chat-btn').addEventListener('click', exportCurrentChat);
    
    document.getElementById('import-chat-btn').addEventListener('click', () => {
        document.getElementById('import-chat-input').click();
    });

    document.getElementById('import-chat-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await importCurrentChat(file);
        }
        e.target.value = ''; // 清空文件选择，允许重复导入同一文件
    });

}

// ▼▼▼ 第二步：完整替换 loadSettingsToSidebar 函数 (动态插入只读备注框) ▼▼▼
function loadSettingsToSidebar() {
    const e = db.characters.find(e => e.id === currentChatId);
    if (e) {
        document.getElementById('setting-char-avatar-preview').src = e.avatar;
        document.getElementById('setting-char-remark').value = e.remarkName;
        document.getElementById('setting-char-persona').value = e.persona;
        document.getElementById('setting-my-avatar-preview').src = e.myAvatar;
        
        // --- 核心修改：动态插入/更新“昵称备注”显示框 ---
        const myNameInput = document.getElementById('setting-my-name');
        const parentFormGroup = myNameInput.parentElement;
        
        // 检查是否已经存在备注显示框，不存在则创建
        let remarkDisplayGroup = document.getElementById('setting-my-ai-remark-group');
        if (!remarkDisplayGroup) {
            remarkDisplayGroup = document.createElement('div');
            remarkDisplayGroup.id = 'setting-my-ai-remark-group';
            remarkDisplayGroup.className = 'form-group';
            // 插入在“我的姓名”输入框之前
            parentFormGroup.parentNode.insertBefore(remarkDisplayGroup, parentFormGroup);
        }
        
        // 获取 AI 给我的备注，如果没有则显示“暂无”
        const aiRemark = e.aiAssignedUserRemark || '（暂无）';
        
        remarkDisplayGroup.innerHTML = `
            <label style="color:var(--secondary-color);">昵称备注 (AI修改)</label>
            <input type="text" value="${aiRemark}" disabled 
                   style="background-color: #f5f5f5; color: #888; border-color: #eee; cursor: not-allowed;">
        `;
        // --- 修改结束 ---

        document.getElementById('setting-my-name').value = e.myName;
        document.getElementById('setting-my-persona').value = e.myPersona;
        document.getElementById('setting-theme-color').value = e.theme || 'white_pink';
        document.getElementById('setting-max-memory').value = e.maxMemory;
        
        const useCustomCssCheckbox = document.getElementById('setting-use-custom-css'),
            customCssTextarea = document.getElementById('setting-custom-bubble-css'),
            privatePreviewBox = document.getElementById('private-bubble-css-preview');
            
        useCustomCssCheckbox.checked = e.useCustomBubbleCss || false;
        customCssTextarea.value = e.customBubbleCss || '';
        customCssTextarea.disabled = !useCustomCssCheckbox.checked;
        const theme = colorThemes[e.theme || 'white_pink'];
        
        updateBubbleCssPreview(privatePreviewBox, e.customBubbleCss, !e.useCustomBubbleCss, theme);
        document.getElementById('setting-offline-mode').checked = e.isOfflineMode || false;
        updateBlockButtonState(e);
        
        const proactiveToggle = document.getElementById('private-ai-proactive-chat-toggle');
        const proactiveOptions = document.getElementById('private-ai-proactive-options');
        const proactiveDelayInput = document.getElementById('private-ai-proactive-chat-delay');
        const proactiveIntervalInput = document.getElementById('private-ai-proactive-chat-interval');
        
        proactiveToggle.checked = e.aiProactiveChatEnabled || false;
        proactiveDelayInput.value = e.aiProactiveChatDelay || '';
        proactiveIntervalInput.value = e.aiProactiveChatInterval || '';
        proactiveOptions.style.display = proactiveToggle.checked ? 'block' : 'none';
        
        proactiveToggle.onchange = (evt) => {
            proactiveOptions.style.display = evt.target.checked ? 'block' : 'none';
        };
        // 🆕 渲染表情包分组选择器
        let selectedGroups = [];
        // 严格区分 undefined/null（未配置）和 ''（已配置但为空）
        if (e.stickerGroups !== undefined && e.stickerGroups !== null) {
            // 已配置过（包括空字符串 ''）
            if (typeof e.stickerGroups === 'string') {
                // 如果是空字符串，selectedGroups 保持为 []
                // 如果是非空字符串，解析为数组
                if (e.stickerGroups.trim() !== '') {
                    selectedGroups = e.stickerGroups.split(',').map(g => g.trim()).filter(Boolean);
                }
                // 如果 e.stickerGroups === ''，selectedGroups 保持为 []（已禁用）
            }
        } else {
            // 未配置（undefined 或 null）：兼容旧版逻辑
            // 如果有 shareStickers=true，默认选中所有分组
            if (e.shareStickers === true) {
                const allGroups = getAllStickerGroups();
                const hasUngrouped = db.myStickers.some(s => !s.group || s.group.trim() === '');
                if (hasUngrouped) allGroups.unshift('未分类');
                selectedGroups = allGroups;
            }
            // 如果 shareStickers 也不是 true，selectedGroups 保持为 []（未配置，禁用）
        }
        renderStickerGroupsSelector(selectedGroups);
        
    }
}

   function openGroupMemberEditModal(memberId) {
    const group = db.groups.find(g => g.id === currentChatId);
    const member = group.members.find(m => m.id === memberId);
    if (!member) return;
    document.getElementById('edit-group-member-title').textContent = `编辑 ${member.groupNickname}`;
    document.getElementById('editing-member-id').value = member.id;
    renderAvatarInSettings('group-member-avatar-container-setting', member.avatar, member.avatarFrameUrl);
    document.getElementById('edit-member-group-nickname').value = member.groupNickname;
    document.getElementById('edit-member-real-name').value = member.realName;
    document.getElementById('edit-member-persona').value = member.persona;
    editGroupMemberModal.classList.add('visible');
}

// ▼▼▼ 完整替换 saveSettingsFromSidebar 函数 (新增修改备注触发 AI 反应) ▼▼▼
async function saveSettingsFromSidebar() {
    const e = db.characters.find(e => e.id === currentChatId);
    if (e) {
        // --- 1. 记录旧的备注名 (用于对比) ---
        const oldRemark = e.remarkName;

        // 获取并更新各项设置
        e.avatar = document.getElementById('setting-char-avatar-preview').src;
        e.remarkName = document.getElementById('setting-char-remark').value; // 这里获取了新备注
        e.persona = document.getElementById('setting-char-persona').value;
        e.myAvatar = document.getElementById('setting-my-avatar-preview').src;
        e.myName = document.getElementById('setting-my-name').value;
        e.myPersona = document.getElementById('setting-my-persona').value;
        e.theme = document.getElementById('setting-theme-color').value;
        e.maxMemory = document.getElementById('setting-max-memory').value;
        e.useCustomBubbleCss = document.getElementById('setting-use-custom-css').checked;
        e.customBubbleCss = document.getElementById('setting-custom-bubble-css').value;
        e.isOfflineMode = document.getElementById('setting-offline-mode').checked;
        // 🆕 保存表情包分组绑定
        const selectedGroups = getSelectedStickerGroups();
        // 如果为空数组，保存空字符串；否则保存逗号分隔的字符串
        // 注意：空字符串 '' 需要被明确保存，以区分"未配置"（undefined/null）和"已配置但为空"（''）
        e.stickerGroups = selectedGroups.length > 0 ? selectedGroups.join(',') : '';
        console.log(`✅ [角色设置] 保存表情包分组绑定: [${e.stickerGroups || '(空，已禁用)'}]`);
        e.aiProactiveChatEnabled = document.getElementById('private-ai-proactive-chat-toggle').checked;
        e.aiProactiveChatDelay = parseInt(document.getElementById('private-ai-proactive-chat-delay').value, 10) || 0;
        e.aiProactiveChatInterval = parseInt(document.getElementById('private-ai-proactive-chat-interval').value, 10) || 0;
        
        // --- 2. 核心新增：检测备注变化并注入消息 ---
        const newRemark = e.remarkName;
        // 如果备注变了，且不是空的
        if (oldRemark !== newRemark && newRemark.trim() !== "") {
            
            // A. 构造给你看的灰色系统提示
            const displayContent = `[system-display: 你将对方的备注修改为了“${newRemark}”]`;
            const displayMsg = {
                id: `msg_sys_remark_${Date.now()}`,
                role: 'system',
                content: displayContent,
                parts: [{ type: 'text', text: displayContent }],
                timestamp: Date.now()
            };

            // B. 构造给 AI 看的隐形指令 (强迫它对此作出反应)
            const contextContent = `[system: 注意：用户刚刚将你的备注（昵称）从“${oldRemark}”修改为了“${newRemark}”。请在接下来的回复中，根据你的人设对此做出自然的反应（例如：表示喜欢、害羞、生气、或者吐槽这个新名字）。]`;
            const contextMsg = {
                id: `msg_ctx_remark_${Date.now()}`,
                role: 'user', // 用 user 身份发送指令效果最好，AI 会以为是你对它说的话
                content: contextContent,
                parts: [{ type: 'text', text: contextContent }],
                timestamp: Date.now()
            };

            // C. 存入历史记录
            e.history.push(displayMsg, contextMsg);

            // D. 如果当前正在聊天界面，立即显示那条灰色的系统提示
            // (注意：这里只显示 displayMsg，contextMsg 是隐形的)
            if (currentChatId === e.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                if (typeof addMessageBubble === 'function') {
                    addMessageBubble(displayMsg);
                }
            }
        }
        // --- 新增结束 ---

        await saveData();
        showToast('设置已保存！');
        
        // 更新标题栏显示
        chatRoomTitle.textContent = e.remarkName;
        
        renderChatList();
        updateCustomBubbleStyle(currentChatId, e.customBubbleCss, e.useCustomBubbleCss);
        
        // 刷新消息列表 (防止修改头像后旧消息头像没变)
        // window.chatUiCoreState.currentPage = 1; // 可选：是否重置回第一页，这里保持注释，避免体验跳跃
        window.chatUiCore.renderMessages(false, true); 
    }
}
   
        // --- GROUP CHAT FUNCTIONS ---
        

/**
 * 打开设置群头衔的成员选择模态框
 */
function openSetGroupTitleModal() {
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;

    const memberListEl = document.getElementById('group-title-member-list');
    memberListEl.innerHTML = ''; // 清空旧列表

    // 将自己也添加到列表中以便设置
    const myItem = document.createElement('li');
    myItem.className = 'list-item';
    myItem.style.cursor = 'pointer';
    myItem.dataset.memberId = 'user_me'; // 用于标识用户的特殊ID
    myItem.innerHTML = `
        <img src="${group.me.avatar}" alt="${group.me.nickname}" class="chat-avatar">
        <div class="item-details">
            <div class="item-name">${group.me.nickname} <span style="font-weight:normal; color:#888;">(我)</span></div>
            <div class="item-preview">${group.me.groupTitle || '暂无头衔'}</div>
        </div>`;
    memberListEl.appendChild(myItem);

    // 添加所有AI成员
    group.members.forEach(member => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.cursor = 'pointer';
        li.dataset.memberId = member.id;
        li.innerHTML = `
            <img src="${member.avatar}" alt="${member.groupNickname}" class="chat-avatar">
            <div class="item-details">
                <div class="item-name">${member.groupNickname}</div>
                <div class="item-preview">${member.groupTitle || '暂无头衔'}</div>
            </div>`;
        memberListEl.appendChild(li);
    });

    // 为列表项绑定点击事件
    memberListEl.onclick = handleGroupTitleMemberSelect;

    document.getElementById('set-group-title-modal').classList.add('visible');
}

/**
 * 处理在头衔设置模态框中选择成员的事件
 */
async function handleGroupTitleMemberSelect(e) {
    const memberItem = e.target.closest('.list-item');
    if (!memberItem) return;

    const memberId = memberItem.dataset.memberId;
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;

    // 根据ID找到对应的成员对象（可能是用户自己或AI成员）
    const isMe = memberId === 'user_me';
    const member = isMe ? group.me : group.members.find(m => m.id === memberId);
    
    if (!member) return;

    const currentTitle = member.groupTitle || '';
    const newTitle = prompt(`为 "${isMe ? member.nickname : member.groupNickname}" 设置群头衔（最多7个字，留空则取消头衔）：`, currentTitle);

    if (newTitle === null) return; // 用户点击了“取消”

    if (newTitle.length > 7) {
        showToast('群头衔不能超过7个字！');
        return;
    }
    
    // 更新数据中的头衔
    member.groupTitle = newTitle.trim();
    
    document.getElementById('set-group-title-modal').classList.remove('visible');
    showToast('群头衔设置成功！');
    
    // 如果设置的是AI成员的头衔，则发送通知
    if (!isMe) {
        await sendGroupTitleNotification(member, member.groupTitle);
    } else {
        await saveData(); // 如果是自己，直接保存即可
    }
    
    // 立即刷新聊天界面以显示新头衔
    window.chatUiCore.renderMessages(false, true);
    // 如果设置面板是打开的，也刷新一下成员列表
    if(groupSettingsSidebar.classList.contains('open')) {
        renderGroupMembersInSettings(group);
    }
}

/**
 * 向群聊中发送一条关于头衔变更的系统消息，以通知AI
 */
async function sendGroupTitleNotification(member, newTitle) {
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;

    const actionText = newTitle ? `的群头衔为 "${newTitle}"` : `取消了 ${member.realName} 的群头衔`;
    const messageContent = `[system: ${group.me.nickname} 设置了 ${member.realName} ${actionText}]`;
    
    const message = {
        id: `msg_title_${Date.now()}`,
        role: 'user', // 作为用户侧的系统消息，确保AI能处理
        content: messageContent,
        parts: [{ type: 'text', text: messageContent }],
        timestamp: Date.now(),
        senderId: 'user_me'
    };

    group.history.push(message);
    addMessageBubble(message); // 在界面上显示这条系统通知
    await saveData();
}

/**
 * 根据头衔内容返回一个用于样式的CSS类名
 * @param {string} title - The group title text.
 * @returns {string} - The CSS class name.
 */
function getBadgeClassForTitle(title) {
    if (!title) return '';
    // 这是一个简单的示例逻辑，您可以根据需要自定义
    const length = title.length;
    if (title.includes('主')) return 'lv26';
    if (length <= 2) return 'lv10';
    if (length <= 4) return 'lv11';
    return 'lv12';
}
              function setupGroupChatSystem() {
            createGroupBtn.addEventListener('click', () => {
                renderMemberSelectionList();
                createGroupModal.classList.add('visible');
            });
            createGroupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const selectedMemberIds = Array.from(memberSelectionList.querySelectorAll('input:checked')).map(input => input.value);
                const groupName = groupNameInput.value.trim();
                if (selectedMemberIds.length < 1) return showToast('请至少选择一个群成员。');
                if (!groupName) return showToast('请输入群聊名称。');
                const firstChar = db.characters.length > 0 ? db.characters[0] : null;
                const newGroup = {
                    id: `group_${Date.now()}`,
                    name: groupName,
                    avatar: 'https://i.postimg.cc/fTLCngk1/image.jpg',
                    me: {
                        nickname: firstChar ? firstChar.myName : '我',
                        persona: firstChar ? firstChar.myPersona : '',
                        avatar: firstChar ? firstChar.myAvatar : 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg'
                    },
                    members: selectedMemberIds.map(charId => {
                        const char = db.characters.find(c => c.id === charId);
                        return {
                            id: `member_${char.id}`,
                            originalCharId: char.id,
                            realName: char.realName,
                            groupNickname: char.remarkName,
                            persona: char.persona,
                            avatar: char.avatar
                        };
                    }),
                    theme: 'white_pink',
                    maxMemory: 10,
                    chatBg: '',
                    history: [],
                    isPinned: false,
                    useCustomBubbleCss: false,
                    customBubbleCss: '',
                    aiProactiveChatEnabled: false,
                    aiProactiveChatDelay: 0,
                    aiProactiveChatInterval: 0,
                    pendingMessages: [],
                    worldBookIds: []
                };
                db.groups.push(newGroup);
                await saveData();
                renderChatList();
                createGroupModal.classList.remove('visible');
                showToast(`群聊“${groupName}”创建成功！`);
            });
            groupSettingsForm.addEventListener('submit', e => {
                e.preventDefault();
                saveGroupSettingsFromSidebar();
                groupSettingsSidebar.classList.remove('open');
            });
            const useGroupCustomCssCheckbox = document.getElementById('setting-group-use-custom-css'),
                groupCustomCssTextarea = document.getElementById('setting-group-custom-bubble-css'),
                resetGroupCustomCssBtn = document.getElementById('reset-group-custom-bubble-css-btn'),
                groupPreviewBox = document.getElementById('group-bubble-css-preview');
            document.getElementById('setting-group-avatar-upload').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const compressedUrl = await compressImage(file, {quality: 0.8, maxWidth: 400, maxHeight: 400});
                        const group = db.groups.find(g => g.id === currentChatId);
                        if (group) {
                            group.avatar = compressedUrl;
                            document.getElementById('setting-group-avatar-preview').src = compressedUrl;
                        }
                    } catch (error) {
                        showToast('群头像压缩失败，请重试');
                    }
                }
            });
            document.getElementById('clear-group-chat-history-btn').addEventListener('click', async () => {
                const group = db.groups.find(g => g.id === currentChatId);
                if (!group) return;
                if (confirm(`你确定要清空群聊"${group.name}"的所有聊天记录吗？此操作无法撤销。`)) {
                    await clearHistoryDirectly();
                }
            });
            groupMembersListContainer.addEventListener('click', e => {
                const memberDiv = e.target.closest('.group-member');
                const addBtn = e.target.closest('.add-member-btn');
                if (memberDiv) {
                    openGroupMemberEditModal(memberDiv.dataset.id);
                } else if (addBtn) {
                    addMemberActionSheet.classList.add('visible');
                }
            });
            document.getElementById('edit-member-avatar-preview').addEventListener('click', () => {
                document.getElementById('edit-member-avatar-upload').click();
            });
            document.getElementById('edit-member-avatar-upload').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const compressedUrl = await compressImage(file, {quality: 0.8, maxWidth: 400, maxHeight: 400});
                        document.getElementById('edit-member-avatar-preview').src = compressedUrl;
                    } catch (error) {
                        showToast('成员头像压缩失败，请重试');
                    }
                }
            });
            editGroupMemberForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const memberId = document.getElementById('editing-member-id').value;
                const group = db.groups.find(g => g.id === currentChatId);
                const member = group.members.find(m => m.id === memberId);
                if (member) {
                    member.avatar = document.getElementById('edit-member-avatar-preview').src;
                    member.groupNickname = document.getElementById('edit-member-group-nickname').value;
                    member.realName = document.getElementById('edit-member-real-name').value;
                    member.persona = document.getElementById('edit-member-persona').value;
                    await saveData();
                    renderGroupMembersInSettings(group);
                    document.querySelectorAll(`.message-wrapper[data-sender-id="${member.id}"] .group-nickname`).forEach(el => {
                        el.textContent = member.groupNickname;
                    });
                    showToast('成员信息已更新');
                }
                editGroupMemberModal.classList.remove('visible');
            });
            inviteExistingMemberBtn.addEventListener('click', () => {
                renderInviteSelectionList();
                inviteMemberModal.classList.add('visible');
                addMemberActionSheet.classList.remove('visible');
            });
            createNewMemberBtn.addEventListener('click', () => {
                createMemberForGroupForm.reset();
                document.getElementById('create-group-member-avatar-preview').src = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
                createMemberForGroupModal.classList.add('visible');
                addMemberActionSheet.classList.remove('visible');
            });
            document.getElementById('create-group-member-avatar-preview').addEventListener('click', () => {
                document.getElementById('create-group-member-avatar-upload').click();
            });
            document.getElementById('create-group-member-avatar-upload').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const compressedUrl = await compressImage(file, {quality: 0.8, maxWidth: 400, maxHeight: 400});
                        document.getElementById('create-group-member-avatar-preview').src = compressedUrl;
                    } catch (error) {
                        showToast('新成员头像压缩失败，请重试');
                    }
                }
            });
            confirmInviteBtn.addEventListener('click', async () => {
                const group = db.groups.find(g => g.id === currentChatId);
                if (!group) return;
                const selectedCharIds = Array.from(inviteMemberSelectionList.querySelectorAll('input:checked')).map(input => input.value);
                selectedCharIds.forEach(charId => {
                    const char = db.characters.find(c => c.id === charId);
                    if (char) {
                        const newMember = {
                            id: `member_${char.id}`,
                            originalCharId: char.id,
                            realName: char.realName,
                            groupNickname: char.remarkName,
                            persona: char.persona,
                            avatar: char.avatar
                        };
                        group.members.push(newMember);
                        sendInviteNotification(group, newMember.realName);
                    }
                });
                if (selectedCharIds.length > 0) {
                    await saveData();
                    renderGroupMembersInSettings(group);
                    window.chatUiCore.renderMessages(false, true);
                    showToast('已邀请新成员');
                }
                inviteMemberModal.classList.remove('visible');
            });
            createMemberForGroupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const group = db.groups.find(g => g.id === currentChatId);
                if (!group) return;
                const newMember = {
                    id: `member_group_only_${Date.now()}`,
                    originalCharId: null,
                    realName: document.getElementById('create-group-member-realname').value,
                    groupNickname: document.getElementById('create-group-member-nickname').value,
                    persona: document.getElementById('create-group-member-persona').value,
                    avatar: document.getElementById('create-group-member-avatar-preview').src,
                };
                group.members.push(newMember);
                sendInviteNotification(group, newMember.realName);
                await saveData();
                renderGroupMembersInSettings(group);
                window.chatUiCore.renderMessages(false, true);
                showToast(`新成员 ${newMember.groupNickname} 已加入`);
                createMemberForGroupModal.classList.remove('visible');
            });
            document.getElementById('setting-group-my-avatar-upload').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const compressedUrl = await compressImage(file, {quality: 0.8, maxWidth: 400, maxHeight: 400});
                        document.getElementById('setting-group-my-avatar-preview').src = compressedUrl;
                    } catch (error) {
                        showToast('头像压缩失败')
                    }
                }
            });
            // *** 修正开始 ***
            // 将事件监听器移到这里，确保它们只被绑定一次
            document.getElementById('set-group-title-btn').addEventListener('click', openSetGroupTitleModal);
            document.getElementById('close-group-title-modal-btn').addEventListener('click', () => {
                document.getElementById('set-group-title-modal').classList.remove('visible');
            });

            // *** 修正结束 ***

        }

        function renderMemberSelectionList() {
            memberSelectionList.innerHTML = '';
            if (db.characters.length === 0) {
                memberSelectionList.innerHTML = '<li style="color:#aaa; text-align:center; padding: 10px 0;">没有可选择的人设。</li>';
                return;
            }
            db.characters.forEach(char => {
                const li = document.createElement('li');
                li.className = 'member-selection-item';
                li.innerHTML = `<input type="checkbox" id="select-${char.id}" value="${char.id}"><img src="${char.avatar}" alt="${char.remarkName}"><label for="select-${char.id}">${char.remarkName}</label>`;
                memberSelectionList.appendChild(li);
            });
        }

      function loadGroupSettingsToSidebar() {
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;
    const themeSelect = document.getElementById('setting-group-theme-color');
    if (themeSelect.options.length === 0) {
        Object.keys(colorThemes).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = colorThemes[key].name;
            themeSelect.appendChild(option);
        });
    }
    document.getElementById('setting-group-avatar-preview').src = group.avatar;
    document.getElementById('setting-group-name').value = group.name;
    document.getElementById('setting-group-my-avatar-preview').src = group.me.avatar;
    document.getElementById('setting-group-my-nickname').value = group.me.nickname;
    document.getElementById('setting-group-my-persona').value = group.me.persona;
    themeSelect.value = group.theme || 'white_pink';
    document.getElementById('setting-group-max-memory').value = group.maxMemory;
    renderGroupMembersInSettings(group);
    const useGroupCustomCssCheckbox = document.getElementById('setting-group-use-custom-css'),
        groupCustomCssTextarea = document.getElementById('setting-group-custom-bubble-css'),
        groupPreviewBox = document.getElementById('group-bubble-css-preview');
    useGroupCustomCssCheckbox.checked = group.useCustomBubbleCss || false;
    groupCustomCssTextarea.value = group.customBubbleCss || '';
    groupCustomCssTextarea.disabled = !useGroupCustomCssCheckbox.checked;
    const theme = colorThemes[group.theme || 'white_pink'];
    updateBubbleCssPreview(groupPreviewBox, group.customBubbleCss, !group.useCustomBubbleCss, theme);
    const bubbleScaleRange = document.getElementById('bubble-scale-range');
    const bubbleScaleValue = document.getElementById('bubble-scale-value');
    const chatRoomScreen = document.getElementById('chat-room-screen');
    
    const currentScale = group.bubbleScale || 1;
    bubbleScaleRange.value = currentScale;
    bubbleScaleValue.textContent = `${Math.round(currentScale * 100)}%`;
    chatRoomScreen.style.setProperty('--bubble-scale', currentScale);

    // 新增：加载群聊的后台回复设置
    const proactiveToggle = document.getElementById('group-ai-proactive-chat-toggle');
    const proactiveOptions = document.getElementById('group-ai-proactive-options');
    const proactiveDelayInput = document.getElementById('group-ai-proactive-chat-delay');
    const proactiveIntervalInput = document.getElementById('group-ai-proactive-chat-interval');

    proactiveToggle.checked = group.aiProactiveChatEnabled || false;
    proactiveDelayInput.value = group.aiProactiveChatDelay || '';
    proactiveIntervalInput.value = group.aiProactiveChatInterval || '';
    proactiveOptions.style.display = proactiveToggle.checked ? 'block' : 'none';

    proactiveToggle.onchange = (evt) => {
        proactiveOptions.style.display = evt.target.checked ? 'block' : 'none';
    };
}

        function renderGroupMembersInSettings(group) {
            groupMembersListContainer.innerHTML = '';
            group.members.forEach(member => {
                const memberDiv = document.createElement('div');
                memberDiv.className = 'group-member';
                memberDiv.dataset.id = member.id;
                memberDiv.innerHTML = `<img src="${member.avatar}" alt="${member.groupNickname}"><span>${member.groupNickname}</span>`;
                groupMembersListContainer.appendChild(memberDiv);
            });
            const addBtn = document.createElement('div');
            addBtn.className = 'add-member-btn';
            addBtn.innerHTML = `<div class="add-icon">+</div><span>添加</span>`;
            groupMembersListContainer.appendChild(addBtn);
        }

async function saveGroupSettingsFromSidebar() {
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;
    const oldName = group.name;
    const newName = document.getElementById('setting-group-name').value;
    if (oldName !== newName) {
        group.name = newName;
        sendRenameNotification(group, newName);
    }
    group.avatar = document.getElementById('setting-group-avatar-preview').src;
    group.me.avatar = document.getElementById('setting-group-my-avatar-preview').src;
    group.me.nickname = document.getElementById('setting-group-my-nickname').value;
    group.me.persona = document.getElementById('setting-group-my-persona').value;
    group.theme = document.getElementById('setting-group-theme-color').value;
    group.maxMemory = document.getElementById('setting-group-max-memory').value;
    group.useCustomBubbleCss = document.getElementById('setting-group-use-custom-css').checked;
    group.customBubbleCss = document.getElementById('setting-group-custom-bubble-css').value;
    updateCustomBubbleStyle(currentChatId, group.customBubbleCss, group.useCustomBubbleCss);
    
    group.bubbleScale = document.getElementById('bubble-scale-range').value;

    // 新增：保存群聊的后台回复设置
    group.aiProactiveChatEnabled = document.getElementById('group-ai-proactive-chat-toggle').checked;
    group.aiProactiveChatDelay = parseInt(document.getElementById('group-ai-proactive-chat-delay').value, 10) || 0;
    group.aiProactiveChatInterval = parseInt(document.getElementById('group-ai-proactive-chat-interval').value, 10) || 0;

    await saveData();
    showToast('群聊设置已保存！');
    chatRoomTitle.textContent = group.name;
    renderChatList();
    window.chatUiCore.renderMessages(false, true);
}

        function openGroupMemberEditModal(memberId) {
            const group = db.groups.find(g => g.id === currentChatId);
            const member = group.members.find(m => m.id === memberId);
            if (!member) return;
            document.getElementById('edit-group-member-title').textContent = `编辑 ${member.groupNickname}`;
            document.getElementById('editing-member-id').value = member.id;
            document.getElementById('edit-member-avatar-preview').src = member.avatar;
            document.getElementById('edit-member-group-nickname').value = member.groupNickname;
            document.getElementById('edit-member-real-name').value = member.realName;
            document.getElementById('edit-member-persona').value = member.persona;
            editGroupMemberModal.classList.add('visible');
        }

        function renderInviteSelectionList() {
            inviteMemberSelectionList.innerHTML = '';
            const group = db.groups.find(g => g.id === currentChatId);
            if (!group) return;
            const currentMemberCharIds = new Set(group.members.map(m => m.originalCharId));
            const availableChars = db.characters.filter(c => !currentMemberCharIds.has(c.id));
            if (availableChars.length === 0) {
                inviteMemberSelectionList.innerHTML = '<li style="color:#aaa; text-align:center; padding: 10px 0;">没有可邀请的新成员了。</li>';
                confirmInviteBtn.disabled = true;
                return;
            }
            confirmInviteBtn.disabled = false;
            availableChars.forEach(char => {
                const li = document.createElement('li');
                li.className = 'invite-member-select-item';
                li.innerHTML = `<input type="checkbox" id="invite-select-${char.id}" value="${char.id}"><label for="invite-select-${char.id}"><img src="${char.avatar}" alt="${char.remarkName}"><span>${char.remarkName}</span></label>`;
                inviteMemberSelectionList.appendChild(li);
            });
        }

        function sendInviteNotification(group, newMemberRealName) {
            const messageContent = `[${group.me.nickname}邀请${newMemberRealName}加入了群聊]`;
            const message = {
                id: `msg_${Date.now()}`,
                role: 'user',
                content: messageContent,
                parts: [{type: 'text', text: messageContent}],
                timestamp: Date.now(),
                senderId: 'user_me'
            };
            group.history.push(message);
        }

        function sendRenameNotification(group, newName) {
            const myName = group.me.nickname;
            const messageContent = `[${myName}修改群名为：${newName}]`;
            const message = {
                id: `msg_${Date.now()}`,
                role: 'user',
                content: messageContent,
                parts: [{type: 'text', text: messageContent}],
                timestamp: Date.now()
            };
            group.history.push(message);
        }

// 在 init() 函数之前添加以下三个函数

function addNotificationToQueue(notification) {
    // ▼▼▼ 在这里修改 ▼▼▼

    // 之前的代码有一个随机延迟，我们把它去掉，换成直接执行
    /* // 模拟一个随机延迟（1到5秒），让通知看起来更自然
    const delay = Math.random() * 4000 + 1000;
    setTimeout(() => {
        notificationQueue.push(notification);
    }, delay);
    */
    
    // 新代码：直接将通知添加到队列，不再延迟
    notificationQueue.push(notification);

    // ▲▲▲ 修改结束 ▲▲▲
}
window.addNotificationToQueue = addNotificationToQueue;

function showNotificationBanner() {
    console.log(`检查通知: 队列长度 ${notificationQueue.length}, 正在显示? ${isNotificationShowing}, 在动态页? ${document.getElementById('moments-screen').classList.contains('active')}`);

    if (isNotificationShowing || notificationQueue.length === 0) {
        return;
    }

    const momentsScreen = document.getElementById('moments-screen');
    if (momentsScreen && momentsScreen.classList.contains('active')) {
        return;
    }

    isNotificationShowing = true;
    const notification = notificationQueue.shift();
    
    const banner = document.getElementById('global-notification-banner');
    const avatar = document.getElementById('notification-avatar');
    const textEl = document.getElementById('notification-text');

    avatar.src = notification.avatar;
    textEl.innerHTML = notification.text;

    banner.classList.add('show');
    
    // ▼▼▼ 核心修改在此 ▼▼▼
    banner.onclick = () => {
        // 检查通知是否包含聊天信息
        if (notification.chatId && notification.type) {
            // 如果有，就打开对应的聊天室
            openChatRoom(notification.chatId, notification.type);
        } else {
            // 否则，作为备用方案，跳转到动态页
            switchScreen('moments-screen');
        }
        
        banner.classList.remove('show');
        isNotificationShowing = false;
        setTimeout(showNotificationBanner, 500);
    };
    // ▲▲▲ 修改结束 ▲▲▲

    setTimeout(() => {
        banner.classList.remove('show');
        isNotificationShowing = false;
        setTimeout(showNotificationBanner, 500);
    }, 5000);
}
function setupNotificationSystem() {
    // 定时检查通知队列
    setInterval(showNotificationBanner, 2000); // 每2秒检查一次

    // 关闭按钮
    const closeBtn = document.getElementById('notification-close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止触发横幅的点击事件
        const banner = document.getElementById('global-notification-banner');
        banner.classList.remove('show');
        isNotificationShowing = false;
        setTimeout(showNotificationBanner, 500);
    });
}
// --- 新增长截图选择与生成功能 ---

/**
 * 进入截图选择模式
 * @param {string} initialMessageId - 长按触发时，初始选中的消息ID
 */
function enterScreenshotSelectionMode(initialMessageId) {
    isInScreenshotMode = true;
    selectedMessagesForScreenshot.clear();

    const chatScreen = document.getElementById('chat-room-screen');
    chatScreen.classList.add('screenshot-mode');

    document.getElementById('screenshot-select-bar').style.display = 'flex';
    document.getElementById('screenshot-select-count').textContent = '已选择 0 条';

    // 初始选中山下文菜单触发的消息
    if (initialMessageId) {
        toggleScreenshotSelection(initialMessageId);
    }
}

/**
 * 退出截图选择模式
 */
function exitScreenshotSelectionMode() {
    isInScreenshotMode = false;
    document.getElementById('chat-room-screen').classList.remove('screenshot-mode');
    document.getElementById('screenshot-select-bar').style.display = 'none';

    // 移除所有消息的选中高亮
    document.querySelectorAll('.message-wrapper.screenshot-selected').forEach(el => {
        el.classList.remove('screenshot-selected');
    });
    selectedMessagesForScreenshot.clear();
}

/**
 * 切换单条消息的选中状态
 * @param {string} messageId - 被点击的消息的ID
 */
function toggleScreenshotSelection(messageId) {
    const el = document.querySelector(`.message-wrapper[data-id="${messageId}"]`);
    if (!el) return;

    if (selectedMessagesForScreenshot.has(messageId)) {
        selectedMessagesForScreenshot.delete(messageId);
        el.classList.remove('screenshot-selected');
    } else {
        selectedMessagesForScreenshot.add(messageId);
        el.classList.add('screenshot-selected');
    }

    document.getElementById('screenshot-select-count').textContent = `已选择 ${selectedMessagesForScreenshot.size} 条`;
}

/**
 * 生成并下载所选消息的截图
 */
// ▼▼▼ 用下面这个完整的函数，替换掉你文件中旧的同名函数 ▼▼▼
/**
 * 生成所选消息的截图，并在弹窗中进行预览。
 */
async function generateSelectedMessagesScreenshot() {
    if (selectedMessagesForScreenshot.size === 0) {
        showToast('请至少选择一条消息');
        return;
    }

    showToast('正在生成长截图，请稍候...');
    // 关键：在截图前先隐藏选择操作栏，避免它出现在截图里
    document.getElementById('screenshot-select-bar').style.display = 'none';

    // 1. 创建一个临时的、屏幕外的容器用于截图
    const screenshotContainer = document.createElement('div');
    screenshotContainer.style.position = 'absolute';
    screenshotContainer.style.left = '-9999px'; // 移出视窗
    screenshotContainer.style.width = document.querySelector('.phone-screen').clientWidth + 'px';
    screenshotContainer.style.padding = '20px 10px';
    screenshotContainer.style.fontFamily = 'var(--font-family)';

    // 2. 添加聊天背景
    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
    if (chat && chat.chatBg) {
        screenshotContainer.style.backgroundImage = `url(${chat.chatBg})`;
        screenshotContainer.style.backgroundSize = 'cover';
        screenshotContainer.style.backgroundPosition = 'center';
    } else {
        screenshotContainer.style.backgroundColor = '#f7f7f7';
    }

    // 3. 按顺序克隆选中的消息
    const selectedElements = Array.from(selectedMessagesForScreenshot)
        .map(id => document.querySelector(`.message-wrapper[data-id="${id}"]`))
        .filter(Boolean)
        .sort((a, b) => a.offsetTop - b.offsetTop);

    selectedElements.forEach(el => {
        const clone = el.cloneNode(true);
        clone.classList.remove('screenshot-selected', 'multi-select-selected'); // 移除所有高亮
        screenshotContainer.appendChild(clone);
    });

    document.body.appendChild(screenshotContainer);

    // 4. 使用 html2canvas 进行截图
    try {
        const canvas = await html2canvas(screenshotContainer, {
            useCORS: true,
            backgroundColor: null,
        });

        const imageDataUrl = canvas.toDataURL("image/png");

        // 5. 显示预览弹窗
        const modal = document.getElementById('screenshot-preview-modal');
        const imgEl = document.getElementById('screenshot-preview-image');
        const downloadBtn = document.getElementById('download-screenshot-btn');
        const closeBtn = document.getElementById('close-screenshot-preview');

        imgEl.src = imageDataUrl;
        downloadBtn.href = imageDataUrl;
        downloadBtn.download = `聊天记录截图-${Date.now()}.png`;
        
        modal.classList.add('visible');

        // 6. 绑定关闭事件
        const closeModal = () => {
            modal.classList.remove('visible');
            exitScreenshotSelectionMode(); // 截图流程结束后，彻底退出选择模式
        };
        closeBtn.onclick = closeModal; // 使用 .onclick 避免重复绑定
        
    } catch (error) {
        console.error("截图失败:", error);
        showToast('截图失败，详情请查看控制台');
        // 截图失败也要退出选择模式
        exitScreenshotSelectionMode();
    } finally {
        // 7. 清理临时容器
        document.body.removeChild(screenshotContainer);
    }
}
function setupViewRecalledModal() {
    const modal = document.getElementById('view-recalled-modal');
    const contentDisplay = document.getElementById('recalled-content-display');
    const closeBtn = document.getElementById('close-recalled-modal-btn');

    // 使用事件委托，监听聊天区域内对占位符的点击
    messageArea.addEventListener('click',async (e) => {
        const placeholder = e.target.closest('.recalled-message-placeholder');
        if (!placeholder) return;
        
        const messageId = placeholder.dataset.recalledMessageId;
        const chat = (currentChatType === 'private') 
            ? db.characters.find(c => c.id === currentChatId) 
            : db.groups.find(g => g.id === currentChatId);
        
        if (!chat) return;

        const recalledMessage = chat.history.find(m => m.id === messageId);
        if (recalledMessage && recalledMessage.originalContent) {
            // 从保存的原始内容中提取并显示
            let textToShow = recalledMessage.originalContent;
            
            // 尝试清理包装，让内容更纯粹
            const contentMatch = textToShow.match(/\[.*?的消息：([\s\S]+?)\]/);
            if(contentMatch) {
                textToShow = contentMatch[1];
            }

            contentDisplay.textContent = textToShow;
            modal.classList.add('visible');
        } else {
            showToast('找不到原始消息内容。');
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
    });
}
// ===============================================================

// ===============================================================
// 在 init() 函数之前添加
// V V V V V  请用这段完整代码替换旧的 setupMentions 函数 V V V V V
// ===============================================================
// START: 新增“心灵羁绊”App功能
// ===============================================================
// ===============================================================
// START: 心灵羁绊 - 爱心想你功能
// ===============================================================
// ===============================================================
// END: 心灵羁绊 - 爱心想你功能
// ===============================================================
// ===============================================================
// 在 init() 函数之前添加这个新函数
// V V V V V  请用这段完整代码替换旧的 setupMomentsEventListeners 函数 V V V V V
// --- 修复版：动态事件监听 (支持点击回复具体的人) ---

// ▼▼▼▼▼▼ 补全缺失的功能函数 (开始) ▼▼▼▼▼▼

/**
 * 缺失函数 1: 获取作者头像和名字
 * 用于解决 renderMoments 报错
 */
function getAuthorProfile(authorId) {
    // 默认备用信息
    let profile = { name: '未知用户', avatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg' };

    // 1. 检查是不是用户自己
    // 尝试获取本地存储的用户信息
    let myProfile = {};
    try {
        if (typeof loadProfileFromStorage === 'function') {
            myProfile = loadProfileFromStorage();
        } else {
             myProfile = {
                id: localStorage.getItem('myTopId') || 'user',
                name: localStorage.getItem('myTopName') || '我',
                avatar: localStorage.getItem('myTopAvatar')
            };
        }
    } catch (e) {}

    if (authorId === (myProfile.id || 'user')) {
        return { name: myProfile.name || '我', avatar: myProfile.avatar };
    }

    // 2. 在所有AI角色中查找
    if (window.db && Array.isArray(window.db.characters)) {
        const character = window.db.characters.find(c => c.id === authorId);
        if (character) {
            return { name: character.remarkName, avatar: character.avatar };
        }
    }

    // 3. 在所有群聊的成员中查找 (以防是群聊成员发的动态)
    if (window.db && Array.isArray(window.db.groups)) {
        for (const group of window.db.groups) {
            if (Array.isArray(group.members)) {
                const member = group.members.find(m => m.id === authorId);
                if (member) {
                    return { name: member.groupNickname, avatar: member.avatar };
                }
            }
        }
    }
    
    return profile; // 如果都找不到，返回默认信息
}

// ▲▲▲▲▲▲ 补全结束 ▲▲▲▲▲▲


// --- AI轨迹功能 ---

// ▼▼▼ 【V2.0 | 轨迹与心声整合版】请用这个函数完整替换旧的 setupTrajectorySystem 和 generateTrajectoryPrompt 函数 ▼▼▼

/**
 * 为AI生成“生活轨迹”的指令
 */
function generateTrajectoryPrompt(character) {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTimeString = `${currentHour}:${currentMinute}`;
    const memory = character.history.slice(-50);
    let historyText = memory.map(msg => {
        const sender = msg.role === 'user' ? character.myName : character.remarkName;
        const contentMatch = msg.content.match(/\[.*?的消息：([\s\S]+?)\]/);
        const cleanContent = contentMatch ? contentMatch[1] : msg.content;
        return `${sender}: ${cleanContent}`;
    }).join('\n');

    let prompt = `你正在扮演角色“${character.realName}”，人设是：${character.persona}。`;
    prompt += `请根据你的人设和我们最近的对话，想象一下你今天从早上到现在的生活轨迹。\n`;
    prompt += `规则：\n`;
    prompt += `1. 生成10个关键的时间点和对应的事件或想法。\n`;
    prompt += `2. 时间点需从早到晚排列。\n`;
    prompt += `3. 事件内容要符合你的人设，并且其中至少有2-3条需要与我（${character.myName}）相关，例如：想我了、看我们的聊天记录、准备给我的惊喜等。\n`;
    prompt += `4. 所有时间点都不能晚于当前时间 ${currentTimeString}。\n`;
    prompt += `5. 每个事件的描述必须非常简洁，不能超过12个字。\n`;
    prompt += `6. 你的输出必须严格遵循以下JSON格式，不要包含任何额外的解释或文字：\n`;
    prompt += `[{"time": "HH:MM", "event": "事件描述"}, {"time": "HH:MM", "event": "事件描述"}, ...]\n\n`;
    prompt += `最近的对话参考如下:\n${historyText}`;

    return prompt;
}

/**
 * 【新增】为AI生成“心声”的指令
 */
function generateHeartSoundPrompt(character) {
    const memory = character.history.slice(-50); // 获取最近50条消息作为上下文
    let historyText = memory.map(msg => {
        const sender = msg.role === 'user' ? character.myName : character.remarkName;
        const contentMatch = msg.content.match(/\[.*?的消息：([\s\S]+?)\]/);
        const cleanContent = contentMatch ? contentMatch[1] : msg.content;
        return `${sender}: ${cleanContent}`;
    }).join('\n');

  
 let prompt = `你正在扮演角色“${character.realName}”，你的人设是：${character.persona}。
现在，请根据我们最近的对话，用你的第一人称视角，写一段**50字以上**的、符合人设的思考或心情记录。

# 格式要求 (必须严格遵守):
1.  你的内心独白**必须**合理划分自然段落。
2.  每个段落的开头需要有两个全角空格的缩进 \`　　\` 以实现美观的排版。
3.  请直接输出带有分段和缩进的内心独白，不要包含任何额外的格式或解释，例如“好的，这是我的想法：”之类的话。

# 内容要求:
- 你的心声需要深刻体现你的性格和人设，符合你当下最真实的心情，是最核心、最私密、最直接的内心独白。

# 对话参考:
最近的对话如下:
${historyText}`;
    
    return prompt;
}

/**
 * [重构] 设置轨迹和心声功能的事件监听
 */
function setupTrajectoryAndHeartSoundSystem() {
    const trajectoryBtn = document.getElementById('ai-trajectory-btn');
    const trajectoryModal = document.getElementById('trajectory-modal');
    const closeTrajectoryBtn = document.getElementById('close-trajectory-modal-btn');
    const heartSoundModal = document.getElementById('heart-sound-modal');
    const closeHeartSoundBtn = document.getElementById('close-heart-sound-modal-btn');
    
    let clickTimeout = null;

    // --- 核心逻辑：区分单击和双击 ---

    trajectoryBtn.addEventListener('click', () => {
        // 清除上一个单击计时器，以防双击时触发单击
        clearTimeout(clickTimeout);

        // 设置一个短暂的延迟来执行单击操作
        clickTimeout = setTimeout(() => {
            trajectoryBtn.classList.toggle('active-heart-sound');
            const isActive = trajectoryBtn.classList.contains('active-heart-sound');
            if (typeof showToast === 'function') {
                showToast(`已切换到 ${isActive ? '心声' : '轨迹'} 模式`);
            }
        }, 250); // 250毫秒的延迟足以判断是否为双击
    });

    trajectoryBtn.addEventListener('dblclick', async () => {
        // 立即清除单击计时器，确保单击操作不会执行
        clearTimeout(clickTimeout);

        if (currentChatType !== 'private' || !currentChatId) return;
        const character = db.characters.find(c => c.id === currentChatId);
        if (!character) return;
        
        const isHeartSoundMode = trajectoryBtn.classList.contains('active-heart-sound');

        if (isHeartSoundMode) {
            // --- 执行“心声”功能 ---
            const modal = document.getElementById('heart-sound-modal');
            const contentEl = document.getElementById('heart-sound-content');
            
            modal.classList.add('visible');
            contentEl.innerHTML = '<div class="placeholder-text">正在倾听心声...</div>';
            document.getElementById('heart-sound-modal-title').textContent = `${character.remarkName}的心声`;

            try {
                const prompt = generateHeartSoundPrompt(character);
                // 修改：使用全局功能模型 API 设置（心声功能）
                const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                           db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                           ? db.functionalApiSettings 
                                           : db.apiSettings; // 容错：如果功能模型未配置，回退到主聊天模型
                const aiResponseText = await callAiApi([{ role: 'user', content: prompt }], functionalSettings);
                contentEl.textContent = aiResponseText;

            } catch (error) {
                console.error('获取AI心声失败:', error);
                contentEl.innerHTML = `<div class="placeholder-text" style="color:red;">获取心声失败：${error.message}</div>`;
            }

        } else {
            // --- 执行原有的“轨迹”功能 ---
            const modal = document.getElementById('trajectory-modal');
            const timelineEl = document.getElementById('trajectory-timeline');
            
            modal.classList.add('visible');
            timelineEl.innerHTML = '<div class="placeholder-text">正在加载轨迹...</div>';
            document.getElementById('trajectory-modal-title').textContent = `${character.remarkName}的轨迹`;

            try {
                const prompt = generateTrajectoryPrompt(character);
                // 修改：使用全局功能模型 API 设置（轨迹功能）
                const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                           db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                           ? db.functionalApiSettings 
                                           : db.apiSettings; // 容错：如果功能模型未配置，回退到主聊天模型
                const aiResponseText = await callAiApi([{ role: 'user', content: prompt }], functionalSettings);
                const jsonMatch = aiResponseText.match(/\[[\s\S]*\]/); 
                if (!jsonMatch) throw new Error("AI的回复中没有找到有效的JSON数组。");
                
                const trajectoryData = JSON.parse(jsonMatch[0]);
                renderTrajectoryTimeline(trajectoryData, character.remarkName);

            } catch (error) {
                console.error('获取AI轨迹失败:', error);
                timelineEl.innerHTML = `<div class="placeholder-text" style="color:red;">获取轨迹失败：${error.message}</div>`;
            }
        }
    });

    // --- 关闭弹窗的事件监听 ---
    closeTrajectoryBtn.addEventListener('click', () => trajectoryModal.classList.remove('visible'));
    trajectoryModal.addEventListener('click', (e) => {
        if (e.target === trajectoryModal) trajectoryModal.classList.remove('visible');
    });

    closeHeartSoundBtn.addEventListener('click', () => heartSoundModal.classList.remove('visible'));
    heartSoundModal.addEventListener('click', (e) => {
        if (e.target === heartSoundModal) heartSoundModal.classList.remove('visible');
    });

    // 轨迹渲染函数（保持不变）
    function renderTrajectoryTimeline(trajectoryData, characterName) {
        const timeline = document.getElementById('trajectory-timeline');
        timeline.innerHTML = '';
        if (!trajectoryData || trajectoryData.length === 0) {
            timeline.innerHTML = '<div class="placeholder-text">未能获取到轨迹信息。</div>';
            return;
        }
        trajectoryData.forEach(item => {
            const div = document.createElement('div');
            div.className = 'trajectory-item';
            div.innerHTML = `
                <span class="trajectory-time">${item.time}</span>
                <p class="trajectory-event">${item.event}</p>
            `;
            timeline.appendChild(div);
        });
    }
}

// ▲▲▲ 添加结束 ▲▲▲

// --- 新代码结束 ---
  // --- 新代码开始 ---
// ===============================================================
// START: 论坛配置功能
// ===============================================================
    // 数据和预设键
    const PRES_KEY = 'forumPresets';
    if (!db.forumSettings) {
        db.forumSettings = {
            worldview: '',
            userPersona: '',
            selectedCharIds: [],
            allowNpcs: true,
            allowUnrelated: false,
            allowRomanticNpcs: false,
            worldBookIds: []
        };
    }

    // DOM 元素
    const openConfigBtn = document.getElementById('open-forum-config-btn');
    const configForm = document.getElementById('forum-config-form');
    const worldviewInput = document.getElementById('forum-worldview');
    const userPersonaInput = document.getElementById('forum-user-persona');
    const charList = document.getElementById('forum-char-selection-list');
    const allowNpcsToggle = document.getElementById('allow-npcs');
    const allowUnrelatedToggle = document.getElementById('allow-unrelated');
    const allowRomanticNpcsToggle = document.getElementById('allow-romantic-npcs');

// ===============================================================
// --- 新代码结束 ---

// ▲▲▲ 粘贴到这里结束 ▲▲▲
// === 聊天记录导入导出功能 ===
/**
 * 导出当前聊天记录
 */
async function exportCurrentChat() {
    console.log('🔵 [导出] 开始导出聊天记录...');
    console.log('🔵 [导出] currentChatId:', currentChatId);
    
    if (!currentChatId) {
        showToast('请先选择一个聊天对象');
        return;
    }

    const character = db.characters.find(c => c.id === currentChatId);
    console.log('🔵 [导出] 找到的角色对象:', character);
    
    if (!character) {
        showToast('未找到当前聊天对象');
        return;
    }

    // ✅ 关键修复：使用 history 而不是 messages
    const historyData = character.history || [];
    console.log('🔵 [导出] 聊天记录数量:', historyData.length);
    console.log('🔵 [导出] 聊天记录内容:', historyData);

    if (historyData.length === 0) {
        console.warn('⚠️ [导出] 警告：当前聊天记录为空！');
    }

    try {
        // 构建导出数据
        const exportData = {
            type: '章鱼喷墨机-SingleChat',
            version: 1,
            exportDate: new Date().toISOString(),
            chatData: {
                id: character.id,
                remarkName: character.remarkName,
                realName: character.realName,
                avatar: character.avatar,
                myName: character.myName,
                history: historyData, // ✅ 修复：导出 history
                // 包含角色设置
                prompt: character.prompt,
                apiInstructions: character.apiInstructions,
                temperature: character.temperature,
                maxTokens: character.maxTokens,
                worldBookIds: character.worldBookIds,
                // 其他相关设置
                chatBg: character.chatBg,
                relationship: character.relationship,
                stickerGroups: character.stickerGroups // 🆕 表情包分组绑定
            }
        };

        console.log('🔵 [导出] 导出数据结构:', exportData);

        // 创建下载链接
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `章鱼喷墨机-${character.remarkName}-${dateStr}.json`;
        link.click();
        URL.revokeObjectURL(url);

        console.log('✅ [导出] 导出成功！文件名:', link.download);
        showToast(`聊天记录已成功导出！(${historyData.length} 条消息)`);
    } catch (error) {
        console.error('❌ [导出] 导出失败:', error);
        showToast(`导出失败: ${error.message}`);
    }
}

/**
 * 导入聊天记录并覆盖当前聊天
 * @param {File} file - JSON文件
 */
async function importCurrentChat(file) {
    console.log('🟢 [导入] 开始导入聊天记录...');
    console.log('🟢 [导入] 文件:', file);
    
    if (!currentChatId) {
        showToast('请先选择一个聊天对象');
        return;
    }

    if (!file) {
        showToast('请选择要导入的文件');
        return;
    }

    const character = db.characters.find(c => c.id === currentChatId);
    console.log('🟢 [导入] 当前角色:', character);
    
    if (!character) {
        showToast('未找到当前聊天对象');
        return;
    }

    console.log('🟢 [导入] 导入前聊天记录数量:', character.history?.length || 0);

    try {
        const text = await file.text();
        console.log('🟢 [导入] 文件读取成功，大小:', text.length);
        
        const data = JSON.parse(text);
        console.log('🟢 [导入] JSON解析成功:', data);

        // 校验文件格式（仅支持章鱼机自己导出的格式）
        if (!data.type || data.type !== '章鱼喷墨机-SingleChat') {
            console.error('❌ [导入] 文件类型错误:', data.type);
            showToast('文件格式不正确，这不是章鱼喷墨机导出的备份文件');
            return;
        }

        // ✅ 修复：检查 history 而不是 messages
        if (!data.chatData || !data.chatData.history) {
            console.error('❌ [导入] 文件内容不完整:', data.chatData);
            showToast('文件内容不完整，缺少聊天记录数据');
            return;
        }

        console.log('🟢 [导入] 待导入的聊天记录数量:', data.chatData.history.length);

        // 确认覆盖
        const confirmed = confirm(
            `⚠️ 严重警告！\n\n这将用备份文件中的数据【完全覆盖】当前与"${character.remarkName}"的聊天记录。\n\n将导入 ${data.chatData.history.length} 条消息。\n\n此操作不可撤销！确定要继续吗？`
        );

        if (!confirmed) {
            console.log('🟢 [导入] 用户取消导入');
            return;
        }

        const importedData = data.chatData;

        // 保留当前角色的ID（防止破坏state）
        const preservedId = character.id;

        // ✅ 关键修复：导入到 history 属性
        console.log('🟢 [导入] 开始覆盖聊天记录...');
        character.history = importedData.history || [];
        console.log('🟢 [导入] 覆盖完成，新的聊天记录数量:', character.history.length);

        // 导入角色设置
        if (importedData.prompt !== undefined) character.prompt = importedData.prompt;
        if (importedData.apiInstructions !== undefined) character.apiInstructions = importedData.apiInstructions;
        if (importedData.temperature !== undefined) character.temperature = importedData.temperature;
        if (importedData.maxTokens !== undefined) character.maxTokens = importedData.maxTokens;
        if (importedData.worldBookIds !== undefined) character.worldBookIds = importedData.worldBookIds;
        if (importedData.chatBg !== undefined) character.chatBg = importedData.chatBg;
        if (importedData.relationship !== undefined) character.relationship = importedData.relationship;
        if (importedData.stickerGroups !== undefined) character.stickerGroups = importedData.stickerGroups; // 🆕 表情包分组绑定
        // 兼容旧格式：如果导入的是旧版本的 shareStickers
        // 严格区分 undefined/null（未配置）和 ''（已配置但为空）
        if (importedData.shareStickers === true && (character.stickerGroups === undefined || character.stickerGroups === null)) {
            // 只有当 stickerGroups 是 undefined 或 null 时，才进行兼容处理
            // 如果它是 ''（空字符串），说明用户已经明确清空了，不要动它
            const allGroups = getAllStickerGroups();
            const hasUngrouped = db.myStickers.some(s => !s.group || s.group.trim() === '');
            if (hasUngrouped) allGroups.unshift('未分类');
            character.stickerGroups = allGroups.join(',');
            console.log('🔵 [导入] 兼容旧版 shareStickers，自动绑定所有分组');
        }

        // 确保ID不变
        character.id = preservedId;
        console.log('🟢 [导入] 保留角色ID:', preservedId);

        // 保存到数据库
        console.log('🟢 [导入] 开始保存数据...');
        await saveData();
        console.log('🟢 [导入] 数据保存成功');

        // 刷新界面
        console.log('🟢 [导入] 开始刷新界面...');
        window.chatUiCore.renderMessages();
        console.log('✅ [导入] 导入完成！');
        
        showToast(`聊天记录已成功导入！(${character.history.length} 条消息)`);

        // 关闭设置面板
        const settingsSidebar = document.getElementById('chat-settings-sidebar');
        if (settingsSidebar) {
            settingsSidebar.classList.remove('active');
        }

    } catch (error) {
        console.error('❌ [导入] 导入失败:', error);
        console.error('❌ [导入] 错误堆栈:', error.stack);
        if (error instanceof SyntaxError) {
            showToast('文件格式错误，无法解析JSON');
        } else {
            showToast(`导入失败: ${error.message}`);
        }
    }
}


// === 新增的AI总结并清空历史记录的函数 ===
async function clearHistoryDirectly() {
    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
    if (!chat) return;

    if (chat.history.length === 0) {
        showToast('没有聊天记录可清空。');
        return;
    }

    const sidebar = (currentChatType === 'private') ? settingsSidebar : groupSettingsSidebar;
    sidebar.classList.remove('open');

    // 1. 清空内存中的历史记录
    chat.history = [];

    // 2. 清除 IndexedDB 中存储的消息块（关键步骤！）
    await dataStorage.clearChatMessages(currentChatId, currentChatType);

    // 3. 保存数据到本地存储
    await saveData();

    // 4. 刷新UI
    window.chatUiCore.renderMessages(false, true); // 刷新聊天界面
    renderChatList(); // 刷新聊天列表
    showToast('聊天记录已清空！');
}
// ▼▼▼ 在这里粘贴下面的新代码 ▼▼▼

// --- AI空间 (AI POV Chat) 功能 [由AI生成对话的修改版] ---

// 用于临时存储AI生成数据的全局变量
let currentAiPovData = {
    mainAi: null,
    chatList: [],
    conversations: {} // key是povChatId
};
/**
 * [新的辅助函数] 检查两个角色是否可能根据其人设和世界书相互认识。
 * @param {object} charA - 第一个角色对象。
 * @param {object} charB - 第二个角色对象。
 * @returns {boolean} - 如果确认相识则返回 true，否则返回 false。
 */
function charactersAreAcquainted(charA, charB) {
    // 获取两个角色的所有已知名称，用于检查提及。
    const namesA = [charA.realName, charA.remarkName].filter(Boolean);
    const namesB = [charB.realName, charB.remarkName].filter(Boolean);

    // 将人设和所有关联的世界书内容合并为每个角色的单个上下文字符串。
    const getWorldBookContent = (char) => {
        return (char.worldBookIds || [])
            .map(id => db.worldBooks.find(wb => wb.id === id))
            .filter(Boolean)
            .map(wb => wb.content)
            .join(' ');
    };

    const contextA = `${charA.persona || ''} ${getWorldBookContent(charA)}`;
    const contextB = `${charB.persona || ''} ${getWorldBookContent(charB)}`;

    // 进行双向检查。
    // 角色A的上下文（人设或世界书）是否提及了角色B的名字？
    const aKnowsB = namesB.some(name => contextA.includes(name));
    // 角色B的上下文（人设或世界书）是否提及了角色A的名字？
    const bKnowsA = namesA.some(name => contextB.includes(name));

    // 只要任意一方的上下文中提到了对方，就认为他们相识。
    return aKnowsB || bKnowsA;
}
/**
 * 为AI生成“聊天列表”的指令
 * @param {object} mainAi - 主视角AI的角色对象
 * @param {Array} allOtherCharacters - 其他所有可互动的AI角色列表
 * @param {object} userProfile - 用户信息对象
 * @returns {string} - 发给大语言模型的完整指令
 */
/**
 * [新增的辅助函数] 更智能地从AI返回的文本中提取并解析JSON。
 * @param {string} text - 从AI获取的原始文本回复。
 * @returns {object} - 解析成功后的JavaScript对象或数组。
 * @throws {Error} - 如果在文本中找不到或无法解析有效的JSON，则抛出错误。
 */
function extractAndParseJson(text) {
    // 优先尝试从Markdown代码块中提取JSON
    const codeBlockMatch = text.match(/```(json)?\s*([\s\S]+?)\s*```/);
    if (codeBlockMatch && codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch);
        } catch (e) {
            console.warn("无法从Markdown代码块中解析JSON，将尝试后备方法。", e);
        }
    }

    // 后备方法：寻找第一个 '{' 或 '['，并匹配到其对应的 '}' 或 ']'
    const firstBracket = text.indexOf('[');
    const firstBrace = text.indexOf('{');
    let startIndex = -1;

    if (firstBracket === -1 && firstBrace === -1) {
        throw new Error("AI的回复中没有找到JSON对象或数组的起始符号。");
    }

    if (firstBracket === -1) {
        startIndex = firstBrace;
    } else if (firstBrace === -1) {
        startIndex = firstBracket;
    } else {
        startIndex = Math.min(firstBracket, firstBrace);
    }
    
    const startChar = text[startIndex];
    const endChar = startChar === '[' ? ']' : '}';
    
    let nestingLevel = 0;
    let endIndex = -1;

    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === startChar) {
            nestingLevel++;
        } else if (text[i] === endChar) {
            nestingLevel--;
        }

        if (nestingLevel === 0) {
            endIndex = i;
            break;
        }
    }

    if (endIndex === -1) {
        throw new Error("无法在AI回复中找到匹配的JSON结束符号。");
    }

    const jsonString = text.substring(startIndex, endIndex + 1);
    
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("最终JSON解析失败。提取出的字符串为:", jsonString);
        throw e; 
    }
}
/**
 /**
 * [重写] 设置AI空间应用的所有事件和逻辑
 */
/**
 * [重写] 背景对话生成功能，以确保与AI空间功能解耦
 */
/**
 * [新的辅助函数] 检查两个角色是否可能根据其人设和世界书相互认识。
 * @param {object} charA - 第一个角色对象。
 * @param {object} charB - 第二个角色对象。
 * @returns {boolean} - 如果确认相识则返回 true，否则返回 false。
 */
function charactersAreAcquainted(charA, charB) {
    // 获取两个角色的所有已知名称，用于检查提及。
    const namesA = [charA.realName, charA.remarkName].filter(Boolean);
    const namesB = [charB.realName, charB.remarkName].filter(Boolean);

    // 将人设和所有关联的世界书内容合并为每个角色的单个上下文字符串。
    const getWorldBookContent = (char) => {
        return (char.worldBookIds || [])
            .map(id => db.worldBooks.find(wb => wb.id === id))
            .filter(Boolean)
            .map(wb => wb.content)
            .join(' ');
    };

    const contextA = `${charA.persona || ''} ${getWorldBookContent(charA)}`;
    const contextB = `${charB.persona || ''} ${getWorldBookContent(charB)}`;

    // 进行双向检查。
    // 角色A的上下文（人设或世界书）是否提及了角色B的名字？
    const aKnowsB = namesB.some(name => contextA.includes(name));
    // 角色B的上下文（人设或世界书）是否提及了角色A的名字？
    const bKnowsA = namesA.some(name => contextB.includes(name));

    // 只要任意一方的上下文中提到了对方，就认为他们相识。
    return aKnowsB || bKnowsA;
}


/**
 * [修订版] 触发并生成两个AI角色之间的后台对话。
 * 该对话只会在两个角色被确认相互认识的情况下发生。
 * @param {object} characterA - 刚刚与用户互动的那个角色。
 */
async function generateBackgroundChat(characterA) {
    // 如果没有足够的角色进行对话，则中止。
    if (currentChatType !== 'private' || db.characters.length < 2) return;

    // 找到用户的最后一条消息，作为对话的触发器。
    const lastUserMessage = characterA.history.findLast(m => m.role === 'user');
    if (!lastUserMessage) return;

    const otherCharacters = db.characters.filter(c => c.id !== characterA.id);

    // --- 核心逻辑变更 ---
    // 筛选潜在的聊天伙伴列表，只保留那些认识 characterA 的角色。
    const potentialPartners = otherCharacters.filter(charB => charactersAreAcquainted(characterA, charB));

    // 如果没有找到认识的角色，则不执行任何操作。
    if (potentialPartners.length === 0) {
        console.log(`[后台聊天] ${characterA.remarkName} 没有认识的伙伴可以聊天。`);
        return;
    }

    // 从认识的角色列表中随机选择一个伙伴。
    const characterB = potentialPartners[Math.floor(Math.random() * potentialPartners.length)];
    // --- 核心逻辑变更结束 ---

    const prompt = `你是一个聊天模拟器。你的任务是根据一个触发事件，在两个AI角色之间生成一段简短、真实的对话。
    
    角色A (对话发起者):
    - 名字: ${characterA.realName}
    - 人设: ${characterA.persona}
    
    角色B (对话接收者):
    - 名字: ${characterB.realName}
    - 人设: ${characterB.persona}

    触发事件 (这是用户刚刚对角色A说的话): "${lastUserMessage.content.replace(/\[.*?的消息：|\]/g, '')}"

    任务:
    1. 角色A主动找角色B，就“触发事件”开始一段对话。
    2. 生成2到4句对话。
    3. 严格保持两个角色的人设。
    4. 你的输出必须是严格的JSON数组格式，像这样: [{"sender": "${characterA.realName}", "content": "第一句话"}, {"sender": "${characterB.realName}", "content": "第二句话"}]
    
    请直接开始生成JSON，不要包含任何额外的解释。`;

    try {
        // 修改：使用全局功能模型 API 设置（AI后台对话功能）
        const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                   db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                   ? db.functionalApiSettings 
                                   : db.apiSettings; // 容错：如果功能模型未配置，回退到主聊天模型
        
        let messagesForApi;
        if (functionalSettings.provider === 'gemini') {
            messagesForApi = [{ role: 'user', parts: [{ type: 'text', text: prompt }] }];
        } else {
            messagesForApi = [{ role: 'user', content: prompt }];
        }
        
        const aiResponseText = await callAiApi(messagesForApi, functionalSettings);
        const jsonMatch = aiResponseText.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) {
            console.warn("背景对话生成失败: AI回复中未找到有效的JSON数组。", aiResponseText);
            return;
        }

        const newMessages = JSON.parse(jsonMatch[0]);

        if (!characterA.povChats) characterA.povChats = [];
        
        let povChat = characterA.povChats.find(pc => pc.otherCharId === characterB.id);
        if (!povChat) {
            povChat = {
                id: `pov_${characterA.id}_${characterB.id}`,
                otherCharId: characterB.id,
                history: []
            };
            characterA.povChats.push(povChat);
        }

        povChat.history.push(...newMessages);
        if (povChat.history.length > 20) {
            povChat.history = povChat.history.slice(povChat.history.length - 20);
        }
        
        console.log(`已生成 ${characterA.remarkName} 和 ${characterB.remarkName} 之间的背景对话。`);

    } catch (error) {
        console.error("生成背景对话失败:", error);
    }
}
// ===============================================================
// START: 新增拉黑功能核心代码
// ===============================================================

/**
 * 设置拉黑功能的所有事件监听和逻辑
 */
function setupBlockFeature() {
    const blockBtn = document.getElementById('block-user-btn');
    if (blockBtn) {
        blockBtn.addEventListener('click', handleUserBlockToggle);
    }
}

async function handleUserBlockToggle() {
    if (currentChatType !== 'private') return;
    const character = db.characters.find(c => c.id === currentChatId);
    if (!character) return;

    character.isBlockedByUser = !character.isBlockedByUser; // 切换状态

    let displayMessageContent = '';
    let contextMessageContent = '';
    
    if (character.isBlockedByUser) {
        // ** 进入拉黑状态 **
        character.userBlockTimestamp = Date.now();
        displayMessageContent = `[system-display:你已将 ${character.remarkName} 拉黑。]`;
        contextMessageContent = `[system: 你已被 ${character.myName} 拉黑。]`;
        showToast(`已拉黑 ${character.remarkName}`);
        
    } else {
        // ** 解除拉黑状态 **
        character.userBlockTimestamp = null;
        displayMessageContent = `[system-display:${character.remarkName} 已被你解除拉黑。]`;
        contextMessageContent = `[system: ${character.myName} 已将你解除拉黑。]`;

        // 如果有暂存的消息，需要特殊处理
        if (character.pendingMessages && character.pendingMessages.length > 0) {
            const missedMessagesText = character.pendingMessages
                .map(msg => msg.content.replace(/\[.*?的消息：|\]/g, ''))
                .join('\n- ');
            contextMessageContent += ` 在你被拉黑期间，${character.myName} 发送了以下消息，请你一次性地对这些内容作出回应：\n- ${missessedMessagesText}`;
            
            // 将暂存消息正式移入历史并清空
            character.history.push(...character.pendingMessages);
            character.pendingMessages = [];
        }
        
        showToast(`已解除对 ${character.remarkName} 的拉黑`);
        getAiReply(); // 解除后立即触发一次AI回复
    }

    // 创建用于在界面上显示的系统提示消息
    const displayMessage = {
        id: `msg_block_display_${Date.now()}`,
        role: 'system', // 关键：这是一个系统角色的消息
        content: displayMessageContent,
        parts: [],
        timestamp: Date.now()
    };

    // 创建用于告知AI上下文的、不可见的用户消息
    const contextMessage = {
        id: `msg_block_context_${Date.now()}`,
        role: 'user',
        content: contextMessageContent,
        parts: [{ type: 'text', text: contextMessageContent }],
        timestamp: Date.now()
    };

    // 将两条消息都加入历史记录
    character.history.push(displayMessage, contextMessage);

    await saveData();
    updateBlockButtonState(character);
    window.chatUiCore.renderMessages(false, true); // 刷新界面以显示新的系统提示
}
/**
 * 更新拉黑按钮的文字和样式
 * @param {object} character - 当前角色对象
 */
function updateBlockButtonState(character) {
    const blockBtn = document.getElementById('block-user-btn');
    if (blockBtn) {
        if (character.isBlockedByUser) {
            blockBtn.textContent = '解除拉黑';
            blockBtn.classList.remove('btn-danger');
            blockBtn.classList.add('btn-primary');
        } else {
            blockBtn.textContent = '拉黑';
            blockBtn.classList.add('btn-danger');
            blockBtn.classList.remove('btn-primary');
        }
    }
}

/**
 * 检查用户是否被AI拉黑，并更新UI
 */
function checkAndUpdateUiForAiBlock() {
    if (currentChatType !== 'private') return;
    const character = db.characters.find(c => c.id === currentChatId);
    const isBlocked = character && character.isBlockedByAi;

    getReplyBtn.disabled = isBlocked || isGenerating;
    // 禁用或启用图标栏的所有按钮
    document.querySelectorAll('#sticker-bar .sticker-bar-btn').forEach(btn => {
        btn.disabled = isBlocked;
        btn.style.opacity = isBlocked ? 0.5 : 1;
        btn.style.cursor = isBlocked ? 'not-allowed' : 'pointer';
    });
}

/**
 * 当AI发送 [block-user] 指令时调用
 * @param {object} character - 被操作的角色对象
 */
/**
 * 当AI发送 [block-user] 指令时调用
 * @param {object} character - 被操作的角色对象
 */
async function activateAiBlock(character) {
    character.isBlockedByAi = true;
    character.aiBlockTimestamp = Date.now();
    const duration = parseInt(db.apiSettings.aiBlockDuration, 10);
    if (duration > 0) {
        character.blockEndTime = Date.now() + duration * 60 * 1000;
    } else {
        character.blockEndTime = null;
    }

    // [核心修正] 创建一个用于在界面上显示的、正确的系统提示消息
    const displayMessage = {
        id: `msg_ai_block_display_${Date.now()}`,
        role: 'system',
        content: `[system-display:你已被 ${character.remarkName} 拉黑。]`,
        parts: [],
        timestamp: Date.now()
    };
    character.history.push(displayMessage);

    await saveData();

    if (character.id === currentChatId) {
        checkAndUpdateUiForAiBlock();
        // 直接调用 addMessageBubble 来显示新的系统提示
        addMessageBubble(displayMessage); 
        showToast(`你已被 ${character.remarkName} 拉黑`);
    }
}
/**
 * 当AI发送 [unblock-user] 指令或定时器到期时调用
 * @param {object} character - 被操作的角色对象
 * @param {boolean} isAuto - 是否为自动解封
 */
/**
 * 当AI发送 [unblock-user] 指令或定时器到期时调用
 * @param {object} character - 被操作的角色对象
 * @param {boolean} isAuto - 是否为自动解封
 */
async function deactivateAiBlock(character, isAuto = false) {
    character.isBlockedByAi = false;
    character.aiBlockTimestamp = null;
    character.blockEndTime = null;

    // [核心修正] 创建正确的系统提示消息
    const displayMessageContent = `[system-display:${character.remarkName} 已将你解除拉黑。]`;
    const displayMessage = {
        id: `msg_ai_unblock_display_${Date.now()}`,
        role: 'system',
        content: displayMessageContent,
        parts: [],
        timestamp: Date.now()
    };

    const contextMessageContent = `[system: 你已将 ${character.myName} 解除拉黑。${isAuto ? '（根据预设时间自动操作）' : ''}]`;
    const contextMessage = {
        id: `msg_unblock_context_${Date.now()}`,
        role: 'user', // 作为用户消息，确保AI能看到并据此回应
        content: contextMessageContent,
        parts: [{ type: 'text', text: contextMessageContent }],
        timestamp: Date.now()
    };
    
    // 将显示消息和上下文消息都加入历史
    character.history.push(displayMessage, contextMessage);

    await saveData();

    if (character.id === currentChatId) {
        checkAndUpdateUiForAiBlock();
        // 刷新整个聊天界面以正确显示所有新消息
        window.chatUiCore.renderMessages(false, true); 
        showToast(`${character.remarkName} 已将你解除拉黑`);
    }
}
/**
 * 定时器，用于检查并自动解除到期的AI拉黑
 */
function checkTimedUnblocks() {
    const now = Date.now();
    db.characters.forEach(char => {
        if (char.isBlockedByAi && char.blockEndTime && now >= char.blockEndTime) {
            console.log(`自动解除对 ${char.remarkName} 的拉黑...`);
            deactivateAiBlock(char, true);
        }
    });
}

// ===============================================================
// END: 拉黑功能核心代码
// ===============================================================
let isCheckingInactivity = false;

/**
 * Sets up the main timer for checking user inactivity across all chats.
 */
function setupProactiveAiSystem() {
    // Check every minute
    setInterval(checkAllChatsForInactivity, 60 * 1000);
    console.log("AI后台回复系统已启动。");
}

/**
 * Iterates through all chats and triggers proactive AI actions if conditions are met.
 */
// ▼▼▼ 第二步：完整替换 checkAllChatsForInactivity 函数 (增加随机触发概率) ▼▼▼
async function checkAllChatsForInactivity() {
    if (isCheckingInactivity) {
        return;
    }
    isCheckingInactivity = true;
    // console.log("正在检查用户不活跃聊天...");
    const now = Date.now();
    const allChats = [
        ...db.characters.map(c => ({ chat: c, type: 'private' })),
        ...db.groups.map(g => ({ chat: g, type: 'group' }))
    ];

    for (const { chat, type } of allChats) {
        // 检查此聊天的独立设置
        if (!chat.aiProactiveChatEnabled || !chat.aiProactiveChatDelay ||
            chat.aiProactiveChatDelay <= 0) {
            continue; // 如果此聊天未开启后台回复，则跳过
        }

        if (!chat.history || chat.history.length === 0) {
            continue; // 跳过空聊天
        }

        // 找到最后一条来自用户的消息
        const lastUserMessage = [...chat.history].reverse().find(m => m.role === 'user');
        
        // 如果没有用户消息，则无法判断不活跃状态
        if (!lastUserMessage) {
            continue;
        }

        const timeSinceUserLastSpoke = now - lastUserMessage.timestamp;
        const initialDelayMs = chat.aiProactiveChatDelay * 60 * 1000;

        // 如果用户不活跃的时间尚未达到初始延迟，则跳过
        if (timeSinceUserLastSpoke < initialDelayMs) {
            continue;
        }

        // 此时，确认用户已处于不活跃状态，现在判断是否应该发送消息
        const lastMessage = chat.history[chat.history.length - 1];
        const timeSinceLastMessage = now - lastMessage.timestamp;
        
        // 如果未设置间隔，则默认使用初始延迟作为间隔
        const intervalMs = (chat.aiProactiveChatInterval > 0 ? chat.aiProactiveChatInterval :
            chat.aiProactiveChatDelay) * 60 * 1000;

        // 核心判断逻辑
        if (lastMessage.role === 'user' || (lastMessage.role === 'assistant' &&
            timeSinceLastMessage > intervalMs)) {
            
            // === 核心修改：加入“自主决定”概率 (70% 概率触发) ===
            // 每次检查（每分钟）只有 70% 的概率触发。
            // 这意味着 AI 不会像机器人一样卡点回复，而是会有随机的“延迟感”和“犹豫感”。
            if (Math.random() > 0.7) {
                console.log(`[拟人化] ${chat.remarkName || chat.name} 决定此时暂不打扰，稍后再看。`);
                continue; 
            }
            // === 修改结束 ===

            console.log(`检测到不活跃聊天: ${chat.name || chat.remarkName}。触发 AI 后台回复。`);
            
            if (type === 'private') {
                await triggerProactivePrivateReply(chat);
            } else {
                await triggerProactiveGroupReply(chat);
            }

            // 等待 5 秒，避免对 API 造成过大压力
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    isCheckingInactivity = false;
}

/**
 * Triggers a proactive action for a private chat (either send a message or interact with a Moment).
 * @param {object} character - The character object for the private chat.
 */
async function triggerProactivePrivateReply(character) {
    // 30% chance to interact with a Moment, 70% chance to send a message
    if (Math.random() < 0.3 && window.AppDB_Moments) {
        const success = await triggerProactiveMomentInteraction(character);
        if (!success) {
            await triggerProactiveMessage(character, 'private');
        }
    } else {
        await triggerProactiveMessage(character, 'private');
    }
}

/**
 * Triggers a proactive message for a group chat.
 * @param {object} group - The group object.
 */
async function triggerProactiveGroupReply(group) {
    await triggerProactiveMessage(group, 'group');
}

/**
 * Generates and sends a proactive message from the AI.
 * @param {object} chatObject - The character or group object.
 * @param {string} type - 'private' or 'group'.
 */
// --- 新代码开始 ---

// --- 新代码开始 ---

// --- 新代码开始 ---
// ▼▼▼ 第三步：完整替换 triggerProactiveMessage 函数 (注入精准时间感知) ▼▼▼
async function triggerProactiveMessage(chatObject, type) {
    let systemPrompt = '';
    const now = Date.now();

    // === 核心修改：构建时间感知信息 ===
    let timeContext = "";
    
    // 检查是否开启了“时间感知加强”
    if (db.apiSettings && db.apiSettings.timePerceptionEnabled) {
        // 1. 获取当前精确时间
        const nowDate = new Date();
        const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const currentTimeStr = `${nowDate.getFullYear()}年${nowDate.getMonth() + 1}月${nowDate.getDate()}日 ${weekDays[nowDate.getDay()]} ${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;
        
        // 2. 计算距离上次用户发言的时间差
        let timeGapStr = "一段时间";
        const lastUserMsg = [...chatObject.history].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
            timeGapStr = formatTimeGap(now - lastUserMsg.timestamp);
        }

        // 3. 组合成提示词
        timeContext = `(重要参考信息：当前现实时间是 ${currentTimeStr}。距离用户上一次回复你，已经过去了 ${timeGapStr}。)`;
    }
    // === 修改结束 ===

    if (type === 'private') {
        systemPrompt = `[system: 用户 ${chatObject.myName} 已经有段时间没有回复了。${timeContext}
请你根据自己的人设、当前的时间点以及我们之前的对话，主动发起一个新的话题，或者用自然的方式询问对方正在做什么。
**注意**：请根据“过去的时间长短”来决定你的语气。如果只过了几分钟，不要表现得像过了好几年一样；如果过了好几天，可以表现得更思念或担忧。回复必须自然，就像是真实的人在微信上发消息一样。]`;
    } else { // group
        systemPrompt = `[system: 用户 ${chatObject.me.nickname} 已经有段时间没有在群里说话了。${timeContext}
请你们（AI 成员们）根据各自的人设，开始一段自然的群聊来活跃气氛，或者尝试把话题引向用户感兴趣的方向。]`;
    }

    const proactivePromptMessage = {
        id: `proactive_${now}`,
        role: 'user',
        content: systemPrompt,
        parts: [{ type: 'text', text: systemPrompt }],
        timestamp: now
    };

    if (type === 'group') {
        proactivePromptMessage.senderId = 'user_me';
    }

    chatObject.history.push(proactivePromptMessage);

    try {
        let fullSystemPrompt;
        let historyForApi;

        if (type === 'private') {
            fullSystemPrompt = generatePrivateSystemPrompt(chatObject);
            historyForApi = chatObject.history.slice(-chatObject.maxMemory);
        } else {
            fullSystemPrompt = generateGroupSystemPrompt(chatObject);
            historyForApi = chatObject.history.slice(-chatObject.maxMemory);
        }

        const messages = [
            { role: 'system', content: fullSystemPrompt },
            ...historyForApi.map(msg => ({ role: msg.role, content: msg.content }))
        ];

        // 修改：使用全局功能模型 API 设置（AI后台主动回复功能）
        const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                   db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                   ? db.functionalApiSettings 
                                   : db.apiSettings; // 容错：如果功能模型未配置，回退到主聊天模型
        const aiResponseText = await callAiApi(messages, functionalSettings);

        // 重要：在处理回复前，先从历史记录中移除我们添加的系统指令，避免污染历史
        chatObject.history.pop();

        const cleanedResponse = await processAiCommands(aiResponseText, chatObject);
        const messageRegex = /(\[[\s\S]*?\]|<div class="ai-theater"[\s\S]*?<\/div>)/g;
        let replies = cleanedResponse.match(messageRegex) || [];

        // 🆕 线下模式保底机制：如果正则匹配失败，使用原始文本
        if (replies.length === 0 && chatObject.isOfflineMode && cleanedResponse.trim().length > 0) {
             const fixedContent = `[${chatObject.realName}的消息：${cleanedResponse.trim()}]`;
             replies = [fixedContent];
        }

        // 🆕 额外保底：如果 cleanedResponse 有内容但 replies 为空
        if (replies.length === 0 && cleanedResponse.trim().length > 0) {
            console.warn('⚠️ [主动聊天-消息解析] 正则匹配失败，启用保底机制，使用原始文本');
            let fallbackContent = cleanedResponse.trim();
            if (fallbackContent.startsWith('[') && fallbackContent.endsWith(']')) {
                fallbackContent = fallbackContent.slice(1, -1);
            }
            const looseMatch = fallbackContent.match(/.*?[:：]\s*(.*)/s);
            if (looseMatch && looseMatch[1]) {
                const extractedText = looseMatch[1].trim();
                if (extractedText.length > 0) {
                    const roleName = chatObject.realName || chatObject.remarkName || 'AI';
                    replies = [`[${roleName}的消息：${extractedText}]`];
                }
            } else {
                const roleName = chatObject.realName || chatObject.remarkName || 'AI';
                replies = [`[${roleName}的消息：${fallbackContent}]`];
            }
        }

        if (replies.length > 0) {
            for (const replyContent of replies) {
                // 🆕 提取和验证消息内容（保底机制）
                let finalContent = replyContent.trim();
                
                // 尝试用宽松的正则提取内容（支持中英文冒号，允许空格）
                const contentMatch = finalContent.match(/\[.*?[:：]\s*([\s\S]+?)\]/s);
                if (contentMatch && contentMatch[1] && contentMatch[1].trim().length > 0) {
                    const extractedText = contentMatch[1].trim();
                    const roleName = chatObject.realName || chatObject.remarkName || 'AI';
                    finalContent = `[${roleName}的消息：${extractedText}]`;
                } else {
                    // 🚨 关键保底：正则匹配失败，检查原始内容
                    if (finalContent.trim().length === 0) {
                        console.error('❌ [主动聊天-消息解析] 提取的内容为空，跳过此消息');
                        continue;
                    }
                    let cleanedText = finalContent;
                    if (cleanedText.startsWith('[') && cleanedText.endsWith(']')) {
                        cleanedText = cleanedText.slice(1, -1).trim();
                    }
                    if (cleanedText.length > 0) {
                        const roleName = chatObject.realName || chatObject.remarkName || 'AI';
                        finalContent = `[${roleName}的消息：${cleanedText}]`;
                        console.warn('⚠️ [主动聊天-消息解析] 格式不匹配，使用清理后的原始文本');
                    } else {
                        console.error('❌ [主动聊天-消息解析] 清理后内容仍为空，跳过此消息');
                        continue;
                    }
                }

                const message = {
                    id: `msg_proactive_${Date.now()}_${Math.random()}`,
                    role: 'assistant',
                    content: finalContent,
                    parts: [{ type: 'text', text: finalContent }],
                    timestamp: Date.now(),
                };

                if (type === 'group') {
                    // 🆕 放宽正则匹配：支持中英文冒号
                    const nameMatch = message.content.match(/\[(.*?)(?:的消息|的语音|发送的表情包|发来的照片\/视频)[:：]/);
                    if (nameMatch) {
                        const sender = chatObject.members.find(m => m.realName === nameMatch[1] || m.groupNickname === nameMatch[1]);
                        if (sender) {
                            message.senderId = sender.id;
                        }
                    }
                }
                chatObject.history.push(message);
            }

            await saveData();
            renderChatList();

            if (chatObject.id === currentChatId) {
                window.chatUiCore.renderMessages(false, true);
            } else {
                addNotificationToQueue({
                    avatar: chatObject.avatar,
                    text: `<strong>${chatObject.name || chatObject.remarkName}</strong><br>给你发来了一条新消息...`,
                    chatId: chatObject.id,
                    type: type
                });
            }
        }

    } catch (error) {
        console.error(`AI 后台回复失败 for ${chatObject.name || chatObject.remarkName}:`, error);
        chatObject.history.pop(); // 出错也要移除指令
    }
}

// --- 新代码结束 ---
// --- 新代码结束 ---
/**
 * Triggers an AI to interact with a user's Moment.
 * @param {object} character - The character object that will perform the interaction.
 * @returns {boolean} - True if an interaction was successfully triggered, false otherwise.
 */
async function triggerProactiveMomentInteraction(character) {
    if (window.dynamicsHandler && typeof window.dynamicsHandler.triggerProactiveMomentInteraction === 'function') {
        return window.dynamicsHandler.triggerProactiveMomentInteraction(character);
    }
    return false;
}
        init();
    });

// START: 新增 - HTML小剧场安全交互处理函数
// [修正] 将函数附加到 window 对象，使其成为全局函数，以便 HTML onclick 可以调用
// START: 修复版 handleTheaterClick (精准定位，只操作当前剧场内部元素)
window.handleTheaterClick = function(element, action, targetSelector, value) {
    try {
        const sourceElement = element && element.target ? element.target : element && element.currentTarget ? element.currentTarget : element;
        if (!sourceElement || sourceElement.nodeType !== 1 || typeof sourceElement.closest !== 'function') {
            return;
        }
        const theaterRoot = sourceElement.closest('.ai-generated-theater') || sourceElement.closest('.ai-theater');
        
        if (!theaterRoot) {
            console.warn("未找到小剧场根容器，无法执行操作。");
            return;
        }

        // 2. 在 *当前小剧场内部* 查找目标元素
        // 这样即使页面上有100个 id="page1" 的元素，我们也只会找到当前这一个
        const targetElement = theaterRoot.querySelector(targetSelector);
        
        if (!targetElement) {
             // 如果直接查找失败，尝试查找带后缀的ID (因为我们之前加了后缀)
             // 这一步是为了兼容旧的ID逻辑
             const suffixMatch = theaterRoot.innerHTML.match(/id=["']([a-zA-Z0-9_-]+?)_([a-zA-Z0-9]{6})["']/);
             if (suffixMatch) {
                 const suffix = suffixMatch[2];
                 const selectorWithoutHash = targetSelector.replace('#', '');
                 const newSelector = `#${selectorWithoutHash}_${suffix}`;
                 const retryTarget = theaterRoot.querySelector(newSelector);
                 if (retryTarget) {
                     performAction(retryTarget, action, value);
                     return;
                 }
             }
             return;
        }

        performAction(targetElement, action, value);

    } catch (e) {
        console.error("处理小剧场交互时出错:", e);
    }

    function performAction(el, act, val) {
        switch (act) {
            case 'toggle-class':
                el.classList.toggle(val);
                break;
            case 'add-class':
                el.classList.add(val);
                break;
            case 'remove-class':
                el.classList.remove(val);
                break;
            case 'set-text':
                el.textContent = val;
                break;
            case 'show': // 专门用于页面切换
                el.style.display = 'block';
                break;
            case 'hide': // 专门用于页面切换
                el.style.display = 'none';
                break;
             case 'switch-tab': 
                // 这是一个高级操作：隐藏当前组的所有其他页，只显示目标页
                // 需要按钮提供 grouping class，例如 "tab-page"
                const groupClass = val; // 假设 val 传的是 "tab-page"
                const container = el.parentElement; 
                if (container) {
                    const allTabs = container.querySelectorAll('.' + groupClass);
                    allTabs.forEach(tab => tab.style.display = 'none'); // 隐藏同一组的所有页
                    el.style.display = 'block'; // 显示目标页
                }
                break;
        }
    }
}

// END: 新增 - HTML小剧场安全交互处理函数


// === ChatGPT 插入脚本：我的人设预设逻辑（放到页面脚本块） === 

;(function(){
  if (window._myPersonaPresetScriptLoaded) return;
  window._myPersonaPresetScriptLoaded = true;

  // 存取 localStorage
  function _getMyPersonaPresets() {
    try { return JSON.parse(localStorage.getItem('myPersonaPresets') || '[]'); }
    catch(e){ return []; }
  }
  function _saveMyPersonaPresets(arr) {
    localStorage.setItem('myPersonaPresets', JSON.stringify(arr || []));
  }

  // 填充下拉
  function populateMyPersonaSelect() {
    const sel = document.getElementById('mypersona-preset-select');
    if (!sel) return;
    const presets = _getMyPersonaPresets();
    sel.innerHTML = '<option value="">— 选择预设 —</option>';
    presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  // 保存当前侧栏（我的人设 + 我的头像）为预设
  function saveCurrentMyPersonaAsPreset() {
    const personaEl = document.getElementById('setting-my-persona');
    const avatarEl = document.getElementById('setting-my-avatar-preview');
    if (!personaEl || !avatarEl) return (window.showToast && showToast('找不到我的人设或头像控件')) || alert('找不到我的人设或头像控件');
    const persona = personaEl.value.trim();
    const avatar = avatarEl.src || '';
    if (!persona && !avatar) return (window.showToast && showToast('人设和头像都为空，无法保存')) || alert('人设和头像都为空，无法保存');
    const name = prompt('请输入预设名称（将覆盖同名预设）：');
    if (!name) return;
    const presets = _getMyPersonaPresets();
    const idx = presets.findIndex(p => p.name === name);
    const preset = { name, persona, avatar };
    if (idx >= 0) presets[idx] = preset; else presets.push(preset);
    _saveMyPersonaPresets(presets);
    populateMyPersonaSelect();
    (window.showToast && showToast('我的人设预设已保存')) || console.log('我的人设预设已保存');
  }

  // 将预设应用到当前聊天（同时写 UI + db.characters，并保存）
  async function applyMyPersonaPresetToCurrentChat(presetName) {
    const presets = _getMyPersonaPresets();
    const p = presets.find(x => x.name === presetName);
    if (!p) { (window.showToast && showToast('未找到该预设')) || alert('未找到该预设'); return; }

    // 更新界面
    const personaEl = document.getElementById('setting-my-persona');
    const avatarEl = document.getElementById('setting-my-avatar-preview');
    if (personaEl) personaEl.value = p.persona || '';
    if (avatarEl) avatarEl.src = p.avatar || '';

    // 尝试写入当前 chat 对象（与气泡预设做法一致）
    try {
      if (typeof currentChatId !== 'undefined' && window.db && Array.isArray(db.characters)) {
        const e = db.characters.find(c => c.id === currentChatId);
        if (e) {
          e.myPersona = p.persona || '';
          e.myAvatar = p.avatar || '';
          if (typeof saveData === 'function') await saveData();
          (window.showToast && showToast('预设已应用并保存到当前聊天')) || console.log('预设已应用');
          // 刷新侧栏与列表以显示更新
          if (typeof loadSettingsToSidebar === 'function') try{ loadSettingsToSidebar(); }catch(e){}
          if (typeof renderChatList === 'function') try{ renderChatList(); }catch(e){}
        }
      } else {
        (window.showToast && showToast('预设已应用到界面（未检测到当前聊天保存入口）')) || console.log('预设已应用到界面');
      }
    } catch(err) {
      console.error('applyMyPersonaPresetToCurrentChat error', err);
    }
  }

  // 管理 Modal
  function openManageMyPersonaModal() {
    const modal = document.getElementById('mypersona-presets-modal');
    const list = document.getElementById('mypersona-presets-list');
    if (!modal || !list) return;
    list.innerHTML = '';
    const presets = _getMyPersonaPresets();
    if (!presets.length) list.innerHTML = '<p style="color:#888;margin:6px 0;">暂无预设</p>';
    presets.forEach((p, idx) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px solid #f0f0f0';

      const nameDiv = document.createElement('div');
      nameDiv.style.flex = '1';
      nameDiv.style.whiteSpace = 'nowrap';
      nameDiv.style.overflow = 'hidden';
      nameDiv.style.textOverflow = 'ellipsis';
      nameDiv.textContent = p.name;
      row.appendChild(nameDiv);

      const btnWrap = document.createElement('div');
      btnWrap.style.display = 'flex';
      btnWrap.style.gap = '6px';

      const applyBtn = document.createElement('button');
      applyBtn.className = 'btn btn-primary';
      applyBtn.style.padding = '6px 8px;border-radius:8px';
      applyBtn.textContent = '应用';
      applyBtn.onclick = function(){ applyMyPersonaPresetToCurrentChat(p.name); modal.style.display = 'none'; };

      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn';
      renameBtn.style.padding = '6px 8px;border-radius:8px';
      renameBtn.textContent = '重命名';
      renameBtn.onclick = function(){
        const newName = prompt('输入新名称：', p.name);
        if (!newName) return;
        const all = _getMyPersonaPresets();
        all[idx].name = newName;
        _saveMyPersonaPresets(all);
        openManageMyPersonaModal();
        populateMyPersonaSelect();
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn';
      deleteBtn.style.padding = '6px 8px;border-radius:8px;color:#e53935';
      deleteBtn.textContent = '删除';
      deleteBtn.onclick = function(){
        if (!confirm('确认删除该预设？')) return;
        const all = _getMyPersonaPresets();
        all.splice(idx,1);
        _saveMyPersonaPresets(all);
        openManageMyPersonaModal();
        populateMyPersonaSelect();
      };

      btnWrap.appendChild(applyBtn);
      btnWrap.appendChild(renameBtn);
      btnWrap.appendChild(deleteBtn);
      row.appendChild(btnWrap);

      list.appendChild(row);
    });

    modal.style.display = 'flex';
  }

  // 绑定 UI
  function bind() {
    populateMyPersonaSelect();
    const saveBtn = document.getElementById('mypersona-save-btn');
    const manageBtn = document.getElementById('mypersona-manage-btn');
    const applyBtn = document.getElementById('mypersona-apply-btn');
    const select = document.getElementById('mypersona-preset-select');
    const modalClose = document.getElementById('mypersona-close-modal');

    if (saveBtn) saveBtn.addEventListener('click', saveCurrentMyPersonaAsPreset);
    if (manageBtn) manageBtn.addEventListener('click', openManageMyPersonaModal);
    if (applyBtn) applyBtn.addEventListener('click', function(){ const v = select.value; if(!v) return (window.showToast && showToast('请选择要应用的预设')) || alert('请选择要应用的预设'); applyMyPersonaPresetToCurrentChat(v); });
    if (modalClose) modalClose.addEventListener('click', function(){ document.getElementById('mypersona-presets-modal').style.display='none'; });

    // 页面可能在加载后改变侧栏数据，尝试在 DOMContentLoaded 或已有绑定后初始化
    // 当有其他代码重置 sidebar 时，可手动调用 populateMyPersonaSelect()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else setTimeout(bind,50);
  

})();



  // 初始化默认值（可按需替换为动态数据）
  (function(){
    document.addEventListener('DOMContentLoaded', function(){
      try {
        // 默认文本，遵循你的要求
        const defaults = {
          name: 'Skeleton',
          signature: '把心情写在这里吧♥',
          id: 'user',
          location: '自定义定位',
          avatarSrc: null, // null 使用白色默认图
          heroBg: '#000' // 纯黑背景
        };

        const nameEl = document.getElementById('icity-name');
        const sigEl = document.getElementById('icity-signature');
        const idEl = document.getElementById('icity-id');
        const locEl = document.getElementById('icity-loc-text');
        const avatarEl = document.getElementById('icity-avatar');
        const heroEl = document.getElementById('icity-hero');

        if (nameEl) nameEl.textContent = defaults.name;
        if (sigEl) sigEl.textContent = defaults.signature;
        if (idEl) idEl.textContent = defaults.id;
        if (locEl) locEl.textContent = defaults.location;
        if (heroEl) heroEl.style.background = defaults.heroBg;

        // ---- Profile helpers: load/save/render ----
        window.loadProfileFromStorage = function(){
            return {
                name: localStorage.getItem('myTopName') || defaults.name,
                id: localStorage.getItem('myTopId') || defaults.id,
                location: localStorage.getItem('myTopLoc') || defaults.location,
                signature: localStorage.getItem('myTopSignature') || defaults.signature,
                avatar: localStorage.getItem('myTopAvatar') || (defaults.avatarSrc || ''),
                heroBg: localStorage.getItem('myTopBg') || (defaults.heroBg || '')
            };
        }
        function saveProfileToStorage(profile){
            if(profile.name!=null) localStorage.setItem('myTopName', profile.name);
            if(profile.id!=null) localStorage.setItem('myTopId', profile.id);
            if(profile.location!=null) localStorage.setItem('myTopLoc', profile.location);
            if(profile.signature!=null) localStorage.setItem('myTopSignature', profile.signature);
            if(profile.avatar!=null) localStorage.setItem('myTopAvatar', profile.avatar);
            if(profile.heroBg!=null) localStorage.setItem('myTopBg', profile.heroBg);
            if(profile.name!=null) myTopName = profile.name;
            if(profile.avatar!=null) myTopAvatar = profile.avatar;
            window.syncAppState();
        }
        function renderProfileAndSync(){
            const p = loadProfileFromStorage();
            myTopName = p.name;
            myTopAvatar = p.avatar;
            window.syncAppState();
            if(nameEl) nameEl.textContent = p.name;
            if(sigEl) sigEl.textContent = p.signature;
            if(idEl) idEl.textContent = p.id;
            if(locEl) locEl.textContent = p.location;
            if(avatarEl){
                if(p.avatar) avatarEl.src = p.avatar;
                // also update global avatar displays
                document.querySelectorAll('.my-avatar, #moments-screen .top-avatar, .top-avatar').forEach(img=>{
                    if(img.tagName==='IMG') img.src = p.avatar || '';
                    else img.style.backgroundImage = p.avatar? `url('${p.avatar}')` : '';
                });
                // update moment avatars (sync instead of snapshot)
                document.querySelectorAll('.moment-avatar, .post .avatar-img').forEach(img=>{
                    if(img.tagName==='IMG') img.src = p.avatar || img.src;
                });
            }
            if(heroEl){
                if(p.heroBg){
                    if(p.heroBg.startsWith('http') || p.heroBg.startsWith('data:') || p.heroBg.startsWith('url(')){
                        heroEl.style.backgroundImage = `url('${p.heroBg}')`;
                        heroEl.style.backgroundSize = 'cover';
                        heroEl.style.backgroundPosition = 'center';
                    } else {
                        heroEl.style.background = p.heroBg;
                    }
                } else {
                    heroEl.style.background = defaults.heroBg;
                }
            }
            if(typeof renderMoments === 'function') {
                try{ renderMoments(); }catch(e){}
            } else if(window.dynamicsHandler && typeof window.dynamicsHandler.render === 'function'){
                try{ window.dynamicsHandler.render(); }catch(e){}
            }
        }

        // ---- Click handlers per your requirement (separate triggers) ----
        // Clicking hero edits background; clicking avatar edits avatar
        try {
            const bgBtn = document.getElementById('edit-bg-btn');
            const avatarBtn = document.getElementById('edit-avatar-btn');
            if(heroEl) heroEl.addEventListener('click', ()=> { if(bgBtn) bgBtn.click(); });
            if(avatarEl) avatarEl.addEventListener('click', ()=> { if(avatarBtn) avatarBtn.click(); });
        } catch(e){ console.warn('bind bg/avatar click failed', e); }

        // Inline edit helper for text fields (name, id, location, signature)
        function inlineEditText(el, key, placeholder){
            if(!el) return;
            el.style.cursor = 'text';
            el.addEventListener('click', function handler(e){
                e.stopPropagation();
                const old = el.textContent || '';
                const input = document.createElement('input');
                input.type = 'text';
                input.value = old;
                input.placeholder = placeholder || '';
                input.style.fontSize = window.getComputedStyle(el).fontSize;
                input.style.width = '100%';
                input.style.boxSizing = 'border-box';
                el.replaceWith(input);
                input.focus();
                function commit(){
                    const v = input.value.trim();
                    const profile = loadProfileFromStorage();
                    profile[key] = v;
                    saveProfileToStorage(profile);
                    renderProfileAndSync();
                    input.removeEventListener('blur', onBlur);
                    input.removeEventListener('keydown', onKey);
                }
                function onBlur(){ commit(); input.replaceWith(el); }
                function onKey(ev){ if(ev.key === 'Enter'){ commit(); input.replaceWith(el); } else if(ev.key==='Escape'){ input.replaceWith(el); } }
                input.addEventListener('blur', onBlur);
                input.addEventListener('keydown', onKey);
            }, { once: false });
        }

        inlineEditText(nameEl, 'name', '请输入名称');
        inlineEditText(idEl, 'id', '请输入ID（将作为 authorId）');
        inlineEditText(locEl, 'location', '请输入定位文本');
        inlineEditText(sigEl, 'signature', '请输入个性签名');

        // Initial render from storage
        renderProfileAndSync();

        if (defaults.avatarSrc) {
          avatarEl.src = defaults.avatarSrc;
        }

        // 头像点击事件占位
        const wrap = document.getElementById('icity-avatar-wrap');
        if (wrap) {
          wrap.addEventListener('click', function(){
            console.log('icity avatar clicked');
          });
        }

      } catch (e) {
        console.warn('icity header init error', e);
      }
    });
  })();



;(function() {
  // 等 DOM 完全加载
  document.addEventListener('DOMContentLoaded', () => {
    // --- 全局辅助函数 ---
    window.getAuthorNameById = function(authorId) {
        if (!authorId) return '未知';
        // 优先从顶栏信息获取自己的名字
        if (typeof loadProfileFromStorage === 'function') {
            const myProfile = loadProfileFromStorage();
            if (myProfile && myProfile.id === authorId) {
                return myProfile.name || '我';
            }
        }
        // 从全局 db 对象查找
        if (window.db) { // This now refers to the main data object, not Dexie.
            if (window.db.characters) {
                const character = window.db.characters.find(c => c.id === authorId);
                if (character) return character.remarkName;
            }
            if (window.db.groups) {
                for (const group of window.db.groups) {
                    if (group.members) {
                        const member = group.members.find(m => m.id === authorId);
                        if (member) return member.groupNickname;
                    }
                }
            }
        }
        // Fallback
        return authorId.startsWith('char_') ? '某角色' : authorId;
    };

    // --- 简单工具函数 ---
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));
    function escapeText(t) { return String(t == null ? '' : t); }

    let db = window.AppDB_Moments;
    if (!db) {
      return;
    }
    // 2) DOM 元素
    const openPostBtn = $('#open-post-modal');
    const postModal = $('#post-modal');
    const postForm = $('#post-form');
    const addImageCheckbox = $('#add-image');
    const imageInputGroup = $('#image-input-group');
    const postImageInput = $('#post-image');
    const imageDescInput = $('#image-description');
    const postImagePreview = $('#post-image-preview');
    const cancelPostBtn = $('#cancel-post-btn');
    const momentsContainer = $('#moments-container');
    const momentsEmpty = $('#moments-empty');
    const momentsScreen = $('#moments-screen');
    const bottomNavHost = document.getElementById('bottom-nav-host');
if (typeof setupMentions === 'function') {
        try {
            setupMentions();
        } catch (e) {
            console.error("在动态模块中初始化提及功能失败:", e);
        }
    }
    // 3) 绑定打开/关闭发布模态
    if (openPostBtn) openPostBtn.addEventListener('click', () => {
      postModal.style.display = 'flex';
      postModal.classList.add('visible');
    });
    if (cancelPostBtn) cancelPostBtn.addEventListener('click', closePostModal);
    function closePostModal() {
      postModal.style.display = 'none';
      postModal.classList.remove('visible');
      postForm.reset();
      // 清理图片预览与文件输入，避免残留 dataURL 或页面 URL 导致后续发布异常
      try { postImagePreview.src = ''; } catch(e){}
      try { const pi = document.getElementById('post-image'); if(pi) pi.value = ''; } catch(e){}
      postImagePreview.style.display = 'none';
      imageInputGroup.style.display = 'none';
    }

    if (window.dynamicsHandler && typeof window.dynamicsHandler.setupImageHandlers === 'function') {
      window.dynamicsHandler.setupImageHandlers(addImageCheckbox, imageInputGroup, postImagePreview);
    }

    // 4) 发布动态（写入 Dexie）
    

// --- Replaced postForm submit handler (injected by assistant) ---
postForm.addEventListener('submit', async (ev) => {
  if (window.dynamicsHandler && typeof window.dynamicsHandler.handleDynamicSubmit === 'function') {
    return window.dynamicsHandler.handleDynamicSubmit(ev, { closePostModal, postForm });
  }
});



    // 5) 渲染动态列表
// 5) 渲染动态列表 (已修复：正确显示回复关系)
// 5) 渲染动态列表 (终极修复版：强制接管显示，支持盖楼)
// ▼▼▼▼▼▼ 补全丢失的工具函数 ▼▼▼▼▼▼
    function getAuthorProfile(authorId) {
        // 默认备用信息
        let profile = { name: '未知用户', avatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg' };

        // 1. 检查是不是用户自己
        let myProfile = {};
        try {
            if (typeof loadProfileFromStorage === 'function') {
                myProfile = loadProfileFromStorage();
            } else {
                 myProfile = {
                    id: localStorage.getItem('myTopId') || 'user',
                    name: localStorage.getItem('myTopName') || '我',
                    avatar: localStorage.getItem('myTopAvatar')
                };
            }
        } catch (e) {}

        if (authorId === (myProfile.id || 'user')) {
            return { name: myProfile.name || '我', avatar: myProfile.avatar };
        }

        // 2. 在所有AI角色中查找
        if (window.db && Array.isArray(window.db.characters)) {
            const character = window.db.characters.find(c => c.id === authorId);
            if (character) {
                return { name: character.remarkName, avatar: character.avatar };
            }
        }

        // 3. 在所有群聊的成员中查找
        if (window.db && Array.isArray(window.db.groups)) {
            for (const group of window.db.groups) {
                if (Array.isArray(group.members)) {
                    const member = group.members.find(m => m.id === authorId);
                    if (member) {
                        return { name: member.groupNickname, avatar: member.avatar };
                    }
                }
            }
        }
        return profile;
    }
    // ▲▲▲▲▲▲ 工具函数补全结束 ▲▲▲▲▲▲

    // 5) 渲染动态列表 (包含工具函数的完整版)
    async function renderMoments(...args) {
        if (typeof window !== 'undefined' && typeof window.renderMoments === 'function' && window.renderMoments !== renderMoments) {
            return window.renderMoments(...args);
        }
    }

    // 8) hook 底部导航显示逻辑（只在聊天列表 screen 可见时显示）
    // 把 bottom-nav-host 插入到 .phone-screen 内底部，使它在聊天页底部显示
    const phoneScreen = document.querySelector('.phone-screen');

    // === Step3 fix: ensure modal overlays are placed inside .phone-screen so absolute positioning works ===
    (function ensureModalsInPhoneScreen() {
      try {
        const phone = document.querySelector('.phone-screen');
        if (!phone) return;
        // move all modal overlays (only once)
        const modalSelectors = ['#post-modal', '.modal-overlay', '#sticker-modal', '#add-sticker-modal', '#time-skip-modal', '#group-recipient-selection-modal'];
        // Use querySelectorAll to move elements that exist and are not already inside phone
        document.querySelectorAll('.modal-overlay, .action-sheet-overlay, .settings-sidebar, #post-modal, #sticker-modal, #add-sticker-modal, #time-skip-modal, #group-recipient-selection-modal').forEach(el => {
          if (!el) return;
          if (phone.contains(el)) return;
          phone.appendChild(el);
        });
      } catch (e) {
        console.error('ensureModalsInPhoneScreen error', e);
      }
    })();

    
if (phoneScreen && bottomNavHost) {
      // 把导航放入 chat-list-screen 底部，使其仅在该 screen 内渲染与定位
      const chatListScreen = document.getElementById('chat-list-screen');
      if (phoneScreen && bottomNavHost.parentElement !== phoneScreen) {
        phoneScreen.appendChild(bottomNavHost);
      }
      bottomNavHost.style.display = 'none'; // 初始隐藏

      // --- 新增：为用户评论按钮添加事件委托 ---
// --- 最终修正：用户评论按钮点击事件 ---
      momentsContainer.addEventListener('click', async (e) => {
          const postBtn = e.target.closest('.post-comment-btn');
          if (postBtn) {
              e.preventDefault();
              const momentId = postBtn.dataset.momentId;
              const input = postBtn.previousElementSibling;
              const commentText = input.value.trim();

              const replyToCommentId = postBtn.dataset.replyToCommentId || null;
              // 这里的 replyToAuthorId 就是我们在点击评论时存进去的 ID
              const replyToAuthorId = postBtn.dataset.replyToAuthorId || null;

              if (commentText) {
                  if (window.dynamicsHandler && typeof window.dynamicsHandler.saveComment === 'function') {
                      await window.dynamicsHandler.saveComment(momentId, commentText, replyToCommentId, replyToAuthorId);
                  }
                  
                  input.value = '';
                  input.placeholder = '添加评论...';
                  delete postBtn.dataset.replyToCommentId;
                  delete postBtn.dataset.replyToAuthorId; // 清理
                  postBtn.closest('.moment-comment-input-area').classList.remove('visible');
              } else {
                  showToast('评论内容不能为空');
              }
          }
      });

      // 绑定按钮（若已有绑定则保持）
      const navButtons = bottomNavHost.querySelectorAll('.nav-btn');
      navButtons.forEach(btn => {
        if (btn._bound) return;
        btn.addEventListener('click', () => {
          navButtons.forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          const target = btn.getAttribute('data-target');
          if (typeof window.switchScreen === 'function') {
            window.switchScreen(target);
          } else {
            // 简单回退：切换 active 类并触发自定义事件
            document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === target));
            document.dispatchEvent(new CustomEvent('app:screenChanged', { detail: { targetId: target } }));
          }
        });
        btn._bound = true;
      });

      // 初始：如果当前 active 是 chat-list-screen，则显示并保持 chat 按钮 active
      const initActive = document.querySelector('.screen.active');
      if (initActive && initActive.id === 'chat-list-screen') {
        bottomNavHost.style.display = '';
        navButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-target') === 'chat-list-screen'));
      }
      
      // 位置更新函数：根据 chat-list-screen 的 active 类显示/隐藏
function updateBottomNavVisibilityByActive() {
    const chatCls = document.getElementById('chat-list-screen');
    const momentsCls = document.getElementById('moments-screen');
    const forumScreen = document.getElementById('forum-screen');
    const forumThreadScreen = document.getElementById('forum-thread-screen');
    const walletScreen = document.getElementById('wallet-screen'); // <-- 新增这一行

    // --- 修改：在判断条件里加入对论坛和钱包页面的检查 ---
    if ((chatCls && chatCls.classList.contains('active')) ||
        (momentsCls && momentsCls.classList.contains('active')) ||
        (forumScreen && forumScreen.classList.contains('active')) ||
        (forumThreadScreen && forumThreadScreen.classList.contains('active')) ||
        (walletScreen && walletScreen.classList.contains('active')) // <-- 新增这一行
       ) {
      bottomNavHost.style.display = '';
    } else {
      bottomNavHost.style.display = 'none';
    }
}
// ▲▲▲ 替换结束 ▲▲▲
      // 立即执行一次
      updateBottomNavVisibilityByActive();

      // 监听 .phone-screen 下 class 变化（屏幕切换通常会触发 class 变化）
      const moTarget = phoneScreen;
      try {
        const mo = new MutationObserver(() => updateBottomNavVisibilityByActive());
        mo.observe(moTarget, { attributes: true, subtree: true, attributeFilter: ['class'] });
      } catch (e) {
        // ignore observer errors
      }
    }

    // 9) 将动态内容与聊天一起发给 AI（挂到 #get-reply-btn）
    const getReplyBtn = $('#get-reply-btn');
    if (getReplyBtn) {
      getReplyBtn.addEventListener('click', async (ev) => {
        // Determine current roleId: try chat-room-title text
        const roleTitleEl = $('#chat-room-title');
        let roleId = roleTitleEl ? roleTitleEl.textContent.trim() : 'role_unknown';
        if (!roleId) roleId = 'role_unknown';

        // collect chat history from #message-area DOM
        const chatArea = $('#message-area');
        let chatText = '';
        if (chatArea) {
          const messages = chatArea.querySelectorAll('.message-bubble');
          const arr = [];
          messages.forEach(mb => {
            // get role name if exists, else fallback to bubble's class
            const wrapper = mb.closest('.message-wrapper');
            let who = wrapper && wrapper.classList.contains('sent') ? '我' : (wrapper && wrapper.classList.contains('received') ? roleId : '');
            arr.push(`${who}: ${mb.textContent.trim()}`);
          });
          chatText = arr.join('\n');
        }

        // pending moments
        const pending = (window.dynamicsHandler && typeof window.dynamicsHandler.getPendingMomentsForRole === 'function')
          ? await window.dynamicsHandler.getPendingMomentsForRole(roleId, 5)
          : [];

        // build a structured prompt (we'll ask AI to return JSON)
        let prompt = `系统：请按 JSON 格式输出：{"chat_reply":"...","moment_comments":[{"momentId":"...","comment":"..."}]}\n\n`;
        prompt += `聊天记录：\n${chatText}\n\n`;
        if (pending && pending.length) {
          prompt += `需要评论的动态（最多 ${pending.length} 条，按序对应 id）：\n`;
          pending.forEach((m, i) => {
            prompt += `${i+1}) id:${m.id}\ntext:${m.text}\nimageDesc:${m.imageDesc || ''}\n\n`;
          });
        } else {
          prompt += '（无待评论的动态）\n';
        }

        // Try to call existing global sendToAI-like function if exists
        let aiRaw = null;
        try {
          if (typeof window.sendToAI === 'function') {
            aiRaw = await window.sendToAI(prompt);
          } else if (typeof window.callAI === 'function') {
            aiRaw = await window.callAI(prompt);
          } else if (typeof window.sendMessageToModel === 'function') {
            aiRaw = await window.sendMessageToModel(prompt);
          }
        } catch (e) {
          console.error('AI call failed', e);
          showToast('AI 请求失败：' + (e.message || e));
          return;
        }

        // 解析 AI 返回（优先 JSON）
        let parsed = null;
        try {
          parsed = typeof aiRaw === 'string' ? JSON.parse(aiRaw) : aiRaw;
        } catch (e) {
          // fallback: 使用原始文本作为 chat 回复
          parsed = { chat_reply: String(aiRaw || ''), moment_comments: [] };
        }

        // 处理聊天回复：把 parsed.chat_reply 插入聊天区域（若页面已有 appendAIMessageToChat 函数优先使用）
        if (parsed && parsed.chat_reply) {
          if (typeof window.appendAIMessageToChat === 'function') {
            window.appendAIMessageToChat(parsed.chat_reply, roleId);
          } else {
            // 尝试在页面直接插入（如果 message-area 存在）
            const mArea = $('#message-area');
            if (mArea) {
              const wrapper = document.createElement('div');
              wrapper.className = 'message-wrapper received';
              const row = document.createElement('div');
              row.className = 'message-bubble received';
              row.textContent = parsed.chat_reply;
              wrapper.appendChild(row);
              mArea.appendChild(wrapper);
              mArea.scrollTop = mArea.scrollHeight;
            }
          }
        }

        // 处理 moment 评论
        if (parsed && Array.isArray(parsed.moment_comments) && parsed.moment_comments.length) {
          // Normalize to array of {momentId, commentText}
          const normalized = parsed.moment_comments.map(mc => {
            return { momentId: mc.momentId || mc.momentId || mc.id || mc.id, commentText: mc.comment || mc.commentText || mc.text || '' };
          }).filter(x => x.momentId);
          if (normalized.length) {
            if (window.dynamicsHandler && typeof window.dynamicsHandler.markMomentsCommentedBy === 'function') {
              await window.dynamicsHandler.markMomentsCommentedBy(normalized, roleId);
            }
          }
        }

      }); // end getReplyBtn click
    } // end if getReplyBtn


    /* simulateAIResponse removed: local simulated AI replies disabled by user request */

// 初始：如果页面当前在 chat-list-screen，显示 bottom nav
    const currentActive = document.querySelector('.screen.active');
    if (currentActive && currentActive.id === 'chat-list-screen') {
      // keep bottom nav visible and make chat button active
      const botNav = document.getElementById('bottom-nav');
      if (botNav) {
        botNav.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-target') === 'chat-list-screen'));
      }
    }

    // 如果初始存在 moments screen active，则 render
    if (currentActive && currentActive.id === 'moments-screen') renderMoments();

    if (typeof window.renderMoments !== 'function' || window.renderMoments === renderMoments) {
        window.renderMoments = renderMoments; // 暴露渲染函数，以便外部模块可以刷新动态列表
    }

  }); // DOMContentLoaded end
})();



/* === 确保 #moments-screen 永远在 .phone-screen 内，并清除会把它推出视窗的内联样式 (自动插入补丁) === */

(function ensureMomentsStaysInPhone() {
  function fixPlacementAndStyles() {
    const phone = document.querySelector('.phone-screen');
    const moments = document.getElementById('moments-screen');
    if (!phone) return;

    // If moments exists, ensure it's inside phone but *do not force inline styles on it*
    if (moments && !phone.contains(moments)) {
      phone.appendChild(moments);
      console.log('[patch] moved #moments-screen into .phone-screen');
    }

    // Only normalize styles for screens *other than* moments-screen or elements managed by injection
    document.querySelectorAll('.screen').forEach(s => {
      if (s.id === 'moments-screen' || s.dataset.managedBy === 'injection') {
        // make sure its stacking context is reasonable but don't clobber its layout
        s.style.zIndex = s.style.zIndex || '0';
        return;
      }
      // Apply conservative safe defaults to other screens
      s.style.position = s.style.position || 'absolute';
      s.style.top = s.style.top || '0';
      s.style.left = s.style.left || '0';
      s.style.right = s.style.right || '0';
      s.style.bottom = s.style.bottom || '0';
      // Avoid removing transforms which some screens might rely on; only clear very specific problematic inline styles
      if ((s.style.transform || '').includes('translate') || (s.style.transform || '').includes('translateY')) {
        // leave transforms intact to avoid breaking animations
      } else {
        s.style.transform = s.style.transform || '';
      }
      s.style.margin = s.style.margin || '';
      // ensure screens stack below nav/modals
      s.style.zIndex = s.style.zIndex || '0';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixPlacementAndStyles);
  } else {
    fixPlacementAndStyles();
  }
  // only run on custom app events; do not poll aggressively to avoid fighting the injected UI
  document.addEventListener('app:screenChanged', fixPlacementAndStyles);
  // run a very infrequent check as a last resort
  setInterval(fixPlacementAndStyles, 5000);
})();



(function(){
    const topSection = document.querySelector('#moments-screen .icity-moments-inner .icity-hero') || document.querySelector('#moments-screen .icity-hero') || document.querySelector('#moments-screen .top-section') || document.querySelector('#moments-screen header');
    const editSheet = document.getElementById('edit-top-section-actionsheet');
    const bgBtn = document.getElementById('edit-bg-btn');
    const avatarBtn = document.getElementById('edit-avatar-btn');
    const cancelBtn = document.getElementById('cancel-edit-top-btn');
    const fileInput = document.getElementById('top-section-file-input');

    let currentEditTarget = null;

    // Restore saved bg & avatar
    const savedBg = localStorage.getItem('myTopBg');
    const savedAvatar = localStorage.getItem('myTopAvatar');
    if(savedBg && topSection) {
        topSection.style.backgroundImage = `url('${savedBg}')`;
        topSection.style.backgroundSize = 'cover';
        topSection.style.backgroundPosition = 'center';
    }
    if(savedAvatar) {
        document.querySelectorAll('.my-avatar, #moments-screen .top-avatar').forEach(img=>{
            if(img.tagName === 'IMG') img.src = savedAvatar;
            else img.style.backgroundImage = `url('${savedAvatar}')`;
        });
    }

    // Previously opened the whole topSection on click — removed to avoid accidental edits during publish.
    // Now only explicit edit controls (avatar/background buttons and per-field clicks) will trigger edits.

    cancelBtn.addEventListener('click', ()=>{
        editSheet.classList.remove('visible');
    });

    function chooseSource(targetType) {
        const url = prompt('输入图片URL，或留空选择本地文件：');
        if(url) {
            applyImage(targetType, url);
        } else {
            currentEditTarget = targetType;
            fileInput.click();
        }
    }

    function applyImage(targetType, dataUrl) {
        if(targetType === 'bg') {
            if(topSection) {
                topSection.style.backgroundImage = `url('${dataUrl}')`;
                topSection.style.backgroundSize = 'cover';
                topSection.style.backgroundPosition = 'center';
            }
            localStorage.setItem('myTopBg', dataUrl);
        } else if(targetType === 'avatar') {
            localStorage.setItem('myTopAvatar', dataUrl);
            document.querySelectorAll('.my-avatar, #moments-screen .top-avatar').forEach(img=>{
                if(img.tagName === 'IMG') img.src = dataUrl;
                else img.style.backgroundImage = `url('${dataUrl}')`;
            });
            // 同步动态列表头像（moment-avatar 为动态列表头像类）
            document.querySelectorAll('.post .avatar-img, .moment-avatar').forEach(img => {
                if(img.tagName === 'IMG') img.src = dataUrl;
                else img.style.backgroundImage = `url('${dataUrl}')`;
            });
            // 尝试更新数据库中属于当前用户(authorId匹配)或无 authorId 但 author 名称匹配的 moments 的 authorAvatar 字段（若存在 db）
            try{
                if(window.AppDB_Moments && typeof AppDB_Moments !== 'undefined' && AppDB_Moments.moments){
                    (async ()=>{
                        try{
                            const all = await AppDB_Moments.moments.toArray();
                            const profile = (typeof loadProfileFromStorage === 'function') ? loadProfileFromStorage() : {
                                name: localStorage.getItem('myTopName') || '我',
                                id: localStorage.getItem('myTopId') || 'user',
                                avatar: localStorage.getItem('myTopAvatar') || null
                            };
                            for(const m of all){
                                // Update moments that explicitly reference this author's id
                                if((m.authorId && m.authorId === profile.id) || (!m.authorId && m.author === profile.name)){
                                    m.authorAvatar = dataUrl;
                                    // If the moment had no authorId, bind it to current profile.id so future syncs work
                                    if(!m.authorId) m.authorId = profile.id;
                                    try{ await AppDB_Moments.moments.put(m); }catch(e){ /* ignore put errors for individual items */ }
                                }
                            }
                            // After DB updates, re-render moments so DOM reflects DB changes
                            if(typeof renderMoments === 'function') try{ renderMoments(); }catch(e){}
                            else if(window.dynamicsHandler && typeof window.dynamicsHandler.render === 'function') try{ window.dynamicsHandler.render(); }catch(e){}
                        }catch(e){}
                    })();
                }
            }catch(e){}
            // Ensure profile render + sync runs to update in-memory DOM and trigger any re-renders
            try{ if(typeof renderProfileAndSync === 'function') renderProfileAndSync(); }catch(e){}
        }
    }
fileInput.addEventListener('change', async (e)=>{
        const file = e.target.files[0];
        if(file) {
            try {
                const compressedUrl = await compressImage(file, { quality: 0.85, maxWidth: 1080, maxHeight: 1920 });
                applyImage(currentEditTarget, compressedUrl);
            } catch (error) {
                if(typeof showToast === 'function') showToast('图片处理失败，请重试');
                console.error('Background image compression failed:', error);
            }
        }
    });

    bgBtn.addEventListener('click', ()=> chooseSource('bg'));
    avatarBtn.addEventListener('click', ()=> chooseSource('avatar'));
})();

// === /Avatar & Background Edit Feature === 


// Avatar sync patch: non-invasive, appended to avoid modifying original logic.
//     Purpose: ensure top avatar updates immediately and moments list does not revert
//     by synchronizing DOM and (if possible) the DB after avatar changes.

    
(function(){
  'use strict';

  // Utility: load profile from existing function if available, otherwise from localStorage
  function loadProfileFallback(){
    try {
      if(typeof loadProfileFromStorage === 'function'){
        var p = loadProfileFromStorage();
        if(p && (p.avatar || p.id || p.name)) return p;
      }
    } catch(e){}
    // fallback to localStorage keys used by the app
    try {
      return {
        id: localStorage.getItem('myTopId') || localStorage.getItem('icity-id') || localStorage.getItem('userId') || null,
        name: localStorage.getItem('myTopName') || localStorage.getItem('icity-name') || localStorage.getItem('userName') || null,
        avatar: localStorage.getItem('myTopAvatar') || localStorage.getItem('icity-avatar-src') || localStorage.getItem('userAvatar') || null,
        signature: localStorage.getItem('myTopSignature') || null,
        location: localStorage.getItem('myTopLocation') || null
      };
    } catch(e){
      return {};
    }
  }

  // Robustly update top-profile DOM elements and common avatar selectors
  function updateTopProfileAndAvatars(){
    try {
      var p = loadProfileFallback() || {};
      var avatar = p.avatar || null;
      // find common top avatar elements
      var avatarSelectors = [
        '#icity-avatar', // explicit id
        '.icity-avatar-wrap img',
        '.top-avatar',
        '.my-avatar',
        '.header-avatar img',
        '.profile-avatar img'
      ];
      avatarSelectors.forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){
          try {
            if(!el) return;
            if(el.tagName === 'IMG'){
              if(avatar) el.src = avatar;
            } else {
              if(avatar) el.style.backgroundImage = "url('"+avatar+"')";
            }
          } catch(e){}
        });
      });

      // update textual profile elements defensively
      var nameEls = [document.getElementById('icity-name'), document.querySelector('.icity-name'), document.querySelector('.profile-name')];
      nameEls.forEach(function(el){
        if(el && p.name) try{ el.textContent = p.name; }catch(e){}
      });
      var sigEls = [document.getElementById('icity-signature'), document.querySelector('.icity-signature')];
      sigEls.forEach(function(el){
        if(el && p.signature) try{ el.textContent = p.signature; }catch(e){}
      });

      // update moments list avatars for moments authored by current profile (best-effort)
      try {
        var id = p.id || null;
        var name = p.name || null;
        var avatars = document.querySelectorAll('.moment-avatar, .post .avatar-img, .post .author-avatar, .item .avatar, .comment .avatar, img[data-role="avatar"]');
        avatars.forEach(function(img){
          try {
            if(!img) return;
            // try dataset or attributes
            var authorId = img.getAttribute('data-author-id') || img.dataset && img.dataset.authorId || null;
            var authorName = img.getAttribute('data-author') || img.getAttribute('data-author-name') || img.dataset && img.dataset.author || null;

            // also try to find author id/name from closest ancestor
            if(!authorId || !authorName){
              var ancestor = img.closest('[data-author-id], [data-author], .moment, .post');
              if(ancestor){
                if(!authorId) authorId = ancestor.getAttribute('data-author-id') || ancestor.getAttribute('data-author') || null;
                if(!authorName) authorName = ancestor.getAttribute('data-author-name') || ancestor.getAttribute('data-author') || null;
                // check for .author-name text
                if(!authorName){
                  var an = ancestor.querySelector('.author-name, .name, .post-author');
                  if(an) authorName = (an.textContent || '').trim();
                }
              }
            }

            // Decision: if authorId matches, or authorName matches (best-effort), update the img.src
            var shouldUpdate = false;
            if(id && authorId && String(authorId) === String(id)) shouldUpdate = true;
            if(!shouldUpdate && name && authorName && String((authorName||'').trim()) === String((name||'').trim())) shouldUpdate = true;

            if(shouldUpdate && avatar){
              if(img.tagName === 'IMG'){
                img.src = avatar;
              } else {
                img.style.backgroundImage = "url('"+avatar+"')";
              }
            }
          } catch(e){}
        });
      } catch(e){}
    } catch(e){}
  }

  // Try to update a Dexie/DB moments table authorAvatar entries for current user (best-effort, non-blocking)
  function tryUpdateDBMomentsAvatar(newAvatar){
    try {
      var p = loadProfileFallback();
      if(!p || !p.id || !newAvatar) return;
      // if window.AppDB_Moments and Dexie-like table exists, try to update entries where authorId matches
      if(window.AppDB_Moments && window.AppDB_Moments.moments){
        try {
          // If it's Dexie or has where API
          if(typeof window.AppDB_Moments.moments.where === 'function' && typeof window.AppDB_Moments.moments.toArray === 'function'){
            // best-effort: update authorAvatar for matching authorId
            // .where('authorId').equals(p.id).modify({ authorAvatar: newAvatar }) might exist
            if(typeof window.AppDB_Moments.moments.where === 'function'){
              try {
                var q = window.AppDB_Moments.moments.where('authorId').equals(p.id);
                if(q && typeof q.modify === 'function'){
                  q.modify(function(obj){ obj.authorAvatar = newAvatar; });
                } else {
                  // fallback: scan and put
                  window.AppDB_Moments.moments.toArray().then(function(arr){
                    arr.forEach(function(item){
                      try {
                        if(item.authorId && String(item.authorId) === String(p.id)){
                          item.authorAvatar = newAvatar;
                          if(window.AppDB_Moments.moments.put) window.AppDB_Moments.moments.put(item);
                        }
                      } catch(e){}
                    });
                  }).catch(function(){});
                }
              } catch(e){}
            }
          } else if(typeof window.AppDB_Moments.moments.update === 'function'){
            // unknown API: attempt to update each by scanning
            try {
              window.AppDB_Moments.moments.toArray().then(function(arr){
                arr.forEach(function(item){
                  if(item.authorId && String(item.authorId) === String(p.id)){
                    item.authorAvatar = newAvatar;
                    try { window.AppDB_Moments.moments.update(item.id, item); } catch(e){}
                  }
                });
              }).catch(function(){});
            } catch(e){}
          }
        } catch(e){}
      }
    } catch(e){}
  }

  // Wrap existing applyImage (if present) so after changing avatar we sync
  if(typeof window.applyImage === 'function'){
    try {
      var origApplyImage = window.applyImage;
      window.applyImage = function(){
        try {
          var res = origApplyImage.apply(this, arguments);
          // schedule sync shortly after (some apps update DOM async)
          setTimeout(function(){
            try {
              updateTopProfileAndAvatars();
              var p = loadProfileFallback();
              if(p && p.avatar) tryUpdateDBMomentsAvatar(p.avatar);
            } catch(e){}
          }, 100);
          return res;
        } catch(e){
          try { return origApplyImage.apply(this, arguments); } catch(e){ return undefined; }
        }
      };
    } catch(e){}
  } else {
    // If applyImage not found, expose a safe function for callers to use
    window.__syncAvatarsAfterChange = function(){
      try {
        updateTopProfileAndAvatars();
        var p = loadProfileFallback();
        if(p && p.avatar) tryUpdateDBMomentsAvatar(p.avatar);
      } catch(e){}
    };
  }

  // Also wrap any generic renderMoments function if present
  if(typeof window.renderMoments === 'function'){
    try {
      var _origRenderMoments = window.renderMoments;
      window.renderMoments = function(){
        try {
          var res = _origRenderMoments.apply(this, arguments);
          setTimeout(function(){ updateTopProfileAndAvatars(); }, 20);
          return res;
        } catch(e){
          try { return _origRenderMoments.apply(this, arguments); } catch(e){ return undefined; }
        }
      };
    } catch(e){}
  }

  // Run once at load to align UI with stored avatar (without waiting for user action)
  try { setTimeout(updateTopProfileAndAvatars, 50); } catch(e){}

  // Expose for debugging (non-enumerable)
  try { Object.defineProperty(window, '__updateProfileAndAvatars', { value: updateTopProfileAndAvatars, writable: false }); } catch(e){}

  // Do not interfere with bottom navigation: avoid touching elements with ids/classes typically used by navbars.
  // The script only touches avatar/name related selectors and moment avatars; it is intentionally conservative.

})();


// Stronger enforcement: bind moment avatars to top avatar persistently 

(function(){
  'use strict';
  // Helper to read top avatar from DOM or storage
  function getTopAvatar(){
    try {
      // Try common selectors for top avatar
      var selectors = ['#icity-avatar', '.icity-avatar-wrap img', '.top-avatar', '.header-avatar img', '.profile-avatar img', '.my-avatar'];
      for(var i=0;i<selectors.length;i++){
        var el = document.querySelector(selectors[i]);
        if(el){
          if(el.tagName === 'IMG' && el.src) return el.src;
          var bg = window.getComputedStyle(el).backgroundImage;
          if(bg && bg !== 'none'){
            // extract url("...") content
            var m = bg.match(/url\(["']?(.*?)["']?\)/);
            if(m && m[1]) return m[1];
          }
        }
      }
      // fallback to storage
      var p = null;
      try { if(typeof loadProfileFromStorage === 'function') p = loadProfileFromStorage(); } catch(e){}
      if(!p) p = {
        avatar: localStorage.getItem('myTopAvatar') || localStorage.getItem('userAvatar') || localStorage.getItem('icity-avatar-src')
      };
      if(p && p.avatar) return p.avatar;
    } catch(e){}
    return null;
  }

  // Helper to determine if an avatar img belongs to current user (best-effort)
  function isAvatarForCurrentUser(imgEl){
    try {
      if(!imgEl) return false;
      var p = (typeof loadProfileFromStorage === 'function') ? loadProfileFromStorage() : null;
      if(!p) p = { id: localStorage.getItem('myTopId'), name: localStorage.getItem('myTopName') };
      var authorId = imgEl.getAttribute('data-author-id') || (imgEl.dataset && imgEl.dataset.authorId) || null;
      var authorName = imgEl.getAttribute('data-author') || imgEl.getAttribute('data-author-name') || (imgEl.dataset && imgEl.dataset.author) || null;
      if(!authorId && !authorName){
        var anc = imgEl.closest('[data-author-id], [data-author], .moment, .post, .item');
        if(anc){
          authorId = authorId || anc.getAttribute('data-author-id') || anc.getAttribute('data-author');
          authorName = authorName || anc.getAttribute('data-author-name') || anc.getAttribute('data-author');
          if(!authorName){
            var authorNameNode = anc.querySelector('.author-name, .name, .post-author, .author');
            if(authorNameNode) authorName = (authorNameNode.textContent || '').trim();
          }
        }
      }
      if(p && p.id && authorId && String(p.id) === String(authorId)) return true;
      if(p && p.name && authorName && String((p.name||'').trim()) === String((authorName||'').trim())) return true;
      // Also check if img has attribute data-me or class 'me' etc
      if(imgEl.hasAttribute('data-me') || imgEl.classList.contains('me') || imgEl.classList.contains('self')) return true;
    } catch(e){}
    return false;
  }

  // Enforce top avatar on matching nodes
  function enforceTopAvatarOnNode(imgEl, topAvatar){
    try {
      if(!imgEl || !topAvatar) return;
      // Avoid touching nav icons: check ancestor tags that might be navbars
      var navAncestor = imgEl.closest('nav, .navbar, .bottom-nav, .footer');
      if(navAncestor) return; // don't modify nav images
      // Only enforce if this img seems like a moment/post avatar
      var selMatch = /(^|\s)(moment-avatar|avatar-img|author-avatar|post-avatar|item-avatar|my-avatar|top-avatar|author-avatar-img)(\s|$)/i;
      var classStr = imgEl.className || '';
      // If it looks like an avatar or is IMG inside .moment/.post, proceed
      var likelyAvatar = classStr && selMatch.test(classStr) || imgEl.closest('.moment, .post, .item, .comment') || imgEl.getAttribute('data-role') === 'avatar';
      if(!likelyAvatar) return;
      if(!isAvatarForCurrentUser(imgEl)) return;
      // If current src differs, set it
      if(imgEl.tagName === 'IMG'){
        if(imgEl.src !== topAvatar){
          try { imgEl.src = topAvatar; } catch(e){}
        }
      } else {
        try { imgEl.style.backgroundImage = "url('"+topAvatar+"')"; } catch(e){}
      }
      // mark as forced to avoid loops
      try { imgEl.setAttribute('data-avatar-forced','1'); } catch(e){}
    } catch(e){}
  }

  // Enforce across the document
  function enforceTopAvatarAll(topAvatar){
    if(!topAvatar) return;
    var selectors = ['.moment-avatar', '.post .avatar-img', '.post .author-avatar', '.item .avatar', '.comment .avatar', 'img[data-role="avatar"]', '.avatar-img'];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(img){
        enforceTopAvatarOnNode(img, topAvatar);
      });
    });
  }

  // Mutation observer to catch src changes and new nodes
  var observer = new MutationObserver(function(muts){
    try {
      var top = getTopAvatar();
      muts.forEach(function(m){
        try {
          if(m.type === 'attributes' && (m.attributeName === 'src' || m.attributeName === 'style' || m.attributeName === 'data-author-id' || m.attributeName === 'data-author')){
            var target = m.target;
            if(target && (target.tagName === 'IMG' || target.nodeType === 1)){
              enforceTopAvatarOnNode(target, top);
            }
          } else if(m.type === 'childList' && m.addedNodes && m.addedNodes.length){
            m.addedNodes.forEach(function(node){
              try {
                if(node.nodeType !== 1) return;
                // find descendant avatar images
                var imgs = node.querySelectorAll && node.querySelectorAll('.moment-avatar, .avatar-img, img[data-role="avatar"], .author-avatar');
                if(imgs && imgs.length){
                  imgs.forEach(function(img){ enforceTopAvatarOnNode(img, top); });
                }
                // also if the node itself is an IMG
                if(node.tagName === 'IMG') enforceTopAvatarOnNode(node, top);
              } catch(e){}
            });
          }
        } catch(e){}
      });
    } catch(e){}
  });

  try {
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['src','style','data-author-id','data-author','data-author-name'] });
  } catch(e){}

  // Also run periodic enforcement for initial seconds to handle race conditions
  var enforcementRuns = 0;
  var enforcementTimer = setInterval(function(){
    try {
      enforcementRuns++;
      var top = getTopAvatar();
      if(top) enforceTopAvatarAll(top);
      // Try to update DB as well to persist
      try {
        if(top && typeof window.__updateProfileAndAvatars === 'function'){
          window.__updateProfileAndAvatars();
        }
      } catch(e){}
      if(enforcementRuns > 40) { // run ~40 times at 200ms => 8 seconds then stop
        clearInterval(enforcementTimer);
      }
    } catch(e){}
  }, 200);

  // Expose a function to explicitly bind list avatars to top avatar and optionally persist to DB
  window.bindMomentsAvatarsToTop = function(persistToDB){
    try {
      var top = getTopAvatar();
      if(!top) return;
      enforceTopAvatarAll(top);
      if(persistToDB){
        // try to update DB entries authorAvatar for current user
        try {
          var p = (typeof loadProfileFromStorage === 'function') ? loadProfileFromStorage() : { id: localStorage.getItem('myTopId') };
          if(p && p.id && window.AppDB_Moments && window.AppDB_Moments.moments){
            if(typeof window.AppDB_Moments.moments.where === 'function' && typeof window.AppDB_Moments.moments.modify === 'function'){
              try { window.AppDB_Moments.moments.where('authorId').equals(p.id).modify(function(o){ o.authorAvatar = top; }); } catch(e){}
            } else if(typeof window.AppDB_Moments.moments.toArray === 'function'){
              window.AppDB_Moments.moments.toArray().then(function(arr){
                arr.forEach(function(item){
                  if(item && item.authorId && String(item.authorId) === String(p.id)){
                    item.authorAvatar = top;
                    try { if(window.AppDB_Moments.moments.put) window.AppDB_Moments.moments.put(item); } catch(e){}
                  }
                });
              }).catch(function(){});
            }
          }
        } catch(e){}
      }
    } catch(e){}
  };

  // Attempt immediate bind once loaded
  try { setTimeout(function(){ window.bindMomentsAvatarsToTop(true); }, 100); } catch(e){}

  // defensive cleanup if script re-inserted: no-op
})();



document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Token 统计按钮（延迟执行，确保 DOM 已加载）
    setTimeout(() => {
        if (typeof updateTokenStatsButton === 'function') {
            updateTokenStatsButton();
        }
    }, 500);
    
    // 修复：为聊天室的返回按钮增加特殊处理，以确保底部导航栏能正确显示
    const chatRoomBackBtn = document.querySelector('#chat-room-screen .back-btn');
    if (chatRoomBackBtn) {
        chatRoomBackBtn.addEventListener('click', () => {
            const targetScreenId = chatRoomBackBtn.dataset.target;
            const navHost = document.getElementById('bottom-nav-host');
            
            // 定义哪些页面应该显示底部导航栏
            const screensWithNav = ['chat-list-screen', 'moments-screen', 'forum-screen', 'wallet-screen'];
            
            if (navHost && screensWithNav.includes(targetScreenId)) {
                navHost.style.display = ''; // 或者 'flex'，取决于你的布局
            }
        });
    }

    // 修复：确保所有打开聊天室的入口都会强制隐藏底部导航栏
    // 我们通过监听一个共同的父元素来实现，这比修改多个函数更高效
    const phoneScreen = document.querySelector('.phone-screen');
    if (phoneScreen) {
        phoneScreen.addEventListener('click', (e) => {
            // 检查点击的是否是一个指向聊天室的聊天条目
            const chatItem = e.target.closest('.chat-item');
            if (chatItem && chatItem.dataset.id && chatItem.dataset.type) {
                const navHost = document.getElementById('bottom-nav-host');
                if (navHost) {
                    navHost.style.display = 'none';
                }
            }
        });
    }
});
