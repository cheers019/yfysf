(() => {
    const TB_Messenger = {};
    let getContext = null;
    let saveData = null;
    let renderMessages = null;

    const getRuntime = () => {
        const context = typeof getContext === 'function' ? getContext() : null;
        return {
            db: context && context.db ? context.db : window.db,
            currentChatId: context && context.currentChatId ? context.currentChatId : null,
            currentChatType: context && context.currentChatType ? context.currentChatType : 'private'
        };
    };

    const resolveChat = (chatId, chatType, db) => {
        if (!db || !chatId) return null;
        if (chatType === 'group') {
            return db.groups ? db.groups.find(g => g.id === chatId) : null;
        }
        return db.characters ? db.characters.find(c => c.id === chatId) : null;
    };

    const normalizeMessage = (data) => {
        const base = Object.assign({}, data || {});
        if (!base.id) base.id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        if (!base.timestamp) base.timestamp = Date.now();
        if (!base.role) base.role = 'user';
        if (typeof base.content === 'undefined') base.content = '';
        if (!base.parts) base.parts = [];

        const isLocationType = base.type === 'location' || !!base.locationData;
        if (isLocationType && base.locationData && (typeof base.locationData.main === 'string' || typeof base.locationData.detail === 'string')) {
            const hasContent = typeof base.content === 'string' && base.content.trim().length > 0;
            let mainText = typeof base.locationData.main === 'string' ? base.locationData.main.trim() : '';
            let detailText = typeof base.locationData.detail === 'string' ? base.locationData.detail.trim() : '';
            const hasAddressInContent = hasContent && ((mainText && base.content.includes(mainText)) || (detailText && base.content.includes(detailText)));

            if (!hasContent || !hasAddressInContent) {
                const addressText = detailText ? `${mainText}，${detailText}` : mainText || detailText;
                if (addressText) {
                    const prefix = base.role === 'assistant' ? '位置：' : '我分享了位置：';
                    const newContent = `${prefix}${addressText}`;
                    base.content = newContent;
                    const hasTextPart = Array.isArray(base.parts) && base.parts.some(p => p && p.type === 'text');
                    if (!hasTextPart) {
                        base.parts = base.parts.concat([{ type: 'text', text: newContent }]);
                    }
                }
            }
        }

        return base;
    };

    TB_Messenger.init = (options) => {
        if (typeof options === 'function') {
            getContext = options;
            return;
        }
        if (options && typeof options.getContext === 'function') getContext = options.getContext;
        if (options && typeof options.saveData === 'function') saveData = options.saveData;
        if (options && typeof options.renderMessages === 'function') renderMessages = options.renderMessages;
    };

    TB_Messenger.sendActionMessage = async (payload) => {
        const runtime = getRuntime();
        const chatId = payload && payload.chatId ? payload.chatId : runtime.currentChatId;
        const chatType = payload && payload.chatType ? payload.chatType : runtime.currentChatType;
        const chat = payload && payload.chat ? payload.chat : resolveChat(chatId, chatType, runtime.db);
        if (!chat) return null;

        const items = payload && Array.isArray(payload.messages) ? payload.messages : (payload && payload.message ? [payload.message] : [payload]);
        const messages = items.map(normalizeMessage);
        chat.history.push(...messages);

        const save = saveData || window.saveData;
        if (typeof save === 'function') await save();

        const render = renderMessages || window.renderMessages;
        if (typeof render === 'function') {
            const args = payload && payload.renderArgs ? payload.renderArgs : [false, true];
            render(...args);
        }

        return { chat, messages };
    };

    window.TB_Messenger = TB_Messenger;
})();
