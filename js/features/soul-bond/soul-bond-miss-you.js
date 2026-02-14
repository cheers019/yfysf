function setupBondMissYouHeartFeature() {
    let clickTimeout = null;
    const COOLDOWN_DURATION = 30 * 1000;

    document.getElementById('soul-bond-screen').addEventListener('click', (e) => {
        const heartBtn = e.target.closest('#bond-miss-you-btn');
        if (!heartBtn) return;

        clearTimeout(clickTimeout);

        clickTimeout = setTimeout(() => {
            sendMissYouSignal('normal');
        }, 250);
    });

    document.getElementById('soul-bond-screen').addEventListener('dblclick', (e) => {
        const heartBtn = e.target.closest('#bond-miss-you-btn');
        if (!heartBtn) return;

        clearTimeout(clickTimeout);
        
        sendMissYouSignal('super');
    });

    async function sendMissYouSignal(level) {
        const characterId = document.getElementById('soul-bond-screen').dataset.characterId;
        const character = db.characters.find(c => c.id === characterId);
        if (!character) return;

        const lastUsed = character.lastMissYouTimestamp || 0;
        const now = Date.now();
        if (now - lastUsed < COOLDOWN_DURATION) {
            const remainingSeconds = Math.ceil((COOLDOWN_DURATION - (now - lastUsed)) / 1000);
            showToast(`思念正在冷却中...请在 ${remainingSeconds} 秒后重试`);
            return;
        }

        character.lastMissYouTimestamp = now;

        let systemContent = '';
        let toastMessage = '你的思念已发送~';

        if (level === 'normal') {
            systemContent = `[system: ${character.myName} 刚刚在“心灵羁绊”里按下了“想你啦”按钮。这是一种比较含蓄的情感表达。请根据你的人设，回复一条温柔、关心或略带思念的话语。]`;
        } else if (level === 'super') {
            systemContent = `[system: ${character.myName} 刚刚在“心灵羁绊”里快速点击了两次“想你啦”按钮，表达了“超级想你”！这是一种非常直接和浓烈的情感表达。请立刻回复一条充满爱意或极度思念的消息。]`;
            toastMessage = '你强烈的思念已发送！';
        }

        if (!systemContent) return;

        const contextMessage = {
            id: `msg_miss_you_${now}`,
            role: 'user',
            content: systemContent,
            parts: [{ type: 'text', text: systemContent }],
            timestamp: now
        };
        character.history.push(contextMessage);
        
        await saveData();
        showToast(toastMessage);

        if (currentChatId === character.id) {
            getAiReply();
        } else {
            renderChatList();
        }
    }
}

window.SoulBondMissYou = { setup: setupBondMissYouHeartFeature };
