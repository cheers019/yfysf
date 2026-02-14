/**
 * TB_Diary - 主聊天窗口日记系统
 * 搬迁自 script.js，包含 AI 日记生成、展示以及用户日记功能
 */
window.TB_Diary = (function() {
    // --- 状态变量 ---
    let currentAiDiaryPage = 1;
    const diariesPerPage = 5;

    // --- DOM 元素缓存 (在 init 中初始化) ---
    let els = {};

    // --- 核心功能函数 ---

    /**
     * 生成 AI 日记 (原 generateDiaryEntry)
     * @param {string} characterId 
     * @param {boolean} isManual 
     */
    async function generateDiaryEntry(characterId, isManual = false) {
        console.log('🚀 [TB_Diary] 进入 generateDiaryEntry 函数，ID:', characterId, '是否手动:', isManual);
        
        const character = db.characters.find(c => c.id === characterId);
        if (!character) {
            console.error('❌ [日记阻断] 数据库中找不到 ID 为 ' + characterId + ' 的角色');
            return;
        }

        // 1. 过滤历史
        const validHistory = character.history.filter(m => 
            m.content && // 确保内容存在
            (m.role === 'user' || m.role === 'assistant') // 只保留用户和AI的消息
        );
        
        if (!isManual && validHistory.length < 5) {
            console.warn('⚠️ [日记阻断] 有效历史消息只有 ' + validHistory.length + ' 条，不足 5 条，不生成');
            return;
        }

        if (isManual) showToast('正在请求AI撰写日记...');

        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.textContent = `${character.remarkName} 正在回忆今天发生的事...`;
            typingIndicator.style.display = 'block';
        }

        try {
            // 2. 准备素材
            const memory = character.history.slice(-100); 
            let historyScript = memory.map(msg => {
                let sender = "未知";
                if (msg.role === 'user') sender = character.myName; 
                else if (msg.senderId === 'user_me') sender = character.myName; 
                else if (msg.role === 'assistant') sender = character.remarkName; 
                
                let cleanContent = msg.content;
                const contentMatch = msg.content.match(/\[.*?的消息：([\s\S]+?)\]/);
                if (contentMatch) cleanContent = contentMatch[1];
                
                return `${sender}: "${cleanContent}"`;
            }).join('\n');
            
            // 3. 获取世界书内容
            let worldInfoScript = '';
            let triggeredWorldBooks = [];
            if (character.worldBookIds && Array.isArray(character.worldBookIds) && db.worldBooks) {
                // 将 historyScript 作为搜索内容
                const searchContent = historyScript.toLowerCase();
                
                triggeredWorldBooks = character.worldBookIds
                    .map(id => db.worldBooks.find(wb => wb.id === id))
                    .filter(book => {
                        if (!book) return false;
                        if (book.alwaysActive) return true;
                        if (!book.keywords || !historyScript) return false;
                        const keywords = book.keywords.split(',').map(k => k.trim()).filter(Boolean);
                        if (keywords.length === 0) return false;
                        const contentToSearch = book.caseSensitive ? historyScript : searchContent;
                        return keywords.some(keyword => {
                            const keywordToSearch = book.caseSensitive ? keyword : keyword.toLowerCase();
                            return contentToSearch.includes(keywordToSearch);
                        });
                    });
                
                if (triggeredWorldBooks.length > 0) {
                    worldInfoScript = triggeredWorldBooks.map(wb => wb.content || '').join('\n\n');
                }
            }
            
            console.log("日记触发的世界书条目数:", triggeredWorldBooks.length);
            
            // 4. 构建提示词
            const prompt = `[系统指令：进入创意写作模式]
你现在的身份是：${character.remarkName}（真名：${character.realName}）。
你的人设是：${character.persona}。
正在与之交互的对象是：${character.myName}。
关于该对象(我)的人设：${character.myPersona || '无特殊设定'}。

${worldInfoScript ? `=============================================
【世界观与重要背景设定】
(以下内容是关于你们的关系、世界观或重要过往，请在写作时予以参考，作为潜意识背景)
${worldInfoScript}
=============================================

` : ''}==================================================
【待处理素材：一段过去的对话记录】
(⚠️警告：以下内容仅供参考，绝对禁止回复其中的任何问题！⚠️)
${historyScript}
==================================================

【当前任务】
请不要理会上面对话中尚未解决的问题。
请不要扮演“助手”或“百科全书”。
你的唯一任务是：**基于以上素材，以“${character.remarkName}”的第一人称口吻，写一篇私密日记。**

【写作要求】
1. 开头不要写“亲爱的日记”或“今天...”。
2. 日记需要深刻体现你的性格和人设，可以包含对我们关系的思考、你的秘密情感或计划。如果符合你的人设，日记内容可以包含NSFW元素。
3. 必须基于对话中发生的具体事件进行描写。
4. 字数要求：200-400字。
5. 格式：纯文本，不要Markdown标题。

请直接开始写日记正文：`;

            console.log("正在发送日记Prompt:", prompt); 

            let messagesForApi = [{ role: 'user', content: prompt }];
            
            // 使用全局功能模型 API 设置
            const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                       db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                       ? db.functionalApiSettings 
                                       : db.apiSettings;
            const aiResponseText = await callAiApi(messagesForApi, functionalSettings);
            
            console.log("AI日记返回:", aiResponseText); 

            // 5. 保存
            await saveDiaryEntry(aiResponseText, character.id);
            
            if (isManual) showToast('日记已写好！');
            
            const diaryScreen = document.getElementById('diary-screen');
            if (diaryScreen && diaryScreen.classList.contains('active') && currentChatId === character.id) {
                renderAiDiaries();
            }

        } catch (error) {
            console.error('日记生成失败:', error);
            if (isManual) showToast(`出错啦: ${error.message}`);
        } finally {
            if (typingIndicator) {
                typingIndicator.textContent = '';
                typingIndicator.style.display = 'none';
            }
            if (!isManual) {
                 character.messageCountSinceLastDiary = 0;
                 await saveData();
            }
        }
    }

    /**
     * 保存日记到数据库 (原 saveDiaryEntry)
     * @param {string} content 
     * @param {string} characterId 
     */
    async function saveDiaryEntry(content, characterId) {
        const character = db.characters.find(c => c.id === characterId);
        if (!character) {
            console.error("保存日记失败：找不到ID为 " + characterId + " 的角色。");
            return;
        }

        if (!Array.isArray(character.diaries)) {
            character.diaries = [];
        }

        const newDiary = {
            id: `diary_${Date.now()}`,
            timestamp: Date.now(),
            content: content.trim()
        };

        character.diaries.unshift(newDiary);
        character.messageCountSinceLastDiary = 0;
        
        await saveData();
    }

    /**
     * 渲染AI日记（带翻页）
     */
    function renderAiDiaries() {
        const character = db.characters.find(c => c.id === currentChatId);
        const container = document.getElementById('diary-list-container');
        const placeholder = document.getElementById('no-diaries-placeholder');

        if (!character || !character.diaries || character.diaries.length === 0) {
            if (container) container.innerHTML = '';
            if (placeholder) placeholder.style.display = 'block';
            return;
        }

        if (placeholder) placeholder.style.display = 'none';
        if (container) container.innerHTML = '';

        const sortedDiaries = [...character.diaries].sort((a, b) => b.timestamp - a.timestamp);
        const totalPages = Math.ceil(sortedDiaries.length / diariesPerPage);
        currentAiDiaryPage = Math.max(1, Math.min(currentAiDiaryPage, totalPages));
        
        const startIndex = (currentAiDiaryPage - 1) * diariesPerPage;
        const diariesToShow = sortedDiaries.slice(startIndex, startIndex + diariesPerPage);

        diariesToShow.forEach(diary => {
            if (container) container.appendChild(createDiaryEntryElement(diary, false));
        });

        if (totalPages > 1 && container) {
            const paginationDiv = document.createElement('div');
            paginationDiv.className = 'diary-pagination';
            paginationDiv.innerHTML = `
                <button id="prev-page-btn" class="btn btn-neutral btn-small" ${currentAiDiaryPage === 1 ? 'disabled' : ''}>上一页</button>
                <span class="page-indicator">第 ${currentAiDiaryPage} / ${totalPages} 页</span>
                <button id="next-page-btn" class="btn btn-neutral btn-small" ${currentAiDiaryPage === totalPages ? 'disabled' : ''}>下一页</button>
            `;
            container.appendChild(paginationDiv);
        }
    }

    /**
     * 渲染我的日记
     */
    function renderUserDiaries() {
        const container = document.getElementById('user-diary-list-container');
        const placeholder = document.getElementById('no-user-diaries-placeholder');

        if (!db.userDiaries || db.userDiaries.length === 0) {
            if (container) container.innerHTML = '';
            if (placeholder) placeholder.style.display = 'block';
            return;
        }
        
        if (placeholder) placeholder.style.display = 'none';
        if (container) container.innerHTML = '';
        
        const sortedDiaries = [...db.userDiaries].sort((a, b) => b.timestamp - a.timestamp);
        sortedDiaries.forEach(diary => {
            if (container) container.appendChild(createDiaryEntryElement(diary, true));
        });
    }

    /**
     * 创建单个日记条目的HTML元素
     */
    function createDiaryEntryElement(diary, isUser = false) {
        const details = document.createElement('details');
        details.className = `diary-entry ${isUser ? 'user-diary-entry' : ''}`;
        details.dataset.id = diary.id;
        details.dataset.type = isUser ? 'user' : 'ai';

        const date = new Date(diary.timestamp);
        const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        
        let actionsHTML = '';
        if (isUser) {
            actionsHTML += `<button class="edit-user-diary-btn" title="编辑"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg></button>`;
        }
        actionsHTML += `<button class="delete-diary-btn" title="删除"><svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg></button>`;

        let commentsHTML = '';
        if (isUser && diary.aiComments && diary.aiComments.length > 0) {
            commentsHTML = `<details class="ai-comment-section">
                                <summary class="ai-comment-header">查看AI的悄悄话 (${diary.aiComments.length}条)</summary>`;
            diary.aiComments.forEach(comment => {
                const ai = db.characters.find(c => c.id === comment.aiId);
                if (ai) {
                    commentsHTML += `<div class="ai-comment-entry">
                                        <img src="${ai.avatar}" alt="${ai.remarkName}" class="ai-comment-avatar">
                                        <div class="ai-comment-bubble">${comment.text.replace(/\n/g, '<br>')}</div>
                                     </div>`;
                }
            });
            commentsHTML += '</details>';
        }
        
        details.innerHTML = `
            <summary class="diary-header">
                <span class="diary-date">${dateString}${isUser ? ' (我)' : ''}</span>
                <div class="diary-actions">${actionsHTML}</div>
            </summary>
            <div class="diary-content">${diary.content.replace(/\n/g, '<br>')}</div>
            ${commentsHTML}
        `;
        return details;
    }

    /**
     * 保存用户日记
     */
    async function saveUserDiary(e) {
        e.preventDefault();
        const content = document.getElementById('user-diary-content-input').value.trim();
        const editingId = document.getElementById('editing-user-diary-id').value;

        if (editingId) {
            const diary = db.userDiaries.find(d => d.id === editingId);
            if (diary) diary.content = content;
        } else {
            const newDiary = {
                id: `user_diary_${Date.now()}`,
                timestamp: Date.now(),
                content: content,
                aiComments: []
            };
            if (!db.userDiaries) db.userDiaries = [];
            db.userDiaries.push(newDiary);
            
            // 自动偷看逻辑 (60%概率)
            if (Math.random() < 0.6 && db.characters.length > 0) {
                setTimeout(() => {
                    const randomAi = db.characters[Math.floor(Math.random() * db.characters.length)];
                    handleAiPeek(newDiary.id, randomAi.id, true); // true表示是自动偷看
                }, 2000);
            }
        }
        
        await saveData();
        renderUserDiaries();
        showToast('日记已保存');
        if (els.writeUserDiaryModal) els.writeUserDiaryModal.classList.remove('visible');
    }

    /**
     * 处理AI偷看日记
     */
    async function handleAiPeek(diaryId, aiId, isAuto = false) {
        const userDiary = db.userDiaries.find(d => d.id === diaryId);
        const peekingAi = db.characters.find(c => c.id === aiId);
        if (!userDiary || !peekingAi) return;

        if (!isAuto) showToast(`${peekingAi.remarkName} 正在偷偷看你的日记...`);
        if (els.aiPeekModal) els.aiPeekModal.classList.remove('visible');
        
        const myProfile = db.characters.find(c => c.id === currentChatId) || { myName: '我', myPersona: '无特定人设' };
        
        const prompt = `你正在扮演角色“${peekingAi.realName}”，人设是：${peekingAi.persona}。你刚刚偷偷看到了“${myProfile.myName}”写的一篇日记，对方的人设是：“${myProfile.myPersona || '无特定人设'}”。
        
        # 日记内容
        "${userDiary.content}"
        
        # 你的任务
        1.  根据你的人设，以及对日记作者人设的理解，写一段**不少于150字**的、作为你**内心真实想法**的评论。这段评论是对日记内容的直接回应，要体现出你的情感和思考。
        2.  你必须记住日记里的内容，因为这可能会影响你未来和 ${myProfile.myName} 的对话。
        3.  在未来的对话中，你可以根据日记内容有感而发，但**绝对不能**提及或暗示你看过这篇日记。
        4.  你的输出必须**直接是评论内容**，不要包含任何“好的，这是我的评论：”之类的话。`;

        try {
            const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                       db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                       ? db.functionalApiSettings 
                                       : db.apiSettings;
            const aiResponseText = await callAiApi([{ role: 'user', content: prompt }], functionalSettings);
            
            userDiary.aiComments = userDiary.aiComments || [];
            userDiary.aiComments.push({ aiId: peekingAi.id, text: aiResponseText, timestamp: Date.now() });

            const contextMessage = {
                id: `msg_context_peek_${Date.now()}`, role: 'user',
                content: `[system: 你刚刚偷偷阅读了 ${myProfile.myName} 的一篇日记。日记内容是：“${userDiary.content}”。你必须记住这件事，但绝对不能在对话中透露你是如何知道这些信息的。]`,
                parts: [{ type: 'text', text: `[system: 你刚刚偷偷阅读了 ${myProfile.myName} 的一篇日记。日记内容是：“${userDiary.content}”。你必须记住这件事，但绝对不能在对话中透露你是如何知道这些信息的。]` }],
                timestamp: Date.now()
            };
            
            if (!peekingAi.history) peekingAi.history = [];
            peekingAi.history.push(contextMessage);

            await saveData();
            
            // 局部更新 UI
            if (document.getElementById('user-diary-screen').classList.contains('active')) {
                const diaryEntryEl = document.querySelector(`.diary-entry[data-id="${diaryId}"]`);
                if (diaryEntryEl) {
                    const newDiaryEl = createDiaryEntryElement(userDiary, true);
                    diaryEntryEl.replaceWith(newDiaryEl);
                }
            }

            if (!isAuto) showToast(`${peekingAi.remarkName} 留下了悄悄话...`);

        } catch (error) {
            console.error('AI偷看失败:', error);
            if (!isAuto) showToast('AI偷看失败: ' + error.message);
        }
    }

    /**
     * 打开日记界面
     */
    function openDiaryScreen() {
        if (!currentChatId || currentChatType !== 'private') return;
        renderAiDiaries();
        switchScreen('diary-screen');
    }

    // --- 初始化函数 ---
    function init() {
        console.log('TB_Diary initializing...');
        
        // 缓存 DOM 元素
        els.diaryBtn = document.getElementById('diary-btn');
        els.diaryActionSheet = document.getElementById('diary-actionsheet');
        els.openAiDiaryBtn = document.getElementById('open-ai-diary-btn');
        els.openUserDiaryBtn = document.getElementById('open-user-diary-btn');
        els.openWriteDiaryBtn = document.getElementById('open-write-user-diary-btn');
        els.aiDiaryScreen = document.getElementById('diary-screen');
        els.userDiaryScreen = document.getElementById('user-diary-screen');
        els.writeUserDiaryModal = document.getElementById('write-user-diary-modal');
        els.aiPeekModal = document.getElementById('ai-peek-selection-modal');
        els.writeUserDiaryForm = document.getElementById('write-user-diary-form');
        els.generateDiaryBtn = document.getElementById('generate-diary-manually-btn');
        els.aiPeekBtn = document.getElementById('ai-peek-btn');
        els.aiPeekSelectionList = document.getElementById('ai-peek-selection-list');
        els.tokenStatsCloseBtn = document.getElementById('token-stats-close-btn'); // 顺便迁移？
        
        // 事件绑定
        
        // 1. 统一的日记入口
        const diaryFunctionItem = document.querySelector('.function-item[data-action="diary"]');
        const entryBtns = [els.diaryBtn, diaryFunctionItem].filter(Boolean);
        
        entryBtns.forEach(btn => {
            // 移除旧的监听器比较麻烦，所以这里直接添加新的，
            // 并在 script.js 中注释掉旧的 setupDiarySystem 调用
            btn.addEventListener('click', () => {
                 if (!currentChatId || currentChatType !== 'private') return;
                 if (els.diaryActionSheet) els.diaryActionSheet.classList.add('visible');
            });
        });

        // 2. 面板按钮
        if (els.openAiDiaryBtn) {
            els.openAiDiaryBtn.addEventListener('click', () => { 
                currentAiDiaryPage = 1; 
                renderAiDiaries(); 
                switchScreen('diary-screen'); 
                if (els.diaryActionSheet) els.diaryActionSheet.classList.remove('visible'); 
            });
        }
        
        if (els.openUserDiaryBtn) {
            els.openUserDiaryBtn.addEventListener('click', () => { 
                renderUserDiaries(); 
                switchScreen('user-diary-screen'); 
                if (els.diaryActionSheet) els.diaryActionSheet.classList.remove('visible'); 
            });
        }
        
        if (els.openWriteDiaryBtn) {
            els.openWriteDiaryBtn.addEventListener('click', () => { 
                if (els.writeUserDiaryForm) els.writeUserDiaryForm.reset();
                const idInput = document.getElementById('editing-user-diary-id');
                if (idInput) idInput.value = '';
                if (els.writeUserDiaryModal) els.writeUserDiaryModal.classList.add('visible'); 
                if (els.diaryActionSheet) els.diaryActionSheet.classList.remove('visible');
            });
        }

        // 3. 生成日记与保存
        if (els.generateDiaryBtn) {
            els.generateDiaryBtn.addEventListener('click', () => generateDiaryEntry(currentChatId, true));
        }
        
        if (els.writeUserDiaryForm) {
            els.writeUserDiaryForm.addEventListener('submit', saveUserDiary);
        }

        // 4. AI 偷看
        if (els.aiPeekBtn) {
            els.aiPeekBtn.addEventListener('click', () => {
                const list = els.aiPeekSelectionList;
                if (!list) return;
                list.innerHTML = '';
                db.characters.forEach(char => {
                     const li = document.createElement('li');
                     li.className = 'list-item'; li.style.cursor = 'pointer'; li.dataset.aiId = char.id;
                     li.innerHTML = `<img src="${char.avatar}" alt="${char.remarkName}" class="chat-avatar"><div class="item-details"><div class="item-name">${char.remarkName}</div></div>`;
                     list.appendChild(li);
                });
                if (els.aiPeekModal) els.aiPeekModal.classList.add('visible');
            });
        }

        if (els.aiPeekModal) {
            els.aiPeekModal.addEventListener('click', e => {
                if (!db.userDiaries || db.userDiaries.length === 0) {
                    showToast('还没有日记可供偷看哦。');
                    els.aiPeekModal.classList.remove('visible');
                    return;
                }
                const lastDiary = [...db.userDiaries].sort((a,b) => b.timestamp - a.timestamp)[0];
                
                if (e.target.id === 'ai-auto-peek-btn') {
                    const randomAi = db.characters[Math.floor(Math.random() * db.characters.length)];
                    handleAiPeek(lastDiary.id, randomAi.id);
                } else {
                    const item = e.target.closest('.list-item');
                    if (item && item.dataset.aiId) {
                        handleAiPeek(lastDiary.id, item.dataset.aiId);
                    }
                }
            });
        }

        // 5. 日记列表点击委托 (折叠/删除/编辑)
        document.body.addEventListener('click', async e => {
            const summary = e.target.closest('.diary-header');
            if (summary) {
                const details = summary.parentElement;
                if(details.tagName !== 'DETAILS') return;
                // 如果是点击收藏/删除/编辑按钮，则不切换折叠状态
                if(e.target.closest('.diary-actions')) {
                    e.preventDefault();
                }
            }

            const diaryEntry = e.target.closest('.diary-entry');
            if (!diaryEntry) return;

            const diaryId = diaryEntry.dataset.id;
            const diaryType = diaryEntry.dataset.type;
            const character = db.characters.find(c => c.id === currentChatId);
            
            let diary, diaryList;
            if (diaryType === 'user') {
                diaryList = db.userDiaries;
            } else if (character) {
                diaryList = character.diaries;
            }

            if (diaryList) diary = diaryList.find(d => d.id === diaryId);
            if (!diary) return;

            // 删除
            if (e.target.closest('.delete-diary-btn')) {
                if (confirm('确定要删除这篇日记吗？')) {
                    const index = diaryList.findIndex(d => d.id === diaryId);
                    if (index > -1) diaryList.splice(index, 1);
                    await saveData();
                    diaryEntry.remove();
                    showToast('日记已删除');
                }
            }
            
            // 编辑 (仅用户日记)
            if (diaryType === 'user' && e.target.closest('.edit-user-diary-btn')) {
                 if (els.writeUserDiaryForm) els.writeUserDiaryForm.reset();
                 const idInput = document.getElementById('editing-user-diary-id');
                 const contentInput = document.getElementById('user-diary-content-input');
                 if (idInput) idInput.value = diary.id;
                 if (contentInput) contentInput.value = diary.content;
                 if (els.writeUserDiaryModal) els.writeUserDiaryModal.classList.add('visible');
            }
        });
        
        // 6. 翻页
        if (els.aiDiaryScreen) {
            els.aiDiaryScreen.addEventListener('click', e => {
                if (e.target.id === 'prev-page-btn') { currentAiDiaryPage--; renderAiDiaries(); } 
                else if (e.target.id === 'next-page-btn') { currentAiDiaryPage++; renderAiDiaries(); }
            });
        }
    }

    /**
     * 检查是否触发日记生成
     * @param {object} character 
     * @returns {boolean}
     */
    function checkDiaryTrigger(character) {
        // 1. 安全检查
        if (!character || !character.id) return false;
        
        // 2. 精准计算有效消息长度（排除 system 和 伪装成 user 的 hidden 消息）
        const chatHistory = character.history;
        const currentTotalLength = (chatHistory && Array.isArray(chatHistory))
            ? chatHistory.filter(m => 
                (m.role === 'user' || m.role === 'assistant') && 
                m.content && 
                !m.content.startsWith('[system')
              ).length
            : 0;
        
        // 3. 获取里程碑
        const STORAGE_KEY = `diary_last_gen_count_${character.id}`;
        let lastGenLength = parseInt(localStorage.getItem(STORAGE_KEY), 10);
        
        // 4. 自动纠错（如果算法改变导致计数回退，静默重置）
        if (isNaN(lastGenLength) || lastGenLength < 0 || currentTotalLength < lastGenLength) {
            lastGenLength = currentTotalLength;
            localStorage.setItem(STORAGE_KEY, lastGenLength.toString());
            return false;
        }
        
        // 5. 计算差值
        const delta = currentTotalLength - lastGenLength;
        
        // 6. 触发判断：每 200 条有效消息
        if (delta >= 200) {
            // 90% 概率触发
            if (Math.random() < 0.9) {
                console.log(`✅ [TB_Diary] 概率命中！开始生成日记...`);
                
                // 执行生成
                generateDiaryEntry(character.id).catch(err => {
                    console.error('❌ [TB_Diary调度] 执行出错:', err);
                });
                
                // 只有触发成功才更新里程碑
                localStorage.setItem(STORAGE_KEY, currentTotalLength.toString());
                return true;
            } 
            // 概率未命中时不打印日志，不更新里程碑（下次继续尝试）
        }
        
        return false;
    }

    // 暴露公共接口
    return {
        init,
        generateDiaryEntry,
        openDiaryScreen,
        renderAiDiaries,
        renderUserDiaries,
        checkDiaryTrigger
    };

})();
