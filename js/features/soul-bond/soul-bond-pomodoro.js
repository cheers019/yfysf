// START: 心灵羁绊 - 番茄钟 V2.1 功能 (替换旧版)
// ===============================================================
function setupPomodoroFeature() {
    // --- DOM 元素缓存 ---
    const pomodoroScreen = document.getElementById('pomodoro-screen');
    const timeDisplayEl = document.getElementById('pomodoro-main-time');
    const taskNameEl = document.getElementById('pomodoro-task-name');
    const aiAvatarEl = document.getElementById('pomodoro-ai-avatar');
    const aiStatusEl = document.getElementById('pomodoro-ai-status');
    const aiCompanionTextEl = document.getElementById('pomodoro-ai-companion-text');
    const startBtn = document.getElementById('pomodoro-start-btn');
    const alertSound = document.getElementById('pomodoro-alert-sound');
    const timerCardEl = document.querySelector('.pomodoro-timer-card');

    const settingsBtn = document.getElementById('pomodoro-open-settings-btn');
    const historyBtn = document.getElementById('pomodoro-history-btn');
    const settingsScreen = document.getElementById('pomodoro-settings-screen');
    const settingsForm = document.getElementById('pomodoro-settings-form-v2');

    // --- 状态变量 ---
    let timerInterval = null;
    let timeValue = 0;
    let remainingTime = 25 * 60;
    let state = 'idle';
    let currentMode = 'countdown';
    let currentAiForApp = null;

    // --- 辅助函数 ---
    const getSettings = () => {
        if (currentAiForApp && currentAiForApp.soulBondData && currentAiForApp.soulBondData.pomodoroSettings) {
            return currentAiForApp.soulBondData.pomodoroSettings;
        }
        return { wallpaper: '', avatar: '', soundUrl: '', cardWallpaper: '', mode: 'countdown', focus: 25, shortBreak: 5 };
    };

    const updateDisplay = () => {
        const time = (currentMode === 'countdown') ? remainingTime : timeValue;
        const minutes = String(Math.floor(time / 60)).padStart(2, '0');
        const seconds = String(time % 60).padStart(2, '0');
        timeDisplayEl.textContent = `${minutes}:${seconds}`;
        document.title = `${minutes}:${seconds} - 专注模式`;
    };

    const applySettings = () => {
        const settings = getSettings();
        const contentArea = pomodoroScreen.querySelector('.pomodoro-main-content');
        
        contentArea.style.backgroundImage = settings.wallpaper ? `url('${settings.wallpaper}')` : '';
        timerCardEl.style.backgroundImage = settings.cardWallpaper ? `url('${settings.cardWallpaper}')` : '';
        aiAvatarEl.src = settings.avatar || (currentAiForApp ? currentAiForApp.avatar : 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg');
        
        currentMode = settings.mode;
        resetTimer();
    };

    const tick = () => {
        if (currentMode === 'countdown') {
            remainingTime--;
            if (remainingTime < 0) {
                clearInterval(timerInterval);
                state = 'idle';
                startBtn.textContent = '休息一下';
                alertSound.play();
                saveTaskToHistory();
                triggerAiInteraction('end_focus');
                
                currentMode = 'break';
                remainingTime = getSettings().shortBreak * 60;
                aiStatusEl.textContent = `${currentAiForApp.remarkName} 陪你休息中...`;
                aiCompanionTextEl.textContent = "辛苦啦！休息一下吧，你做得非常棒！";
                startTimer();
                return;
            }
        } else {
            timeValue++;
        }
        updateDisplay();
    };
    
    // --- 核心交互函数 ---
    const startTimer = () => {
        if (state === 'idle' && currentMode === 'countdown') {
            triggerAiInteraction('start_focus');
        }
        state = 'running';
        startBtn.textContent = '暂停';
        timerInterval = setInterval(tick, 1000);
    };

    const pauseTimer = () => {
        clearInterval(timerInterval);
        state = 'paused';
        startBtn.textContent = '继续';
    };

    const resetTimer = () => {
        clearInterval(timerInterval);
        state = 'idle';
        startBtn.textContent = '开始';
        if (currentMode === 'countdown') {
            remainingTime = getSettings().focus * 60;
        } else {
            timeValue = 0;
        }
        updateDisplay();
    };

    const triggerAiInteraction = async (moment) => {
        const character = currentAiForApp;
        if (!character) return;
        
        let systemContent = '';
        switch (moment) {
            case 'start_focus':
                systemContent = `[system: 我刚刚开始了${getSettings().focus}分钟的专注时间，任务是“${taskNameEl.textContent}”。请你用一句简短的话为我加油打气，然后保持安静。]`;
                break;
            case 'end_focus':
                systemContent = `[system: 我刚刚完成了一个专注番茄钟！请你表扬我，并提醒我可以休息一下了。]`;
                break;
        }

        if (!systemContent) return;

        const contextMessage = { id: `msg_pomodoro_${moment}_${Date.now()}`, role: 'user', content: systemContent, parts: [{ type: 'text', text: systemContent }], timestamp: Date.now() };
        character.history.push(contextMessage);
        await saveData();

        if (currentChatId === character.id) {
            getAiReply();
        } else {
            addNotificationToQueue({ avatar: character.avatar, text: `<strong>${character.remarkName}</strong><br>给你发来了专注提醒`, chatId: character.id, type: 'private' });
        }
    };
    
    async function requestAiCompanionMessage() {
        const character = currentAiForApp;
        if (!character) return;
        
        aiCompanionTextEl.textContent = '...';
        aiStatusEl.textContent = `${character.remarkName} 正在输入...`;
        
        try {
            const prompt = `[system: 我在专注期间有点分心，点击了你的头像。请根据你的人设"${character.persona}"，说一句简短、温柔或俏皮的话来鼓励我继续坚持下去。直接输出鼓励的话，不要有其他前缀。]`;
            const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                       db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                       ? db.functionalApiSettings 
                                       : db.apiSettings;
            const aiResponseText = await callAiApi([{ role: 'user', content: prompt }], functionalSettings);
            aiCompanionTextEl.textContent = aiResponseText;
            aiStatusEl.textContent = `${character.remarkName} 陪伴中...`;
        } catch(e) {
             aiCompanionTextEl.textContent = "加油！";
             aiStatusEl.textContent = `${character.remarkName} 陪伴中...`;
        }
    }
    
    const saveTaskToHistory = async () => {
        const character = currentAiForApp;
        if (!character) return;
        character.soulBondData = character.soulBondData || {};
        character.soulBondData.pomodoroHistory = character.soulBondData.pomodoroHistory || [];
        character.soulBondData.pomodoroHistory.unshift({
            task: taskNameEl.textContent,
            duration: currentMode === 'countdown' ? getSettings().focus : Math.floor(timeValue / 60),
            timestamp: Date.now()
        });
        await saveData();
    };

    // --- 事件绑定 ---
    document.querySelector('.bond-nav-btn[data-feature="pomodoro"]').addEventListener('click', () => {
        const characterId = document.getElementById('soul-bond-screen').dataset.characterId;
        pomodoroScreen.dataset.characterId = characterId;
        currentAiForApp = db.characters.find(c => c.id === characterId);
        
        applySettings();
        switchScreen('pomodoro-screen');
    });

    startBtn.addEventListener('click', () => {
        if (state === 'running') {
            pauseTimer();
        } else if (state === 'paused') {
            startTimer();
        } else {
            if (currentMode === 'break') {
                switchMode('countdown');
            }
            startTimer();
        }
    });
    
    aiAvatarEl.addEventListener('click', () => {
        const settings = getSettings();
        if (settings.soundUrl) {
            try {
                const customSound = new Audio(settings.soundUrl);
                customSound.play();
            } catch(e) {
                console.error("无法播放自定义声音:", e);
                showToast("提示音链接无效");
            }
        }
        requestAiCompanionMessage();
    });
    
    settingsBtn.addEventListener('click', () => {
        const settings = getSettings();
        document.getElementById('pomodoro-wallpaper-input').value = settings.wallpaper || '';
        document.getElementById('pomodoro-avatar-input').value = settings.avatar || '';
        document.getElementById('pomodoro-sound-url-input').value = settings.soundUrl || '';
        document.getElementById('pomodoro-card-wallpaper-input').value = settings.cardWallpaper || '';
        const modeRadio = document.querySelector(`input[name="timer-mode"][value="${settings.mode}"]`);
        if (modeRadio) modeRadio.checked = true;
        document.getElementById('focus-duration-input').value = settings.focus;
        document.getElementById('short-break-duration-input').value = settings.shortBreak;
        switchScreen('pomodoro-settings-screen');
    });

    historyBtn.addEventListener('click', () => {
        const history = currentAiForApp.soulBondData.pomodoroHistory || [];
        const listEl = document.getElementById('pomodoro-history-list');
        const placeholder = document.getElementById('no-pomodoro-history');
        if(history.length === 0){
            listEl.innerHTML = '';
            placeholder.style.display = 'block';
        } else {
            placeholder.style.display = 'none';
            listEl.innerHTML = history.map(item => `
                <li class="list-item">
                    <div class="item-details">
                        <div class="item-name">${item.task}</div>
                        <div class="item-preview">${new Date(item.timestamp).toLocaleDateString()}</div>
                    </div>
                    <span class="item-preview">${item.duration} 分钟</span>
                </li>
            `).join('');
        }
        switchScreen('pomodoro-history-screen');
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const character = currentAiForApp;
        if (!character) return;

        character.soulBondData = character.soulBondData || {};
        character.soulBondData.pomodoroSettings = {
            wallpaper: document.getElementById('pomodoro-wallpaper-input').value,
            avatar: document.getElementById('pomodoro-avatar-input').value,
            soundUrl: document.getElementById('pomodoro-sound-url-input').value,
            cardWallpaper: document.getElementById('pomodoro-card-wallpaper-input').value,
            mode: document.querySelector('input[name="timer-mode"]:checked').value,
            focus: parseInt(document.getElementById('focus-duration-input').value),
            shortBreak: parseInt(document.getElementById('short-break-duration-input').value)
        };
        
        await saveData();
        switchScreen('pomodoro-screen');
        applySettings();
        showToast('专注设置已保存');
    });
}
window.SoulBondPomodoro = { setup: setupPomodoroFeature };
