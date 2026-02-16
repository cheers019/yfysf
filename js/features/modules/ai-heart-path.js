(() => {
    // --- AI轨迹功能 ---
    
    // ▼▼▼ 【V2.0 | 轨迹与心声整合版】请用这个函数完整替换旧的 setupTrajectorySystem 和 generateTrajectoryPrompt 函数 ▼▼▼
    
    /**
     * 为AI生成“生活轨迹”的指令
     */
    window.generateTrajectoryPrompt = function(character) {
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
    };
    
    /**
     * 【新增】为AI生成“心声”的指令
     */
    window.generateHeartSoundPrompt = function(character) {
        const memory = character.history.slice(-50); // 获取最近50条消息作为上下文
        let historyText = memory.map(msg => {
            const sender = msg.role === 'user' ? character.myName : character.remarkName;
            const contentMatch = msg.content.match(/\[.*?的消息：([\s\S]+?)\]/);
            const cleanContent = contentMatch ? contentMatch[1] : msg.content;
            return `${sender}: ${cleanContent}`;
        }).join('\n');
    
        let prompt = [
            `你正在扮演角色“${character.realName}”，你的人设是：${character.persona}。`,
            '现在，请根据我们最近的对话，用你的第一人称视角，写一段**50字以上**的、符合人设的思考或心情记录。',
            '',
            '# 格式要求 (必须严格遵守):',
            '1.  你的内心独白**必须**合理划分自然段落。',
            '2.  每个段落的开头需要有两个全角空格的缩进 `　　` 以实现美观的排版。',
            '3.  请直接输出带有分段和缩进的内心独白，不要包含任何额外的格式或解释，例如“好的，这是我的想法：”之类的话。',
            '',
            '# 内容要求:',
            '- 你的心声需要深刻体现你的性格和人设，符合你当下最真实的心情，是最核心、最私密、最直接的内心独白。',
            '',
            '# 对话参考:',
            '最近的对话如下:',
            historyText
        ].join('\n');
        
        return prompt;
    };
    
    /**
     * [重构] 设置轨迹和心声功能的事件监听
     */
    window.setupTrajectoryAndHeartSoundSystem = function() {
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
                if (typeof window.showToast === 'function') {
                    window.showToast(`已切换到 ${isActive ? '心声' : '轨迹'} 模式`);
                }
            }, 250); // 250毫秒的延迟足以判断是否为双击
        });
    
        trajectoryBtn.addEventListener('dblclick', async () => {
            // 立即清除单击计时器，确保单击操作不会执行
            clearTimeout(clickTimeout);
    
            if (currentChatType !== 'private' || !currentChatId) return;
            const character = window.db.characters.find(c => c.id === currentChatId);
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
                    const prompt = window.generateHeartSoundPrompt(character);
                    // 修改：使用全局功能模型 API 设置（心声功能）
                    const functionalSettings = window.db.functionalApiSettings && Object.keys(window.db.functionalApiSettings).length > 0 && 
                                               window.db.functionalApiSettings.url && window.db.functionalApiSettings.key && window.db.functionalApiSettings.model
                                               ? window.db.functionalApiSettings 
                                               : window.db.apiSettings; // 容错：如果功能模型未配置，回退到主聊天模型
                    const aiResponseText = await window.callAiApi([{ role: 'user', content: prompt }], functionalSettings);
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
                    const prompt = window.generateTrajectoryPrompt(character);
                    // 修改：使用全局功能模型 API 设置（轨迹功能）
                    const functionalSettings = window.db.functionalApiSettings && Object.keys(window.db.functionalApiSettings).length > 0 && 
                                               window.db.functionalApiSettings.url && window.db.functionalApiSettings.key && window.db.functionalApiSettings.model
                                               ? window.db.functionalApiSettings 
                                               : window.db.apiSettings; // 容错：如果功能模型未配置，回退到主聊天模型
                    const aiResponseText = await window.callAiApi([{ role: 'user', content: prompt }], functionalSettings);
                    const jsonMatch = aiResponseText.match(/\[[\s\S]*\]/); 
                    if (!jsonMatch) throw new Error("AI的回复中没有找到有效的JSON数组。");
                    
                    const trajectoryData = JSON.parse(jsonMatch[0]);
                    window.renderTrajectoryTimeline(trajectoryData, character.remarkName);
    
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
    };
    
    // 轨迹渲染函数（保持不变）
    window.renderTrajectoryTimeline = function(trajectoryData, characterName) {
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
    };
})();
