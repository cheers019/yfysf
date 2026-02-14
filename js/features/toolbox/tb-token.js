(() => {
    const TB_Token = {};
    let getContext = null;
    let showToast = null;

    const getRuntime = () => {
        const context = typeof getContext === 'function' ? getContext() : null;
        return {
            db: context && context.db ? context.db : window.db,
            currentChatId: context && context.currentChatId ? context.currentChatId : null,
            currentChatType: context && context.currentChatType ? context.currentChatType : 'private'
        };
    };

    const openTokenStatsModal = () => {
        const modal = document.getElementById('token-stats-modal');
        if (!modal) return;
        try {
            const bodyChatId = document.body ? document.body.getAttribute('data-current-chat-id') : null;
            const bodyChatType = document.body ? document.body.getAttribute('data-current-chat-type') : null;
            const runtime = getRuntime();
            const chatId = bodyChatId || runtime.currentChatId;
            const chatType = bodyChatType || runtime.currentChatType || 'private';
            if (!chatId) {
                const toast = showToast || window.showToast;
                if (typeof toast === 'function') toast('请先打开一个聊天');
                return;
            }

            const db = runtime.db;
            let chat = null;
            if (chatType === 'group') {
                if (db.groups && Array.isArray(db.groups)) {
                    chat = db.groups.find(g => g.id === chatId);
                }
            } else {
                if (db.characters && Array.isArray(db.characters)) {
                    chat = db.characters.find(c => c.id === chatId);
                }
            }
            if (!chat) {
                const toast = showToast || window.showToast;
                if (typeof toast === 'function') toast('无法获取当前聊天信息');
                return;
            }

            const calc = window.tokenCalculator && window.tokenCalculator.calculate;
            if (typeof calc !== 'function') return;
            const contextTokens = calc(chat, chatType);

            const systemEl = document.getElementById('token-stats-system');
            const worldInfoEl = document.getElementById('token-stats-worldinfo');
            const historyEl = document.getElementById('token-stats-history');
            const stickersEl = document.getElementById('token-stats-stickers');
            const messageCountEl = document.getElementById('token-stats-message-count');
            const lastUsageEl = document.getElementById('token-stats-last-usage');
            const totalEl = document.getElementById('token-stats-total');

            if (systemEl) systemEl.textContent = contextTokens.system.toLocaleString();
            if (worldInfoEl) worldInfoEl.textContent = contextTokens.worldInfo.toLocaleString();
            if (historyEl) historyEl.textContent = contextTokens.history.toLocaleString();
            if (stickersEl) stickersEl.textContent = (contextTokens.stickers || 0).toLocaleString();

            const messageCount = chat.history ? chat.history.filter(m => m.role !== 'system').length : 0;
            if (messageCountEl) messageCountEl.textContent = messageCount.toLocaleString();

            const lastUsage = (runtime.db && runtime.db.tokenUsage && runtime.db.tokenUsage.lastUsage) ? runtime.db.tokenUsage.lastUsage : 0;
            if (lastUsageEl) lastUsageEl.textContent = lastUsage > 0 ? lastUsage.toLocaleString() : '-';

            if (totalEl) totalEl.textContent = contextTokens.total.toLocaleString();
            modal.style.display = 'flex';
        } catch (error) {
            const toast = showToast || window.showToast;
            if (typeof toast === 'function') toast('打开统计弹窗失败');
        }
    };

    const closeTokenStatsModal = () => {
        const modal = document.getElementById('token-stats-modal');
        if (modal) modal.style.display = 'none';
    };

    TB_Token.init = (options) => {
        if (!options) return;
        getContext = options.getContext;
        showToast = options.showToast || window.showToast;

        const tokenStatsCloseBtn = document.getElementById('token-stats-close-btn');
        const tokenStatsModal = document.getElementById('token-stats-modal');
        if (tokenStatsCloseBtn) {
            tokenStatsCloseBtn.addEventListener('click', closeTokenStatsModal);
        }
        if (tokenStatsModal) {
            tokenStatsModal.addEventListener('click', (e) => {
                if (e.target === tokenStatsModal) {
                    closeTokenStatsModal();
                }
            });
        }
    };

    TB_Token.getHandlers = () => ({
        'token-stats': openTokenStatsModal
    });

    TB_Token.open = openTokenStatsModal;
    TB_Token.close = closeTokenStatsModal;

    window.TB_Token = TB_Token;
})();
