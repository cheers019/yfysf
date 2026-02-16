window.soulBondMissYou = window.soulBondMissYou || {};

function setupBondMissYouHeartFeature() {
    const soulBondScreen = document.getElementById('soul-bond-screen');
    if (!soulBondScreen) return;

    soulBondScreen.addEventListener('click', (e) => {
        const heartBtn = e.target.closest('#bond-miss-you-btn');
        if (!heartBtn) return;
        const missYouActionSheet = document.getElementById('miss-you-actionsheet');
        if (missYouActionSheet) missYouActionSheet.classList.add('visible');
    });
}

window.SoulBondMissYou = { setup: setupBondMissYouHeartFeature };

window.soulBondMissYou.init = function () {
    const missYouActionSheet = document.getElementById('miss-you-actionsheet');
    if (!missYouActionSheet) return;
    const missYouButtonsContainer = missYouActionSheet.querySelector('.action-sheet');
    const cancelMissYouBtn = document.getElementById('cancel-miss-you-btn');
    if (!missYouButtonsContainer || !cancelMissYouBtn) return;
    if (missYouButtonsContainer.dataset.bound === '1') return;
    missYouButtonsContainer.dataset.bound = '1';

    const COOLDOWN_DURATION = 60 * 1000;

    async function handleMissYouAction(e) {
        const actionButton = e.target.closest('.action-sheet-button[data-level]');
        if (!actionButton) return;

        const characterId = document.getElementById('soul-bond-screen').dataset.characterId;
        const db = window.db;
        const appState = window.appState || {};
        const currentChatId = appState.currentChatId;
        const character = db && Array.isArray(db.characters) ? db.characters.find(c => c.id === characterId) : null;

        if (!character) {
            if (typeof window.showToast === 'function') window.showToast('错误：找不到当前角色');
            missYouActionSheet.classList.remove('visible');
            return;
        }

        const lastUsed = character.lastMissYouTimestamp || 0;
        const now = Date.now();
        if (now - lastUsed < COOLDOWN_DURATION) {
            const remainingSeconds = Math.ceil((COOLDOWN_DURATION - (now - lastUsed)) / 1000);
            if (typeof window.showToast === 'function') window.showToast(`思念正在冷却中...请在 ${remainingSeconds} 秒后重试`);
            return;
        }

        character.lastMissYouTimestamp = now;

        const userName = appState.myTopName || character.myName || '我';
        const thoughtIntensity = actionButton.dataset.level || actionButton.textContent || '';
        let systemContent = '';
        let displayContent = '';
        if (thoughtIntensity.includes('有点想你')) {
            systemContent = `[system-context-only: 用户 ${userName} 刚才发送了“有点想你”。这是一份轻柔的思念，请你根据你的人设回应。]`;
            displayContent = `[system-display:♡ 有点想你！]`;
        } else if (thoughtIntensity.includes('非常想你')) {
            systemContent = `[system-context-only: 用户 ${userName} 刚才发送了“非常想你”！这是一份强烈的、浓郁的思念，请你根据你的人设回应。]`;
            displayContent = `[system-display:♡ 非常想你！]`;
        }
        if (!systemContent || !displayContent) return;
        console.log('[MissYou] thoughtIntensity:', thoughtIntensity);
        console.log('[MissYou] systemContent:', systemContent);

        const hiddenMessage = {
            id: `msg_miss_you_hidden_${now}`,
            role: 'user',
            content: systemContent,
            parts: [{ type: 'text', text: systemContent }],
            isHidden: true,
            timestamp: now
        };
        const displayMessage = {
            id: `msg_miss_you_display_${now}`,
            role: 'system',
            content: displayContent,
            parts: [],
            timestamp: now
        };
        character.history.push(hiddenMessage, displayMessage);

        let saved = false;
        if (window.dataStorage && typeof window.dataStorage.addMessage === 'function') {
            const [hiddenResult, displayResult] = await Promise.all([
                window.dataStorage.addMessage(character.id, 'private', hiddenMessage),
                window.dataStorage.addMessage(character.id, 'private', displayMessage)
            ]);
            saved = hiddenResult === true && displayResult === true;
        }
        if (typeof window.saveData === 'function') {
            await window.saveData();
            saved = true;
        }

        missYouActionSheet.classList.remove('visible');
        if (typeof window.showToast === 'function') window.showToast('您的思念已送达~');

        if (saved) {
            const previousChatId = window.currentChatId;
            const previousChatType = window.currentChatType;
            if (previousChatId !== character.id || previousChatType !== 'private') {
                window.currentChatId = character.id;
                window.currentChatType = 'private';
            }
            const triggerAI = async () => {
                console.log('准备唤醒 AI...');
                if (typeof window.getAiReply === 'function') {
                    console.log('成功找到 getAiReply，正在执行...');
                    const result = window.getAiReply();
                    if (result && typeof result.then === 'function') await result;
                    return true;
                }
                if (typeof window.handleSend === 'function') {
                    console.log('成功找到 handleSend，正在执行...');
                    const result = window.handleSend(true);
                    if (result && typeof result.then === 'function') await result;
                    return true;
                }
                console.error('致命错误：未找到 AI 触发函数（getAiReply/handleSend）');
                return false;
            };
            let aiTriggered = false;
            try {
                aiTriggered = await triggerAI();
                console.log('[MissYou] aiTriggered:', aiTriggered);
            } finally {
                if (previousChatId !== undefined) window.currentChatId = previousChatId;
                if (previousChatType !== undefined) window.currentChatType = previousChatType;
            }
        } else {
            console.log('[MissYou] aiTriggered: false');
        }
        if (currentChatId !== character.id && typeof window.renderChatList === 'function') {
            window.renderChatList();
        }
    }

    missYouButtonsContainer.addEventListener('click', handleMissYouAction);
    console.log('[MissYou] actionsheet listener bound');
    cancelMissYouBtn.addEventListener('click', () => missYouActionSheet.classList.remove('visible'));
};
