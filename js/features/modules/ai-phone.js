// ===============================================================
// START: 新增AI空间 (AI手机) 功能
// ===============================================================

// --- 全局变量 ---
let currentAiSpaceApp = null;
let currentAiForApp = null;
/**
 * [已更新 V3.0] 设置AI空间所有App的事件监听和核心逻辑 (已集成音乐App)
 */
function setupAiSpaceApps() {
    document.querySelector('[data-target="ai-space-home-screen"]').addEventListener('click', renderAiSpaceHomeScreen);

    document.getElementById('ai-space-app-grid').addEventListener('click', (e) => {
        const appIcon = e.target.closest('.app-icon');
        if (!appIcon) return;
        const appId = appIcon.dataset.appId;
        currentAiSpaceApp = appId;

        // 处理Peek功能（统一到 peek- 前缀）
        if (appId.startsWith('peek-')) {
            openAiSpaceCharacterSelect(appId);
        } else {
            window.showToast('功能开发中');
        }
    });

    document.getElementById('ai-space-select-list').addEventListener('click', (e) => {
        const charItem = e.target.closest('.list-item');
        if (!charItem || !charItem.dataset.id) return;
        currentAiForApp = window.db.characters.find(c => c.id === charItem.dataset.id);
        if (!currentAiForApp) return;
        currentAiForApp.aiSpaceData = currentAiForApp.aiSpaceData || {};

        // 处理Peek功能（统一到 peek- 前缀）
        if (currentAiSpaceApp.startsWith('peek-')) {
            const peekType = currentAiSpaceApp.replace('peek-', '');
            generateAndRenderPeekContent(peekType, currentAiForApp);
        }
    });

    setupPeekFeatureHandlers(); // 设置Peek功能的事件监听（包括signal和music）
}

window.setupAiSpaceApps = setupAiSpaceApps;
window.renderAiSpaceHomeScreen = renderAiSpaceHomeScreen;
window.openAiSpaceCharacterSelect = openAiSpaceCharacterSelect;
window.generatePeekContentPrompt = generatePeekContentPrompt;
window.generateAndRenderPeekContent = generateAndRenderPeekContent;

function renderAiSpaceHomeScreen() {
    const grid = document.getElementById('ai-space-app-grid');
    grid.innerHTML = '';
    
    // 修改：只保留ID列表，不再硬编码图标URL和名称
    // 新增：9个Peek功能（全部统一到 peek- 前缀）
    const appIds = [
        'ai-space-peek-messages', 'ai-space-peek-memos', 'ai-space-peek-cart',
        'ai-space-peek-transfer', 'ai-space-peek-browser', 'ai-space-peek-album',
        'ai-space-peek-unlock', 'ai-space-peek-signal', 'ai-space-peek-music'
    ];

    appIds.forEach(appId => {
        // 新增：从中央图标库读取数据
        const defaultAppInfo = window.defaultIcons[appId];
        const customIconUrl = window.db.customIcons[appId];
        const finalIconUrl = customIconUrl || defaultAppInfo.icon;
        const appName = defaultAppInfo.name;
        // appId 里的 'ai-space-' 前缀只是为了区分，实际功能ID不需要这个前缀
        const functionalAppId = appId.replace('ai-space-', ''); 

        const iconEl = document.createElement('a');
        iconEl.href = '#';
        iconEl.className = 'app-icon';
        iconEl.dataset.appId = functionalAppId; // 使用不带前缀的ID来触发功能
        iconEl.innerHTML = `
            <img src="${finalIconUrl}" alt="${appName}" class="icon-img">
            <span class="app-name">${appName}</span>
        `;
        grid.appendChild(iconEl);
    });
}
/**
 * [已更新 V3.0] 打开通用的AI选择列表页面
 */
function openAiSpaceCharacterSelect(appName) {
    const titles = {
        'peek-messages': '查看谁的消息',
        'peek-memos': '查看谁的备忘录',
        'peek-cart': '查看谁的购物车',
        'peek-transfer': '查看谁的中转站',
        'peek-browser': '查看谁的浏览器',
        'peek-album': '查看谁的相册',
        'peek-unlock': '查看谁的小号',
        'peek-signal': '选择心动对象',
        'peek-music': '听谁的歌单'
    };
    document.getElementById('ai-space-select-title').textContent = titles[appName] || '选择AI';
    
    const list = document.getElementById('ai-space-select-list');
    list.innerHTML = '';

    window.db.characters.forEach(char => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.dataset.id = char.id;
        li.innerHTML = `
            <img src="${char.avatar}" class="chat-avatar">
            <div class="item-details">
                <div class="item-name">${char.remarkName}</div>
            </div>
        `;
        list.appendChild(li);
    });
    
    window.switchScreen('ai-space-character-select-screen');
}


// --- 心动讯号渲染函数 (保留) ---
function renderAiHeartSignal(signal) {
    const contentEl = document.getElementById('ai-signal-content');
    contentEl.innerHTML = `
        <details>
            <summary style="font-weight: bold; color: var(--secondary-color); cursor: pointer; font-size: 16px;">心动瞬间</summary>
            <p style="padding-top: 10px;">${signal.moment}</p>
        </details>
        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 15px 0;">
        <details>
            <summary style="font-weight: bold; color: var(--secondary-color); cursor: pointer; font-size: 16px;">内心想法</summary>
            <p style="padding-top: 10px; font-style: italic; color: #555;">“${signal.thoughts}”</p>
        </details>
    `;
}

function parseSongsFromText(text) {
    if (!text) return [];
    const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const results = [];
    for (const line of lines) {
        let work = line.replace(/^\d+[\.\、\)]\s*/, '').trim();
        if (!work) continue;
        let title = '';
        let artist = '';
        let match = work.match(/歌名[:：]\s*([^\s]+.*?)\s*(歌手|艺人)[:：]\s*(.+)/);
        if (match) {
            title = match[1].trim();
            artist = match[3].trim();
        } else {
            match = work.match(/《([^》]+)》\s*[-—–~·\/|]\s*(.+)/);
            if (match) {
                title = match[1].trim();
                artist = match[2].trim();
            } else {
                match = work.match(/"([^"]+)"\s*[-—–~·\/|]\s*(.+)/);
                if (match) {
                    title = match[1].trim();
                    artist = match[2].trim();
                } else {
                    match = work.match(/([^-\n]+?)\s*[-—–~·\/|]\s*(.+)/);
                    if (match) {
                        title = match[1].trim();
                        artist = match[2].trim();
                    }
                }
            }
        }
        if (title && artist) results.push({ title, artist });
    }
    return results;
}

function resolveMusicCover(coverValue) {
    const normalized = typeof coverValue === 'string' ? coverValue.trim() : '';
    if (!normalized || window.musicCoverPlaceholders.has(normalized)) return window.defaultMusicCoverUrl;
    return normalized;
}

// --- 音乐歌单渲染函数 (保留) ---
/**
 * [已更新 V3.0] 渲染AI的歌单列表 (增加点击播放功能)
 */
function renderAiMusicPlaylist(playlist) {
    const list = document.getElementById('ai-music-playlist-list');
    list.innerHTML = '';
    playlist.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.cursor = 'pointer'; // 让列表项看起来可以点击

        const cover = resolveMusicCover(song.cover || song.albumArt);
        li.innerHTML = `
            <img src="${cover}" alt="album cover" class="music-card-icon" onerror="this.src='${window.defaultMusicCoverUrl}';this.onerror=null;" style="margin-right: 12px;">
            <div class="item-details">
                <div class="item-name">${song.title}</div>
                <div class="item-preview">${song.artist}</div>
            </div>
        `;

        // --- 核心新增：为每个列表项添加点击事件监听 ---
        li.addEventListener('click', async () => {
            const songTitle = song.title || song.name || '';
            const songArtist = song.artist || song.singer || '';
            let existingSong = window.db.playlist.find(s => s.name === songTitle && s.artist === songArtist);

            if (existingSong) {
                const songIndex = window.db.playlist.indexOf(existingSong);
                if (typeof window.playSong === 'function') {
                    await window.playSong(songIndex);
                }
                window.showToast(`正在播放 ${songTitle}`);
            } else {
                if (typeof window.searchAndPlaySong === 'function') {
                    window.showToast("正在为你从云端找歌...");
                    const result = await window.searchAndPlaySong(songTitle, songArtist, { autoplay: false, forceCloud: true });
                    if (!result || typeof result.index !== 'number') {
                        window.showToast(`未找到《${songTitle}》的可播放版本`);
                        return;
                    }
                    if (typeof window.playSong === 'function') {
                        await window.playSong(result.index);
                    }
                } else {
                    window.showToast('当前未启用云端搜索功能');
                    return;
                }
            }

            const musicModal = document.getElementById('music-player-modal');
            if (musicModal) {
                musicModal.classList.add('visible');
            }
        });
        // --- 新增逻辑结束 ---

        list.appendChild(li);
    });
}

// ===============================================================
// START: Peek 手机功能 (移植自 reference_UwU.html)
// ===============================================================

// 用于存储正在生成的应用类型，避免重复点击
const generatingPeekApps = new Set();

/**
 * 生成 Peek 内容的 Prompt
 */
function generatePeekContentPrompt(char, appType, mainChatContext) {
    const appNameMapping = {
        messages: "消息应用（模拟与他人的对话）",
        memos: "备忘录应用",
        cart: "电商平台的购物车",
        transfer: "文件传输助手（用于记录临时想法、链接等）",
        browser: "浏览器历史记录",
        album: "相册"
    };
    const appName = appNameMapping[appType] || appType;

    let prompt = `你正在模拟一个名为 ${char.realName} 的角色的手机内部信息。`;
    prompt += `该角色的核心人设是：${char.persona}。\n`;

    // 获取并注入世界书和用户人设
    const associatedWorldBooks = (char.worldBookIds || []).map(id => window.db.worldBooks.find(wb => wb.id === id)).filter(Boolean);
    if (associatedWorldBooks.length > 0) {
        const worldBookContext = associatedWorldBooks.map(wb => `设定名: ${wb.name}\n内容: ${wb.content}`).join('\n\n');
        prompt += `\n为了更好地理解背景，请参考以下世界观设定：\n---\n${worldBookContext}\n---\n`;
    }
    if (char.myPersona) {
        prompt += `\n作为参考，我（用户）的人设是：${char.myPersona}\n`;
    }

    prompt += `最近，我（称呼为 ${char.myName}）和 ${char.realName} 的对话如下（这是你们关系和当前状态的核心参考）：\n---\n${mainChatContext}\n---\n`;
    prompt += `现在，我正在偷看Ta手机上的"${appName}"。请你基于Ta的人设和我们最近的聊天内容，生成符合该应用场景的、高度相关且富有沉浸感的内容。\n`;
    prompt += `你的输出必须是一个JSON对象，且只包含JSON内容，不要有任何额外的解释或标记。根据应用类型，JSON结构如下：\n`;

    switch (appType) {
        case 'messages':
            prompt += `
            {
              "conversations": [
                {
                  "partnerName": "与Ta对话的人的称呼",
                  "history": [
                    { "sender": "char", "content": "${char.realName}发送的消息内容" },
                    { "sender": "partner", "content": "对方发送的消息内容" }
                  ]
                }
              ]
           }
           请为 ${char.realName} 编造4-7个最近的对话。对话内容需要强烈反映Ta的人设以及和我的聊天上下文。`;
            break;
        case 'album':
            prompt += `
            {
              "photos": [
                { "type": "photo", "imageDescription": "对一张照片的详细文字描述，例如：一张傍晚在海边的自拍，背景是橙色的晚霞和归来的渔船。", "description": "角色对这张照片的一句话批注，例如：那天的风很舒服。" },
                { "type": "video", "imageDescription": "对一段视频的详细文字描述，例如：一段在猫咖撸猫的视频，视频里有一只橘猫在打哈欠。", "description": "角色对这段视频的一句话批注，例如：下次还来这里！" }
              ]
            }
            请为 ${char.realName} 的相册生成7-10个条目（照片或视频）。内容需要与Ta的人设和我们的聊天上下文高度相关。'imageDescription' 是对这张照片/视频的详细文字描述，它将代替真实的图片展示给用户。'description' 是 ${char.realName} 自己对这张照片/视频的一句话批注，会显示在描述下方。`;
            break;
        case 'memos':
            prompt += `
            {
              "memos": [
                { "id": "memo_1", "title": "备忘录标题", "content": "备忘录内容，可以包含换行符\\n" }
              ]
            }
            请生成5-10条备忘录，内容要与Ta的人设和我们的聊天上下文相关。`;
            break;
        case 'cart':
            prompt += `
            {
              "items": [
                { "id": "cart_1", "title": "商品标题", "spec": "商品规格", "price": "25.00" }
              ]
            }
            请生成5-8件商品，这些商品应该反映Ta的兴趣、需求或我们最近聊到的话题。`;
            break;
        case 'browser':
            prompt += `
            {
              "history": [
                { "title": "网页标题", "url": "example.com/path", "annotation": "角色对于这条浏览记录的想法或批注" }
              ]
            }
            请生成5-8条浏览记录。记录本身要符合Ta的人设和我们的聊天上下文，'annotation'字段则要站在角色自己的视角，记录Ta对这条浏览记录的想法或批注。`;
            break;
       case 'transfer':
           prompt += `
           {
             "entries": [
               "要记得买牛奶。",
               "https://example.com/interesting-article",
               "刚刚那个想法不错，可以深入一下..."
             ]
           }
           请为 ${char.realName} 生成5-8条Ta发送给自己的、简短零碎的消息。这些内容应该像是Ta的临时备忘、灵感闪现或随手保存的链接，要与Ta的人设和我们的聊天上下文相关，但比"备忘录"应用的内容更随意、更口语化。`;
           break;
        case 'unlock':
            prompt += `
            {
              "nickname": "角色的微博昵称",
              "handle": "@角色的微博ID",
              "bio": "角色的个性签名，可以包含换行符\\n",
              "posts": [
                { "timestamp": "2小时前", "content": "第一条微博正文内容，140字以内。" },
                { "timestamp": "昨天", "content": "第二条微博正文内容。" },
                { "timestamp": "3天前", "content": "第三条微博正文内容。" }
              ]
            }
            请为 ${char.realName} 生成一个符合其人设的微博小号。你需要生成昵称、ID、个性签名，以及4-6条最近的微博。微博内容要生活化、碎片化，符合小号的风格，并与Ta的人设和我们的聊天上下文高度相关。`;
            break;

            case 'signal':
            prompt += `
            现在，我（${char.myName}）正在查看你的"心动讯号"应用。
            请根据你的人设以及我们**最近的聊天内容**，回忆一个最近让你对我感到心动的瞬间。
            
            规则:
            1. "心动瞬间"是对一个具体事件的描述，要生动、有画面感。
            2. "内心想法"是第一人称的心理活动，要深刻体现你的性格和情感。
            3. 两段内容合计字数不得少于200字。
            4. 你的输出必须是严格的JSON格式，不要包含任何其他文字。

            JSON格式示例:
            {
              "moment": "描述...",
              "thoughts": "想法..."
            }`;
            break;

        case 'music':
            prompt += `
            现在，我（${char.myName}）正在查看你的"音乐歌单"。
            请根据你的人设、性格和最近的心情（参考聊天上下文），创建一个包含5-8首歌曲的私人歌单。
            
            规则:
            1. 歌单的选曲风格必须**非常贴合你的人设**。
            2. 每首歌需要包含"title"(歌名)和"artist"(艺术家)。
            3. 你的输出必须是严格的JSON数组格式。

            JSON格式示例:
            [
              {"title": "夜曲", "artist": "周杰伦"},
              {"title": "Summertime Sadness", "artist": "Lana Del Rey"}
            ]`;
            break;

        default:
            prompt += `{"error": "Unknown app type"}`;
            break;
    }
    return prompt;
}

/**
 * 生成并渲染 Peek 内容
 */
async function generateAndRenderPeekContent(appType, char, options = {}) {
    const { forceRefresh = false } = options;

    if (generatingPeekApps.has(appType)) {
        window.showToast('该应用内容正在生成中，请稍候...');
        return;
    }

    if (!char) {
        window.showToast('无法找到当前角色');
        return;
    }
    
    // 确保 peekData 存在
    if (!char.peekData) char.peekData = {};

    // 检查是否有持久化存储的数据 (优先使用存储的数据)
    if (!forceRefresh && char.peekData[appType]) {
        const cachedData = char.peekData[appType];
        // 直接渲染存储的数据
        switch (appType) {
            case 'messages':
                renderPeekChatList(cachedData.conversations);
                window.switchScreen('peek-messages-screen');
                break;
            case 'album':
                renderPeekAlbum(cachedData.photos);
                window.switchScreen('peek-album-screen');
                break;
            case 'memos':
                renderMemosList(cachedData.memos, char);
                window.switchScreen('peek-memos-screen');
                break;
           case 'transfer':
               renderPeekTransferStation(cachedData.entries);
               window.switchScreen('peek-transfer-station-screen');
               break;
            case 'cart':
                renderPeekCart(cachedData.items);
                window.switchScreen('peek-cart-screen');
                break;
            case 'browser':
                renderPeekBrowser(cachedData.history);
                window.switchScreen('peek-browser-screen');
                break;
           case 'unlock':
               renderPeekUnlock(cachedData, char);
               window.switchScreen('peek-unlock-screen');
               break;
           case 'signal':
               document.getElementById('ai-signal-title').textContent = `${char.remarkName}的心动讯号`;
               renderAiHeartSignal(cachedData);
               window.switchScreen('ai-space-signal-screen');
               break;
           case 'music':
               document.getElementById('ai-music-playlist-title').textContent = `${char.remarkName}的歌单`;
               renderAiMusicPlaylist(cachedData);
               window.switchScreen('ai-space-music-screen');
               break;
       }
       return; // 使用了存储数据，直接结束
    }

    // 如果没有数据或强制刷新，则调用 API 生成
    // 修改：使用全局功能模型 API 设置
    const functionalSettings = window.db.functionalApiSettings && Object.keys(window.db.functionalApiSettings).length > 0 && 
                               window.db.functionalApiSettings.url && window.db.functionalApiSettings.key && window.db.functionalApiSettings.model
                               ? window.db.functionalApiSettings 
                               : window.db.apiSettings; // 容错：如果功能模型未配置，回退到主聊天模型
    
    if (!functionalSettings.url || !functionalSettings.key || !functionalSettings.model) {
        window.showToast('请先在"api"应用中完成全局功能模型设置！');
        return window.switchScreen('api-settings-screen');
    }

    generatingPeekApps.add(appType); // 锁定防止重复点击
    let targetContainer;

    // 显示加载状态
    switch (appType) {
        case 'messages':
            window.switchScreen('peek-messages-screen');
            targetContainer = document.getElementById('peek-chat-list-container');
            targetContainer.innerHTML = '<p class="placeholder-text">正在生成对话列表...</p>';
            break;
        case 'album':
            window.switchScreen('peek-album-screen');
            renderPeekAlbum([]); 
            break;
        case 'memos':
            window.switchScreen('peek-memos-screen');
            renderMemosList([], char); 
            break;
       case 'transfer':
           window.switchScreen('peek-transfer-station-screen');
           renderPeekTransferStation([]);
           break;
        case 'cart':
            window.switchScreen('peek-cart-screen');
            renderPeekCart([]);
            break;
        case 'browser':
            window.switchScreen('peek-browser-screen');
            renderPeekBrowser([]);
            break;
       case 'unlock':
           window.switchScreen('peek-unlock-screen');
           renderPeekUnlock(null, char); 
           break;
       case 'signal':
           window.switchScreen('ai-space-signal-screen');
           document.getElementById('ai-signal-title').textContent = `${char.remarkName}的心动讯号`;
           document.getElementById('ai-signal-content').innerHTML = '<p class="placeholder-text">正在生成心动瞬间...</p>';
           break;
       case 'music':
           window.switchScreen('ai-space-music-screen');
           document.getElementById('ai-music-playlist-title').textContent = `${char.remarkName}的歌单`;
           document.getElementById('ai-music-playlist-list').innerHTML = '<p class="placeholder-text">正在生成歌单...</p>';
           break;
       default:
           window.showToast('无法打开');
           generatingPeekApps.delete(appType); 
           return;
   }

    try {
        const mainChatContext = char.history.slice(-10).map(m => m.content).join('\n');
        const systemPrompt = generatePeekContentPrompt(char, appType, mainChatContext);
        
        // 修改：使用 callAiApi 函数，并显式传入 functionalApiSettings
        const messages = [{ role: 'user', content: systemPrompt }];
        let contentStr = await window.callAiApi(messages, functionalSettings);
        
        console.log(`[${appType}] AI原始返回:`, contentStr); // 方便调试

        // --- 核心修复：精准区分数组和对象 ---
        let jsonStr = null;

        // 1. 先去除 Markdown 代码块标记 (```json ... ```)
        contentStr = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();

        // 2. 根据应用类型，决定是找 [] 还是 {}
        if (appType === 'music') {
            // 特例：只有音乐是纯数组，找被 [] 包裹的内容
            const arrayMatch = contentStr.match(/\[[\s\S]*\]/);
            if (arrayMatch) jsonStr = arrayMatch[0];
        } else {
            // 通用：备忘录、消息、心动讯号、Unlock等，全都是对象，找被 {} 包裹的内容
            // 注意：备忘录虽然里面有数组，但最外层是 { "memos": [] }
            const objectMatch = contentStr.match(/\{[\s\S]*\}/);
            if (objectMatch) jsonStr = objectMatch[0];
        }

        // 3. 容错兜底：如果没找到正则匹配，但字符串本身看起来是对的，就直接用
        if (!jsonStr) {
             if (contentStr.startsWith('[') && contentStr.endsWith(']')) jsonStr = contentStr;
             else if (contentStr.startsWith('{') && contentStr.endsWith('}')) jsonStr = contentStr;
        }

        let generatedData = null;
        let parseError = null;
        if (jsonStr) {
            try {
                generatedData = JSON.parse(jsonStr);
            } catch (err) {
                parseError = err;
            }
        }
        if (!generatedData && appType === 'music') {
            const parsedSongs = parseSongsFromText(contentStr);
            if (parsedSongs.length > 0) generatedData = parsedSongs;
        }
        if (!generatedData) {
            if (parseError) throw parseError;
            throw new Error(`无法从AI返回中提取有效的JSON格式 (${appType === 'music' ? '数组' : '对象'})`);
        }
        // --- 修复结束 ---

        // 数据验证
        let isValid = false;
        switch (appType) {
            case 'messages': isValid = generatedData && Array.isArray(generatedData.conversations); break;
            case 'memos': isValid = generatedData && Array.isArray(generatedData.memos); break;
            case 'album': isValid = generatedData && Array.isArray(generatedData.photos); break;
            case 'cart': isValid = generatedData && Array.isArray(generatedData.items); break;
            case 'transfer': isValid = generatedData && Array.isArray(generatedData.entries); break;
            case 'browser': isValid = generatedData && Array.isArray(generatedData.history); break;
            case 'unlock': isValid = generatedData && generatedData.nickname && Array.isArray(generatedData.posts); break;
            case 'signal': isValid = generatedData && generatedData.moment && generatedData.thoughts; break;
            case 'music': isValid = Array.isArray(generatedData); break;
            default: isValid = false;
        }

        if (!isValid) {
            throw new Error("AI返回的数据格式不符合应用要求。");
        }

        // 将生成的数据保存到角色对象中，并持久化到数据库
        char.peekData[appType] = generatedData;
        await window.saveData(); // 保存到 IndexedDB

        // 渲染内容
        if (appType === 'messages') {
            renderPeekChatList(generatedData.conversations);
        } else if (appType === 'memos') {
            renderMemosList(generatedData.memos, char);
        } else if (appType === 'album') {
            renderPeekAlbum(generatedData.photos);
        } else if (appType === 'transfer') {
           renderPeekTransferStation(generatedData.entries);
        } else if (appType === 'cart') {
            renderPeekCart(generatedData.items);
        } else if (appType === 'browser') {
            renderPeekBrowser(generatedData.history);
        } else if (appType === 'unlock') {
            renderPeekUnlock(generatedData, char);
        } else if (appType === 'signal') {
            renderAiHeartSignal(generatedData);
        } else if (appType === 'music') {
            renderAiMusicPlaylist(generatedData);
        }
    } catch (error) {
        // 修复：直接打印错误并弹窗，不再调用不存在的 showApiError
        console.error("生成内容出错:", error);
        window.showToast(`生成失败: ${error.message}`);
        
        const errorMessage = "内容生成失败，请刷新重试。";
        if (appType === 'album') {
            document.querySelector('#peek-album-screen .album-grid').innerHTML = `<p class="placeholder-text">${errorMessage}</p>`;
        } else if (appType === 'unlock') {
            document.getElementById('peek-unlock-screen').innerHTML = `<header class="app-header"><button class="back-btn" data-target="ai-space-home-screen">‹</button><div class="title-container"><h1 class="title">错误</h1></div><button class="action-btn">···</button></header><main class="content"><p class="placeholder-text">${errorMessage}</p></main>`;
        } else if (targetContainer) {
            targetContainer.innerHTML = `<p class="placeholder-text">${errorMessage}</p>`;
        }
    } finally {
        generatingPeekApps.delete(appType);
    }
}

// ===============================================================
// Peek 渲染函数
// ===============================================================

/**
 * 渲染 Peek 消息列表
 */
function renderPeekChatList(conversations = []) {
    const container = document.getElementById('peek-chat-list-container');
    container.innerHTML = '';

    if (!conversations || conversations.length === 0) {
        return;
    }

    conversations.forEach((convo) => {
        const history = convo.history || [];
        const lastMessage = history.length > 0 ? history[history.length - 1] : null;
        const lastMessageText = lastMessage ? (lastMessage.content || '').replace(/\[.*?的消息：([\s\S]+)\]/, '$1') : '...';
        
        const li = document.createElement('li');
        li.className = 'list-item chat-item';
        li.dataset.name = convo.partnerName;

        const avatarUrl = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';

        li.innerHTML = `
            <img src="${avatarUrl}" alt="${convo.partnerName}" class="chat-avatar">
            <div class="item-details">
                <div class="item-details-row"><div class="item-name">${convo.partnerName}</div></div>
                <div class="item-preview-wrapper">
                    <div class="item-preview">${lastMessageText}</div>
                </div>
            </div>`;
        
        li.addEventListener('click', () => {
            renderPeekConversation(convo.history, convo.partnerName);
            window.switchScreen('peek-conversation-screen');
        });
        
        container.appendChild(li);
    });
}

/**
 * 渲染 Peek 对话详情
 */
function renderPeekConversation(history, partnerName) {
    const titleEl = document.getElementById('peek-conversation-title');
    const messageAreaEl = document.getElementById('peek-message-area');

    titleEl.textContent = partnerName;
    messageAreaEl.innerHTML = '';

    if (!history || history.length === 0) {
        messageAreaEl.innerHTML = '<p class="placeholder-text">正在生成对话...</p>';
        return;
    }

    history.forEach(msg => {
        const isSentByChar = msg.sender === 'char';
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${isSentByChar ? 'sent' : 'received'}`;

        const bubbleRow = document.createElement('div');
        bubbleRow.className = 'message-bubble-row';

        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${isSentByChar ? 'sent' : 'received'}`;
        bubble.textContent = msg.content;

        if (isSentByChar) {
            bubbleRow.appendChild(bubble);
        } else {
            const avatar = document.createElement('img');
            avatar.className = 'message-avatar';
            avatar.src = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
            bubbleRow.appendChild(avatar);
            bubbleRow.appendChild(bubble);
        }
        
        wrapper.appendChild(bubbleRow);
        messageAreaEl.appendChild(wrapper);
    });
    messageAreaEl.scrollTop = messageAreaEl.scrollHeight;
}

/**
 * 渲染备忘录列表
 */
function renderMemosList(memos, char) {
    const screen = document.getElementById('peek-memos-screen');
    let listHtml = '';
    if (!memos || memos.length === 0) {
        listHtml = '<p class="placeholder-text">正在生成备忘录...</p>';
    } else {
        memos.forEach(memo => {
            const firstLine = memo.content.split('\n')[0];
            listHtml += `
                <li class="memo-item" data-id="${memo.id}">
                    <h3 class="memo-item-title">${memo.title}</h3>
                    <p class="memo-item-preview">${firstLine}</p>
                </li>
            `;
        });
    }

    screen.innerHTML = `
        <header class="app-header">
            <button class="back-btn" data-target="ai-space-home-screen">‹</button>
            <div class="title-container"><h1 class="title">备忘录</h1></div>
            <button class="action-btn" id="refresh-peek-memos-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></svg></button>
        </header>
        <main class="content"><ul id="peek-memos-list">${listHtml}</ul></main>
    `;

    if (char) {
        screen.querySelector('#refresh-peek-memos-btn').addEventListener('click', () => {
            generateAndRenderPeekContent('memos', char, { forceRefresh: true });
        });
    }

    screen.querySelectorAll('.memo-item').forEach(item => {
        item.addEventListener('click', () => {
            const memo = memos.find(m => m.id === item.dataset.id); 
            if (memo) {
                renderMemoDetail(memo);
                window.switchScreen('peek-memo-detail-screen');
            }
        });
    });
}

/**
 * 渲染备忘录详情
 */
function renderMemoDetail(memo) {
    const screen = document.getElementById('peek-memo-detail-screen');
    if (!memo) return;
    const contentHtml = memo.content.replace(/\n/g, '<br>');
    screen.innerHTML = `
        <header class="app-header">
            <button class="back-btn" data-target="peek-memos-screen">‹</button>
            <div class="title-container"><h1 class="title">${memo.title}</h1></div>
            <div class="placeholder"></div>
        </header>
        <main class="content" style="padding: 20px; line-height: 1.6;">${contentHtml}</main>
    `;
}

/**
 * 渲染购物车
 */
function renderPeekCart(items) {
   const screen = document.getElementById('peek-cart-screen');
    let itemsHtml = '';
    let totalPrice = 0;

    if (!items || items.length === 0) {
        itemsHtml = '<p class="placeholder-text">正在生成购物车内容...</p>';
    } else {
        items.forEach(item => {
            itemsHtml += `
                <li class="cart-item" data-id="${item.id}">
                    <img src="https://i.postimg.cc/wMbSMvR9/export202509181930036600.png" class="cart-item-image" alt="${item.title}">
                    <div class="cart-item-details">
                        <h3 class="cart-item-title">${item.title}</h3>
                        <p class="cart-item-spec">规格：${item.spec}</p>
                        <p class="cart-item-price">¥${item.price}</p>
                    </div>
                </li>
            `;
            totalPrice += parseFloat(item.price);
        });
    }

   screen.innerHTML = `
       <header class="app-header">
           <button class="back-btn" data-target="ai-space-home-screen">‹</button>
           <div class="title-container"><h1 class="title">购物车</h1></div>
           <button class="action-btn" id="refresh-peek-cart-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></svg></button>
       </header>
       <main class="content"><ul class="cart-item-list">${itemsHtml}</ul></main>
       <footer class="cart-footer">
           <div class="cart-total-price">
               <span class="label">合计：</span>¥${totalPrice.toFixed(2)}
           </div>
           <button class="checkout-btn">结算</button>
       </footer>
   `;
   
   const refreshBtn = screen.querySelector('#refresh-peek-cart-btn');
   if (refreshBtn && currentAiForApp) {
       refreshBtn.addEventListener('click', () => {
           generateAndRenderPeekContent('cart', currentAiForApp, { forceRefresh: true });
       });
   }
   
   screen.querySelector('.checkout-btn').addEventListener('click', () => {
       window.showToast('功能开发中');
   });
}

/**
 * 渲染中转站
 */
function renderPeekTransferStation(entries) {
   const screen = document.getElementById('peek-transfer-station-screen');
    let messagesHtml = '';

    if (!entries || entries.length === 0) {
        messagesHtml = '<p class="placeholder-text">正在生成中转站内容...</p>';
    } else {
        entries.forEach(entry => {
            messagesHtml += `
                <div class="message-wrapper sent">
                    <div class="message-bubble-row">
                        <div class="message-bubble sent" style="background-color: #98E165; color: #000;">
                            ${entry}
                        </div>
                    </div>
                </div>
            `;
        });
    }

   screen.innerHTML = `
       <header class="app-header">
           <button class="back-btn" data-target="ai-space-home-screen">‹</button>
           <div class="title-container">
               <h1 class="title">文件传输助手</h1>
           </div>
           <button class="action-btn" id="refresh-peek-transfer-btn">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></svg>
           </button>
       </header>
       <main class="content">
           <div class="message-area" style="padding: 10px;">
                ${messagesHtml}
           </div>
           <div class="transfer-station-input-area">
               <div class="fake-input"></div>
               <button class="plus-btn"></button>
           </div>
       </main>
   `;

    const refreshBtn = screen.querySelector('#refresh-peek-transfer-btn');
    if (refreshBtn && currentAiForApp) {
        refreshBtn.addEventListener('click', () => {
            generateAndRenderPeekContent('transfer', currentAiForApp, { forceRefresh: true });
        });
    }

    const messageArea = screen.querySelector('.message-area');
    if (messageArea) {
        messageArea.scrollTop = messageArea.scrollHeight;
    }
}

/**
 * 渲染浏览器历史
 */
function renderPeekBrowser(historyItems) {
  const screen = document.getElementById('peek-browser-screen');
  let itemsHtml = '';
    if (!historyItems || historyItems.length === 0) {
        itemsHtml = '<p class="placeholder-text">正在生成浏览记录...</p>';
    } else {
        historyItems.forEach(item => {
            itemsHtml += `
                <li class="browser-history-item">
                    <h3 class="history-item-title">${item.title}</h3>
                    <p class="history-item-url">${item.url}</p>
                    <div class="history-item-annotation">${item.annotation}</div>
                </li>
            `;
        });
    }

  screen.innerHTML = `
      <header class="app-header">
          <button class="back-btn" data-target="ai-space-home-screen">‹</button>
          <div class="title-container"><h1 class="title">浏览器</h1></div>
          <button class="action-btn" id="refresh-peek-browser-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></svg></button>
      </header>
      <main class="content"><ul class="browser-history-list">${itemsHtml}</ul></main>
  `;
  
  const refreshBtn = screen.querySelector('#refresh-peek-browser-btn');
  if (refreshBtn && currentAiForApp) {
      refreshBtn.addEventListener('click', () => {
          generateAndRenderPeekContent('browser', currentAiForApp, { forceRefresh: true });
      });
  }
}

/**
 * 渲染相册
 */
function renderPeekAlbum(photos) {
    const screen = document.getElementById('peek-album-screen');
    const grid = screen.querySelector('.album-grid');
    grid.innerHTML = '';

    if (!photos || photos.length === 0) {
        grid.innerHTML = '<p class="placeholder-text">正在生成相册内容...</p>';
        return;
    }

    photos.forEach(photo => {
        const photoEl = document.createElement('div');
        photoEl.className = 'album-photo';
        photoEl.dataset.imageDescription = photo.imageDescription;
        photoEl.dataset.description = photo.description;

        const img = document.createElement('img');
        img.src = 'https://i.postimg.cc/1tH6ds9g/1752301200490.jpg';
        img.alt = "相册照片";
        photoEl.appendChild(img);

        if (photo.type === 'video') {
            const videoIndicator = document.createElement('div');
            videoIndicator.className = 'video-indicator';
            videoIndicator.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>`;
            photoEl.appendChild(videoIndicator);
        }
        
        photoEl.addEventListener('click', () => {
            const modal = document.getElementById('peek-photo-modal');
            const imgContainer = document.getElementById('peek-photo-image-container');
            const descriptionEl = document.getElementById('peek-photo-description');
            
            imgContainer.innerHTML = `<div style="padding: 20px; text-align: left; color: #555; font-size: 16px; line-height: 1.6; height: 100%; overflow-y: auto;">${photo.imageDescription}</div>`;
            descriptionEl.textContent = `批注：${photo.description}`;
            
            modal.classList.add('visible');
        });

        grid.appendChild(photoEl);
    });
}

/**
 * 渲染 Unlock (微博小号)
 */
function renderPeekUnlock(data, char) {
    const screen = document.getElementById('peek-unlock-screen');
    if (!screen) return;

    if (!data) {
        screen.innerHTML = `
            <header class="app-header">
                <button class="back-btn" data-target="ai-space-home-screen">‹</button>
                <div class="title-container"><h1 class="title">...</h1></div>
                <button class="action-btn">···</button>
            </header>
            <main class="content"><p class="placeholder-text">正在生成小号内容...</p></main>
        `;
        return;
    }

    const { nickname, handle, bio, posts } = data;
    const fixedAvatar = char.avatar || 'https://i.postimg.cc/SNwL1XwR/chan-11.png';

    const randomFollowers = (Math.random() * 5 + 1).toFixed(1) + 'k';
    const randomFollowing = Math.floor(Math.random() * 500) + 50;

    let postsHtml = '';
    if (posts && posts.length > 0) {
        posts.forEach(post => {
            const randomComments = Math.floor(Math.random() * 100);
            const randomLikes = Math.floor(Math.random() * 500);
            postsHtml += `
                <div class="unlock-post-card">
                    <div class="unlock-post-card-header">
                        <img src="${fixedAvatar}" alt="Profile Avatar">
                        <div class="unlock-post-card-author-info">
                            <span class="username">${nickname}</span>
                            <span class="timestamp">${post.timestamp}</span>
                        </div>
                    </div>
                    <div class="unlock-post-card-content">
                        ${post.content.replace(/\n/g, '<br>')}
                    </div>
                    <div class="unlock-post-card-actions">
                        <div class="action"><svg viewBox="0 0 24 24"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L16.04,7.15C16.56,7.62 17.24,7.92 18,7.92C19.66,7.92 21,6.58 21,5C21,3.42 19.66,2 18,2C16.34,2 15,3.42 15,5C15,5.24 15.04,5.47 15.09,5.7L7.96,9.85C7.44,9.38 6.76,9.08 6,9.08C4.34,9.08 3,10.42 3,12C3,13.58 4.34,14.92 6,14.92C6.76,14.92 7.44,14.62 7.96,14.15L15.09,18.3C15.04,18.53 15,18.76 15,19C15,20.58 16.34,22 18,22C19.66,22 21,20.58 21,19C21,17.42 19.66,16.08 18,16.08Z"></path></svg> <span>分享</span></div>
                        <div class="action"><svg viewBox="0 0 24 24"><path d="M20,2H4C2.9,0,2,0.9,2,2v18l4-4h14c1.1,0,2-0.9,2-2V4C22,2.9,21.1,2,20,2z M18,14H6v-2h12V14z M18,11H6V9h12V11z M18,8H6V6h12V8z"></path></svg> <span>${randomComments}</span></div>
                        <div class="action"><svg viewBox="0 0 24 24"><path d="M12,21.35L10.55,20.03C5.4,15.36,2,12.27,2,8.5C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z"></path></svg> <span>${randomLikes}</span></div>
                    </div>
                </div>
            `;
        });
    }

    screen.innerHTML = `
        <header class="app-header">
            <button class="back-btn" data-target="ai-space-home-screen">‹</button>
            <div class="title-container">
                <h1 class="title">${nickname}</h1>
            </div>
            <button class="action-btn" id="refresh-unlock-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></svg></button>
        </header>
        <main class="content">
            <div class="unlock-profile-header">
                <img src="${fixedAvatar}" alt="Profile Avatar" class="unlock-profile-avatar">
                <div class="unlock-profile-info">
                    <h2 class="unlock-profile-username">${nickname}</h2>
                    <p class="unlock-profile-handle">${handle}</p>
                </div>
            </div>
            <div class="unlock-profile-bio">
                <p>${bio.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="unlock-profile-stats">
                <div class="unlock-profile-stat">
                    <span class="count">${posts.length}</span>
                    <span class="label">帖子</span>
                </div>
                <div class="unlock-profile-stat">
                    <span class="count">${randomFollowers}</span>
                    <span class="label">粉丝</span>
                </div>
                <div class="unlock-profile-stat">
                    <span class="count">${randomFollowing}</span>
                    <span class="label">关注</span>
                </div>
            </div>
            <div class="unlock-post-feed">
                ${postsHtml}
            </div>
        </main>
    `;

    if (char) {
        screen.querySelector('#refresh-unlock-btn').addEventListener('click', () => {
            generateAndRenderPeekContent('unlock', char, { forceRefresh: true });
        });
    }
}

/**
 * 设置 Peek 功能的事件监听器
 */
function setupPeekFeatureHandlers() {
    // 相册刷新按钮
    const refreshAlbumBtn = document.getElementById('refresh-album-btn');
    if (refreshAlbumBtn) {
        refreshAlbumBtn.addEventListener('click', () => {
            if (currentAiForApp) {
                generateAndRenderPeekContent('album', currentAiForApp, { forceRefresh: true });
            }
        });
    }

    // 消息刷新按钮
    const refreshMessagesBtn = document.getElementById('refresh-peek-messages-btn');
    if (refreshMessagesBtn) {
        refreshMessagesBtn.addEventListener('click', () => {
            if (currentAiForApp) {
                generateAndRenderPeekContent('messages', currentAiForApp, { forceRefresh: true });
            }
        });
    }

    // 心动讯号刷新按钮
    const refreshSignalBtn = document.getElementById('refresh-signal-btn');
    if (refreshSignalBtn) {
        refreshSignalBtn.addEventListener('click', () => {
            if (currentAiForApp) {
                generateAndRenderPeekContent('signal', currentAiForApp, { forceRefresh: true });
            }
        });
    }

    // 音乐歌单刷新按钮
    const refreshMusicBtn = document.getElementById('refresh-music-playlist-btn');
    if (refreshMusicBtn) {
        refreshMusicBtn.addEventListener('click', () => {
            if (currentAiForApp) {
                generateAndRenderPeekContent('music', currentAiForApp, { forceRefresh: true });
            }
        });
    }

    // 购物车刷新按钮 (动态添加，在渲染时绑定)
    // 浏览器刷新按钮 (动态添加，在渲染时绑定)
    // 中转站刷新按钮 (动态添加，在渲染时绑定)

    // 照片详情模态框关闭按钮
    const closePhotoBtn = document.getElementById('close-peek-photo-btn');
    if (closePhotoBtn) {
        closePhotoBtn.addEventListener('click', () => {
            document.getElementById('peek-photo-modal').classList.remove('visible');
        });
    }

    // 点击模态框背景关闭
    const photoModal = document.getElementById('peek-photo-modal');
    if (photoModal) {
        photoModal.addEventListener('click', (e) => {
            if (e.target === photoModal) {
                photoModal.classList.remove('visible');
            }
        });
    }
}


// ===============================================================
// END: Peek 手机功能核心逻辑
// ===============================================================



// ===============================================================
// END: AI空间功能
// ===============================================================
