(() => {
    const TB_Call = {};
    window.debug_AI_CALL_TIMER = null; // [NEW] Global debug timer for AI calls
    let isAiCalling = false;
    let isVoiceCallActive = false, voiceCallTranscript = [], voiceCallStartTime = null, callTimerInterval = null, currentCallTargetId = null;
    let isCallRinging = false;
    let callInitiationTimeout = null; // Deprecated, but kept for safety if referenced elsewhere
    let userCallTimer = null; // [NEW] Isolated timer for User -> AI calls
    let aiCallTimer = null;   // [NEW] Isolated timer for AI -> User calls
    const voiceCallBtn = document.getElementById('voice-call-btn');
    const voiceCallOverlay = document.getElementById('voice-call-overlay');
    const callAvatar = document.getElementById('call-avatar');
    const callName = document.getElementById('call-name');
    const callStatus = document.getElementById('call-status');
    const ringingView = document.getElementById('ringing-view');
    const incomingButtons = document.getElementById('incoming-buttons');
    const outgoingButtons = document.getElementById('outgoing-buttons');
    const activeCallView = document.getElementById('active-call-view');
    const callTranscriptArea = document.getElementById('call-transcript-area');
    const hangupCallBtn = document.getElementById('hangup-call-btn');
    const callInput = document.getElementById('call-input');
    const sendCallMessageBtn = document.getElementById('send-call-message-btn');
    const declineCallBtn = document.getElementById('decline-call-btn');
    const acceptCallBtn = document.getElementById('accept-call-btn');
    const cancelCallBtn = document.getElementById('cancel-call-btn');
    const callBgBtn = document.getElementById('call-bg-btn');
    const callBgInput = document.getElementById('call-bg-input');
    const callBgResetBtn = document.getElementById('call-bg-reset-btn');

    const ensureCallBackgroundStore = () => {
        if (!window.db) window.db = {};
        if (!window.db.callBackgrounds) window.db.callBackgrounds = {};
    };

    const applyCallBackground = (charId) => {
        if (!voiceCallOverlay) return;
        ensureCallBackgroundStore();
        const bg = charId && window.db.callBackgrounds ? window.db.callBackgrounds[charId] : null;
        if (bg) {
            voiceCallOverlay.style.backgroundImage = `url(${bg})`;
            voiceCallOverlay.style.backgroundSize = 'cover';
            voiceCallOverlay.style.backgroundPosition = 'center';
            voiceCallOverlay.style.backgroundBlendMode = 'multiply';
            voiceCallOverlay.style.backgroundColor = 'rgba(0,0,0,0.2)';
        } else {
            voiceCallOverlay.style.backgroundImage = '';
            voiceCallOverlay.style.backgroundSize = '';
            voiceCallOverlay.style.backgroundPosition = '';
            voiceCallOverlay.style.backgroundBlendMode = '';
            voiceCallOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        }
    };

    const updateResetButtonVisibility = (charId) => {
        if (!callBgResetBtn) return;
        ensureCallBackgroundStore();
        const hasBg = !!(charId && window.db.callBackgrounds && window.db.callBackgrounds[charId]);
        callBgResetBtn.style.display = hasBg ? 'flex' : 'none';
        callBgResetBtn.style.opacity = hasBg ? '0.6' : '0';
    };

    TB_Call.setupVoiceCallSystem = function setupVoiceCallSystem() {
        // 缓存所有与通话相关的DOM元素
        const voiceCallBtn = document.getElementById('voice-call-btn');
        const voiceCallOverlay = document.getElementById('voice-call-overlay');
        const callAvatar = document.getElementById('call-avatar');
        const callName = document.getElementById('call-name');
        const callStatus = document.getElementById('call-status');
        const ringingView = document.getElementById('ringing-view');
        const incomingButtons = document.getElementById('incoming-buttons');
        const outgoingButtons = document.getElementById('outgoing-buttons');
        const activeCallView = document.getElementById('active-call-view');
        const callTranscriptArea = document.getElementById('call-transcript-area');
        const hangupCallBtn = document.getElementById('hangup-call-btn');
        const callInput = document.getElementById('call-input');
        const sendCallMessageBtn = document.getElementById('send-call-message-btn');
        const declineCallBtn = document.getElementById('decline-call-btn');
        const acceptCallBtn = document.getElementById('accept-call-btn');
        const cancelCallBtn = document.getElementById('cancel-call-btn');
        const callBgBtn = document.getElementById('call-bg-btn');
        const callBgInput = document.getElementById('call-bg-input');
        const callBgResetBtn = document.getElementById('call-bg-reset-btn');

        // 绑定按钮事件
        voiceCallBtn.addEventListener('click', window.TB_Call.startUserInitiatedCall);
        cancelCallBtn.addEventListener('click', () => window.TB_Call.endCall('ended')); // 用户主动取消呼叫
        declineCallBtn.addEventListener('click', () => window.TB_Call.endCall('declined')); // 用户拒接来电
        acceptCallBtn.addEventListener('click', () => { // 用户接听来电
            const character = db.characters.find(c => c.id === currentCallTargetId);
            if (!character) return;
            // 插入一条系统消息，告知AI电话已被接听
            const contextMessage = {
                id: `msg_call_${Date.now()}`, role: 'user',
                content: `[system: ${character.myName} 接听了你的电话。]`,
                parts: [{type: 'text', text: `[system: ${character.myName} 接听了你的电话。]`}],
                timestamp: Date.now()
            };
            character.history.push(contextMessage);
            saveData();
            window.TB_Call.startActiveCall();
        });
        hangupCallBtn.addEventListener('click', () => window.TB_Call.endCall('ended')); // 通话中挂断
        sendCallMessageBtn.addEventListener('click', window.TB_Call.sendCallMessage); // 通话中发文字
        callInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.TB_Call.sendCallMessage();
        });
        if (callBgBtn && callBgInput) {
            callBgBtn.addEventListener('click', () => callBgInput.click());
            callBgInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result;
                    if (!currentCallTargetId) return;
                    ensureCallBackgroundStore();
                    window.db.callBackgrounds[currentCallTargetId] = base64;
                    if (typeof window.saveData === 'function') await window.saveData();
                    applyCallBackground(currentCallTargetId);
                    updateResetButtonVisibility(currentCallTargetId);
                };
                reader.readAsDataURL(file);
                callBgInput.value = '';
            });
        }
        if (callBgResetBtn) {
            callBgResetBtn.addEventListener('mouseenter', () => {
                callBgResetBtn.style.opacity = '1';
            });
            callBgResetBtn.addEventListener('mouseleave', () => {
                callBgResetBtn.style.opacity = '0.6';
            });
            callBgResetBtn.addEventListener('click', async () => {
                if (!currentCallTargetId) return;
                ensureCallBackgroundStore();
                delete window.db.callBackgrounds[currentCallTargetId];
                if (typeof window.saveData === 'function') await window.saveData();
                applyCallBackground(currentCallTargetId);
                updateResetButtonVisibility(currentCallTargetId);
            });
        }
    }
    // [NEW] 智能拨号决策
    TB_Call.makeCallDecision = async function makeCallDecision(character) {
        console.log('[TB_Call] Requesting AI call decision...');
        
        // 1. Prepare Context
        const normalizeMsg = (msg) => {
            let content = '';
            if (msg.content) content = msg.content;
            else if (msg.parts && msg.parts.length > 0) content = msg.parts.map(p => p.text || '').join('');
            const role = (msg.role === 'model' || msg.role === 'assistant') ? 'assistant' : 'user';
            return { role, content };
        };
        // [Dynamic Sync] Use character settings for context limit
        const limit = character.maxMemory || 20;
        console.log("【核心校验】当前通话读取上下文数量：" + limit);
        console.log("【设置校验】当前最大记忆轮数取值:", limit);
        const history = (character.history || []).slice(-limit).map(normalizeMsg);
        
        const systemPrompt = `[System Alert]: ${character.myName} is calling you (Voice Call). 
Based on your persona and recent chat history, decide whether to [ACCEPT] or [DECLINE].
- If you ACCEPT, reply with: [ACCEPT]
- If you DECLINE, reply with: [DECLINE] followed by a short reason (optional).
- Example: [DECLINE] (Busy with work)
- Example: [ACCEPT]

DO NOT output anything else.`;

        const messages = [
            ...history,
            { role: 'system', content: systemPrompt }
        ];

        // 2. Random Delay (5-10s)
        const delayMs = Math.floor(Math.random() * 5000) + 5000;
        const delayPromise = new Promise(resolve => setTimeout(resolve, delayMs));

        // 3. AI Request
        const aiPromise = callAiApi(messages);

        try {
            const [_, aiResponse] = await Promise.all([delayPromise, aiPromise]);
            console.log(`[TB_Call] AI Decision: ${aiResponse}`);
            console.log(`[TB_Call] Ringing Duration: ${delayMs}ms`);

            // If call was cancelled by user during waiting, stop.
            if (!isCallRinging) return;

            if (aiResponse.includes('[ACCEPT]')) {
                console.log('[TB_Call] AI 决策结果：接听');
                window.TB_Call.startActiveCall();
            } else if (aiResponse.includes('[DECLINE]')) {
                let reason = aiResponse.replace('[DECLINE]', '').trim();
                // Remove parentheses if AI added them
                reason = reason.replace(/^\(/, '').replace(/\)$/, '');
                console.log('[TB_Call] AI 决策结果：拒接');
                console.log(`[TB_Call] 理由：${reason}`);
                window.TB_Call.endCall('ai_declined', reason);
            } else {
                console.warn('[TB_Call] Ambiguous response, defaulting to ACCEPT');
                window.TB_Call.startActiveCall();
            }

        } catch (error) {
            console.error('[TB_Call] Decision failed:', error);
        }
    }

    TB_Call.startUserInitiatedCall = function startUserInitiatedCall() {
        if (window.isGenerating || currentChatType !== 'private') return;
        const character = db.characters.find(c => c.id === currentChatId);
        if (!character) return;

        isAiCalling = false; // Mark as outgoing call
        currentCallTargetId = character.id;
        voiceCallOverlay.classList.add('visible');
        ringingView.style.display = 'block';
        activeCallView.style.display = 'none';
        incomingButtons.style.display = 'none';
        outgoingButtons.style.display = 'flex';

        callAvatar.src = character.avatar;
        callName.textContent = character.remarkName;
        callStatus.textContent = '正在呼叫...';
        applyCallBackground(null);
        updateResetButtonVisibility(null);

        // 设置响铃状态并启动超时计时器
        isCallRinging = true;
        
        console.log("【计时开始】方向: User->AI, 预设时长: 60s");
        if (userCallTimer) clearTimeout(userCallTimer); // Safety clear
        
        userCallTimer = setTimeout(() => {
            console.log("【计时器触发】超时逻辑执行，显示无应答提示");
            if (isCallRinging) {
                // showToast('对方无应答'); // Removed as per user request
                window.TB_Call.endCall('timeout');
            }
        }, 60000); // 60秒超时

        // 启动后台决策 (The Ringing)
        window.TB_Call.makeCallDecision(character);
    }

    TB_Call.startAiInitiatedCall = function startAiInitiatedCall(characterId) {
        const character = db.characters.find(c => c.id === characterId);
        if (!character) return;
        
        isAiCalling = true; // Mark as incoming call
        currentCallTargetId = character.id;
        voiceCallOverlay.classList.add('visible');
        ringingView.style.display = 'block';
        activeCallView.style.display = 'none';
        incomingButtons.style.display = 'flex';
        outgoingButtons.style.display = 'none';

        callAvatar.src = character.avatar;
        callName.textContent = character.remarkName;
        callStatus.textContent = '来电邀请...';
        applyCallBackground(null);
        updateResetButtonVisibility(null);

        // 设置响铃状态并启动超时计时器 (AI 呼叫用户)
        isCallRinging = true;

        console.log("【倒计时监控】开始 60 秒计时...");
        console.log("【计时开始】方向: AI->User, 预设时长: 60s");
        
        if (window.debug_AI_CALL_TIMER) clearTimeout(window.debug_AI_CALL_TIMER); // Force clear global timer
        
        // [FORCE ISOLATION] Use global debug timer
        window.debug_AI_CALL_TIMER = setTimeout(() => {
            console.log("【倒计时监控】60 秒时间到，执行自动挂断");
            console.log("【计时器触发】超时逻辑执行，显示无应答提示");
            if (isCallRinging) {
                window.TB_Call.endCall('timeout');
            }
        }, 60000); // 60秒超时
        
        console.log("【倒计时监控】Timer ID:", window.debug_AI_CALL_TIMER);
    }

    TB_Call.formatTime = function formatTime(seconds) {
        const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
        const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
        const secs = String(safeSeconds % 60).padStart(2, '0');
        return `${minutes}:${secs}`;
    }

    TB_Call.startActiveCall = function startActiveCall() {
        const character = db.characters.find(c => c.id === currentCallTargetId);
        if (!character) return;

        clearTimeout(callInitiationTimeout);
        if (userCallTimer) { clearTimeout(userCallTimer); userCallTimer = null; }
        if (aiCallTimer) { clearTimeout(aiCallTimer); aiCallTimer = null; }
        if (window.debug_AI_CALL_TIMER) { clearTimeout(window.debug_AI_CALL_TIMER); window.debug_AI_CALL_TIMER = null; }
        
        isCallRinging = false;
        isVoiceCallActive = true;
        voiceCallTranscript = [];
        voiceCallStartTime = Date.now();
        
        // --- 核心修改：显示主头像，隐藏顶部面板 ---
        // 保持主界面的大型头像和名字可见，以匹配图片样式
        document.getElementById('call-avatar').style.display = 'block';
        document.getElementById('call-name').style.display = 'block';
        
        // 隐藏那个固定的、现在不需要的顶部 header
        const activeHeader = document.getElementById('active-call-header');
        if (activeHeader) activeHeader.style.display = 'none';
        // --- 修改结束 ---

        ringingView.style.display = 'none';
        activeCallView.style.display = 'flex';
        applyCallBackground(currentCallTargetId);
        updateResetButtonVisibility(currentCallTargetId);

        // 更新顶部固定面板的信息（这些代码现在无效，但保留也无妨）
        document.getElementById('active-call-header-avatar').src = character.avatar;
        document.getElementById('active-call-header-name').textContent = character.remarkName;
        
        callTranscriptArea.innerHTML = '';
        callInput.value = '';

        window.TB_Call.appendCallTranscript('system', '通话已连接');
        
        callTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - voiceCallStartTime) / 1000);
            const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const seconds = String(elapsed % 60).padStart(2, '0');
            const timeString = `${minutes}:${seconds}`;
            
            // 修改：确保只更新主状态区的计时器
            callStatus.textContent = timeString; 
        }, 1000);

        window.TB_Call.getAiCallReply("[system: 通话已接通，请说第一句话。]");
    }

    TB_Call.endCall = async function endCall(reason = 'ended', extraData = null) {
        console.log("【警报】挂断函数被触发！触发源堆栈:", new Error().stack);
        clearTimeout(callInitiationTimeout);
        if (userCallTimer) { clearTimeout(userCallTimer); userCallTimer = null; }
        if (aiCallTimer) { clearTimeout(aiCallTimer); aiCallTimer = null; }
        if (window.debug_AI_CALL_TIMER) { clearTimeout(window.debug_AI_CALL_TIMER); window.debug_AI_CALL_TIMER = null; }

        isCallRinging = false;

        const character = db.characters.find(c => c.id === currentCallTargetId);

        // UI Cleanup Helper
        const closeUI = () => {
            clearInterval(callTimerInterval);
            voiceCallOverlay.classList.remove('visible');
            document.getElementById('call-avatar').style.display = 'block';
            document.getElementById('call-name').style.display = 'block';
            isVoiceCallActive = false;
            isAiCalling = false; // Reset direction flag
            voiceCallTranscript = [];
            voiceCallStartTime = null;
            currentCallTargetId = null;
            applyCallBackground(null);
            updateResetButtonVisibility(null);
        };

        if (!character) {
            closeUI();
            return;
        }

        // --- Logic Branching ---

        // 1. AI Declined (Outgoing Call)
        if (reason === 'ai_declined') {
            const reasonText = extraData; 
            const sysMsg = {
                id: `msg_sys_${Date.now()}`,
                role: 'system',
                content: '[system-display:AI 拒接了来电]',
                parts: []
            };
            const sysCtx = {
                id: `msg_ctx_${Date.now()}`,
                role: 'user',
                content: `[system: ${character.realName} 拒接了通话。]`,
                parts: [{type: 'text', text: `[system: ${character.realName} 拒接了通话。]`}],
                timestamp: Date.now()
            };

            if (window.TB_Messenger && typeof window.TB_Messenger.sendActionMessage === 'function') {
                await window.TB_Messenger.sendActionMessage({
                    chat: character,
                    messages: [sysMsg, sysCtx],
                    renderArgs: [false, true]
                });
                
                if (reasonText) {
                    const aiMsg = {
                        role: 'model',
                        content: reasonText,
                        parts: [{type: 'text', text: reasonText}]
                    };
                     await window.TB_Messenger.sendActionMessage({
                        chat: character,
                        messages: [aiMsg],
                        renderArgs: [false, true]
                    });
                }
            } else {
                character.history.push(sysMsg, sysCtx);
                if(reasonText) {
                    character.history.push({role: 'model', content: reasonText});
                }
                saveData();
            }
            
            closeUI();
            return;
        }

        // 2. User Declined (Incoming Call)
        if (reason === 'declined') {
             const sysMsg = {
                id: `msg_sys_${Date.now()}`,
                role: 'system',
                content: `[system-display:我 挂断了来自 ${character.remarkName} 的来电]`,
                parts: []
            };
            const sysCtx = {
                id: `msg_ctx_${Date.now()}`,
                role: 'user',
                content: `[system: 我挂断了 ${character.realName} 的来电。]`,
                parts: [{type: 'text', text: `[system: 我挂断了 ${character.realName} 的来电。]`}],
                timestamp: Date.now()
            };
             if (window.TB_Messenger && typeof window.TB_Messenger.sendActionMessage === 'function') {
                await window.TB_Messenger.sendActionMessage({
                    chat: character,
                    messages: [sysMsg, sysCtx],
                    renderArgs: [false, true]
                });
            } else {
                character.history.push(sysMsg, sysCtx);
                saveData();
            }
            closeUI();
            return;
        }

        // 3. Timeout (No Answer)
        if (reason === 'timeout') {
            let displayContent = '[system-display:对方无应答]';
            let memoryContent = '[system: 对方无应答，通话取消。]';
            
            if (isAiCalling) { // AI called User
                 displayContent = `[system-display:${character.realName} 拨号无应答]`;
                 memoryContent = `[system: ${character.realName} 拨号无应答，通话取消。]`;
            }

            const sysMsg = { role: 'system', content: displayContent, parts: [] };
            const sysCtx = { role: 'user', content: memoryContent, parts: [{type:'text', text:memoryContent}] };
            
             if (window.TB_Messenger && typeof window.TB_Messenger.sendActionMessage === 'function') {
                await window.TB_Messenger.sendActionMessage({
                    chat: character,
                    messages: [sysMsg, sysCtx],
                    renderArgs: [false, true]
                });
            } else {
                character.history.push(sysMsg, sysCtx);
                saveData();
            }
            closeUI();
            return;
        }

        // 4. Active Call Ended (Normal Hangup)
        if (isVoiceCallActive) {
            clearInterval(callTimerInterval);
            const durationSeconds = voiceCallStartTime ? Math.floor((Date.now() - voiceCallStartTime) / 1000) : 0;
            const durationText = TB_Call.formatTime(durationSeconds);
            callStatus.textContent = durationText;

            // [NEW] Archiving Logic
            const callLogId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const callTitle = `${character.remarkName || '未知对象'} 通话`;
            const callRecord = {
                id: callLogId,
                charId: character.id,
                title: callTitle,
                timestamp: Date.now(),
                duration: durationText,
                transcript: JSON.parse(JSON.stringify(voiceCallTranscript)), // Deep copy
                targetId: character.id,
                targetName: character.remarkName
            };

            // Ensure DB array exists
            if (!window.db) window.db = {};
            window.db.callLogs = window.db.callLogs || [];
            window.db.callLogs.push(callRecord);
            console.log("【核心存档】通话记录已归档:", callLogId);

            const transcriptText = voiceCallTranscript.map(line => {
                const label = line.sender === 'user' ? '我' : (line.sender === 'ai' ? (character.remarkName || 'AI') : '系统');
                return `[${label}]：${line.text}`;
            }).join('\n');
            const callSummaryText = `通话回顾：\n${transcriptText || '（无对话内容）'}`;
            console.log("【记忆同步】已向主历史写入通话文本，长度: " + callSummaryText.length);

            console.log("【数据对齐校验】最终存入卡片的时长文本: " + durationText);
            const cardMsg = {
                id: `msg_call_card_${Date.now()}`,
                role: 'user',
                type: 'call-record',
                content: callSummaryText,
                parts: [{ type: 'text', text: callSummaryText }],
                callRecordData: {
                    id: callLogId,
                    charId: character.id,
                    title: callTitle,
                    duration: durationText,
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            };

            if (window.TB_Messenger && typeof window.TB_Messenger.sendActionMessage === 'function') {
                await window.TB_Messenger.sendActionMessage({
                    chat: character,
                    messages: [cardMsg],
                    renderArgs: [false, true]
                });
                if (typeof window.saveData === 'function') await window.saveData();
                if (typeof window.renderMessages === 'function') window.renderMessages(false, true);
            } else {
                character.history.push(cardMsg);
                if (currentChatId === character.id) {
                    if (typeof addMessageBubble === 'function') addMessageBubble(cardMsg);
                }
                if (typeof saveData === 'function') await saveData();
                if (typeof window.renderMessages === 'function') window.renderMessages(false, true);
            }
        }
        
        // 5. User Cancelled (Outgoing Ringing) - just close
        closeUI();
    }

    TB_Call.sendCallMessage = function sendCallMessage() {
        const text = callInput.value.trim();
        
        // 稳定性与重试机制：如果输入为空且不在生成中，触发重试/催促
        if (!text) {
            if (!window.isGenerating) {
                console.log('[TB_Call] 触发空消息重试/催促');
                window.TB_Call.getAiCallReply(''); 
            }
            return;
        }

        if (window.isGenerating) return;
        
        window.TB_Call.appendCallTranscript('user', text);
        window.TB_Call.getAiCallReply(text);
        callInput.value = '';
    }

    TB_Call.getAiCallReply = async function getAiCallReply(userText) {
        if (window.isGenerating) return;
        const character = db.characters.find(c => c.id === currentCallTargetId);
        if (!character) return;

        window.isGenerating = true;
        sendCallMessageBtn.disabled = true;

        try {
            // --- 1. 深度上下文挂载 (Context Injection) ---
            
            // 获取世界书内容
            const associatedWorldBooks = (character.worldBookIds || [])
                .map(id => window.db.worldBooks.find(wb => wb.id === id))
                .filter(Boolean);
            
            let worldBookContext = '';
            if (associatedWorldBooks.length > 0) {
                worldBookContext = associatedWorldBooks
                    .map(wb => `设定名: ${wb.name}\n内容: ${wb.content}`)
                    .join('\n\n');
            }

            // 获取用户人设
            const userPersona = character.myPersona || '';
            const userName = character.myName || '我';

            // 构建 Prompt (仅保留人设和上下文)
            let prompt = `你正在与 ${userName} 进行语音通话。你的名字是 ${character.realName}，你的人设是：${character.persona}。\n`;
            
            if (worldBookContext) {
                prompt += `\n[世界观/知识库设定]:\n${worldBookContext}\n`;
            }
            
            if (userPersona) {
                prompt += `\n[用户(${userName})的人设]:\n${userPersona}\n`;
            }

            // ⚡️⚡️ 格式指令单独定义，用于后置注入 (解决 AI 不换行/话痨问题) ⚡️⚡️
            const formatInstructions = `
### ⚠️ 绝对响应格式规范 (CRITICAL FORMATTING RULES) ⚠️
1. 我们正在电话聊天，保持自然的沟通。你的回复可以直接是对话内容，也可以包含用括号()描述的动作、语气或环境。重要：如果想连续发送多条消息，请用换行符分隔，并且每条消息不得超过50字，每一行都会成为一个独立的气泡。请严格保持你的人设进行对话。
2. **动作描写**：动作/语气/环境严禁任何人称：禁止出现"我"、"他"、"你"。
`;



            console.log('[第一阶段：上下文挂载成功]');

            // --- 2. 构建消息历史 (Memory Extension) ---

            // A. 读取主聊天记录 (最近 100 条)
            // 辅助函数：标准化消息格式
            const normalizeMsg = (msg) => {
                let content = '';
                if (msg.content) content = msg.content;
                else if (msg.parts && msg.parts.length > 0) {
                    content = msg.parts.map(p => p.text || '').join('');
                }
                // 简单的角色映射：model -> assistant
                const role = (msg.role === 'model' || msg.role === 'assistant') ? 'assistant' : 'user';
                return { role, content };
            };

            const limit = character.maxMemory || 100;
            console.log("【核心校验】当前通话读取上下文数量：" + limit);
            console.log("【设置校验】当前最大记忆轮数取值:", limit);
            const mainHistory = (character.history || [])
                .slice(-limit)
                .map(normalizeMsg)
                .filter(m => m.content && m.content.trim() !== ''); // 过滤空消息

            console.log(`[当前 API 携带历史记录条数：${mainHistory.length} (主历史) + ${voiceCallTranscript.length} (本次通话)]`);

            // B. 读取本次通话记录
            const currentCallHistory = voiceCallTranscript.map(line => {
                return {
                    role: line.sender === 'user' ? 'user' : 'assistant',
                    content: line.text
                }
            });

            // --- 3. 修复“发两遍”Bug & 格式指令后置 ---
            
            const messages = [
                { role: 'system', content: prompt },
                ...mainHistory,
                ...currentCallHistory
            ];

            // 3.1 确保有 User 消息作为载体
            if (userText) {
                const lastMsg = currentCallHistory[currentCallHistory.length - 1];
                // 如果 userText 不在历史记录里，手动添加
                if (!lastMsg || lastMsg.content !== userText) {
                    messages.push({ role: 'user', content: userText });
                }
            } else {
                // 如果没有 userText (重试/催促)，且最后一条不是 user，则补一个占位符
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg || lastMsg.role !== 'user') {
                    messages.push({ role: 'user', content: '(继续)' });
                }
            }

            // 3.2 ⚡️⚡️ 关键操作：将格式指令追加到 Payload 的最后一条消息中 ⚡️⚡️
            // 这确保了 AI 在生成回复前最后看到的是格式要求
            const finalMsg = messages[messages.length - 1];
            if (finalMsg) {
                finalMsg.content += `\n\n${formatInstructions}`;
            }

            const aiResponseText = await callAiApi(messages); // 复用通用的AI调用函数

            // 处理AI回复，按换行符拆分成多条消息
            // 确保过滤掉空行，保证 UI 渲染正常
            const replies = aiResponseText.split('\n').filter(reply => reply.trim() !== '');
            for (const reply of replies) {
                window.TB_Call.appendCallTranscript("ai", reply);
                // 可以根据消息长度添加一个小的延迟，模拟打字效果
                await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
            }

        } catch (error) {
            console.error('[通话请求失败]', error);
            window.TB_Call.appendCallTranscript("system", `[通话请求失败: ${error.message}]`);
        } finally {
            window.isGenerating = false;
            sendCallMessageBtn.disabled = false;
        }
    }

    TB_Call.appendCallTranscript = function appendCallTranscript(sender, text) {
        // sender: 'user', 'ai', or 'system'
        voiceCallTranscript.push({ sender, text });

        const line = document.createElement('div');
        line.className = 'call-transcript-line';

        if (sender === 'system') {
            line.innerHTML = `<span class="action">${text}</span>`;
        } else {
            const name = sender === 'user' ? '我' : callName.textContent;
            // Simple regex to style actions in parenthesis
            const styledText = text.replace(/\((.*?)\)/g, '<span class="action">($1)</span>');
            line.innerHTML = `<strong>${name}:</strong> <span class="dialog">${styledText}</span>`;
        }
        
        callTranscriptArea.appendChild(line);
        callTranscriptArea.scrollTop = callTranscriptArea.scrollHeight;
    }

    TB_Call.handleCallActionFromResponse = function handleCallActionFromResponse(fullResponse, chat, callActionReceived) {
        // --- 4. 通话/挂断逻辑 (完整保留) ---
        if (fullResponse.includes('[call-accept]')) {
            callActionReceived = true;
            window.TB_Call.startActiveCall();
            return { handled: true, callActionReceived };
        }
        if (fullResponse.includes('[call-decline]')) {
            callActionReceived = true;
            showToast(`${chat.remarkName} 拒接了你的通话`);
            window.TB_Call.endCall('declined');
            return { handled: true, callActionReceived };
        }
        if (fullResponse.includes('[hangup]')) {
            window.TB_Call.endCall('ended');
            return { handled: true, callActionReceived };
        }
        if (isVoiceCallActive) {
            window.TB_Call.appendCallTranscript("ai", fullResponse);
            return { handled: true, callActionReceived };
        }
        return { handled: false, callActionReceived };
    }

    TB_Call.handleNoActionReply = function handleNoActionReply(callActionReceived, chat, currentChatId, hideTypingIndicator) {
        // [FIX] If AI is calling user, we are waiting for user action, so ignore "no AI reply" check.
        // This prevents immediate hangup when the [call_user] command finishes processing.
        if (isAiCalling) {
            console.log('[TB_Call] handleNoActionReply ignored due to incoming call state');
            return;
        }

        if (isCallRinging && !callActionReceived) {
            // showToast('对方无应答'); // Removed
            window.TB_Call.endCall('timeout'); // Changed to timeout to trigger system message
            if (currentChatId === chat.id) hideTypingIndicator();
        }
    }

    function registerCallRenderer() {
        if (!window.displayDispatcher || typeof window.displayDispatcher.register !== 'function') return false;
        window.displayDispatcher.register('call', function (data) {
            if (!data) return '';
            const { duration, id: callLogId, title } = data;
            return `
            <div class="file-card call-record-card" onclick="showCallDetail('${callLogId}')" style="cursor: pointer;">
                <div class="file-card-icon-container" style="background: #e3f2fd; padding: 10px; border-radius: 8px;">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 24px; height: 24px; color: #2196f3;">
                        <path d="M20,15.5C18.75,15.5 17.55,15.3 16.43,14.93C16.08,14.82 15.69,14.9 15.41,15.18L13.21,17.38C10.38,15.94 8.06,13.62 6.62,10.79L8.82,8.59C9.1,8.31 9.18,7.92 9.07,7.57C8.7,6.45 8.5,5.25 8.5,4A1,1 0 0,0 7.5,3H4A1,1 0 0,0 3,4A17,17 0 0,0 20,21A1,1 0 0,0 21,20V16.5A1,1 0 0,0 20,15.5M19,12H21C21,7 17,3 12,3V5C15.86,5 19,8.13 19,12Z" />
                    </svg>
                </div>
                <div class="file-card-info">
                    <p class="file-card-name">${title || '通话记录'}</p>
                    <p class="file-card-size">时长: ${duration}</p>
                </div>
            </div>`;
        });
        return true;
    }

    if (!registerCallRenderer()) {
        window.displayDispatcherPending = window.displayDispatcherPending || [];
        window.displayDispatcherPending.push(registerCallRenderer);
    }

    window.TB_Call = TB_Call;
})();
