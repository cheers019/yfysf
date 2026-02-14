(() => {
    const TB_AiActions = {};
    let getContext = null;
    let saveData = null;
    let renderMessages = null;
    let renderChatList = null;
    let showToast = null;

    const getRuntime = () => {
        const context = typeof getContext === 'function' ? getContext() : null;
        return {
            db: context && context.db ? context.db : window.db,
            currentChatId: context && context.currentChatId ? context.currentChatId : null,
            currentChatType: context && context.currentChatType ? context.currentChatType : 'private'
        };
    };

    const getChat = () => {
        const runtime = getRuntime();
        if (!runtime.db || !runtime.currentChatId) return null;
        if (runtime.currentChatType === 'group') {
            return runtime.db.groups ? runtime.db.groups.find(g => g.id === runtime.currentChatId) : null;
        }
        return runtime.db.characters ? runtime.db.characters.find(c => c.id === runtime.currentChatId) : null;
    };

    const refreshChatList = () => {
        const render = renderChatList || window.renderChatList;
        if (typeof render === 'function') render();
    };

    const notify = (text) => {
        const toast = showToast || window.showToast;
        if (typeof toast === 'function') toast(text);
    };

    const rollback = async () => {
        if (typeof isGenerating !== 'undefined' && isGenerating) return;
        const chat = getChat();
        if (!chat || !Array.isArray(chat.history) || chat.history.length === 0) return;
        let removedCount = 0;
        while (chat.history.length > 0) {
            const lastMessage = chat.history[chat.history.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                chat.history.pop();
                removedCount += 1;
                continue;
            }
            if (lastMessage && lastMessage.role === 'user') {
                break;
            }
            break;
        }
        const finalMessage = chat.history[chat.history.length - 1];
        if (!finalMessage || finalMessage.role !== 'user') {
            notify('找不到可以重新生成的AI回复。');
            return;
        }
        if (removedCount === 0) {
            notify('找不到可以重新生成的AI回复。');
            return;
        }
        const render = renderMessages || window.renderMessages;
        if (typeof render === 'function') render(false, true);
        const save = saveData || window.saveData;
        if (typeof save === 'function') await save();
        refreshChatList();
        console.log('Rollback to user message', {
            removedCount,
            lastMessageId: finalMessage.id,
            lastRole: finalMessage.role
        });
        notify('重新生成中...');
        const getAiReply = window.getAiReply;
        if (typeof getAiReply === 'function') getAiReply();
    };

    const continueWriting = async () => {
        if (typeof isGenerating !== 'undefined' && isGenerating) return;
        const chat = getChat();
        if (!chat || !Array.isArray(chat.history)) return;
        const lastAiMessage = [...chat.history].reverse().find(m => m.role === 'assistant');
        if (!lastAiMessage) {
            notify('没有可续写的AI回复。');
            return;
        }
        const continuationPrompt = `[system: 请直接续写你上一条的回复内容，不要重复已经说过的话，也不要说任何“好的，这是续写：”之类的开场白。你的上一条回复是：“${lastAiMessage.content}”]`;
        const promptMessage = {
            role: 'user',
            content: continuationPrompt,
            parts: [{ type: 'text', text: continuationPrompt }],
            id: `temp_prompt_${Date.now()}`,
            timestamp: Date.now()
        };
        const runtime = getRuntime();
        if (runtime.currentChatType === 'group') {
            promptMessage.senderId = 'user_me';
        }
        chat.history.push(promptMessage);
        try {
            const getAiReply = window.getAiReply;
            if (typeof getAiReply === 'function') await getAiReply();
        } finally {
            const index = chat.history.findIndex(m => m.id === promptMessage.id);
            if (index > -1) {
                chat.history.splice(index, 1);
            }
            const save = saveData || window.saveData;
            if (typeof save === 'function') await save();
        }
    };

    TB_AiActions.init = (options) => {
        if (!options) return;
        getContext = options.getContext;
        saveData = options.saveData || window.saveData;
        renderMessages = options.renderMessages || window.renderMessages;
        renderChatList = options.renderChatList || window.renderChatList;
        showToast = options.showToast || window.showToast;
    };

    TB_AiActions.getHandlers = () => ({
        rollback: rollback,
        'continue-writing': continueWriting
    });

    TB_AiActions.rollback = rollback;
    TB_AiActions.continueWriting = continueWriting;

    window.TB_AiActions = TB_AiActions;
})();
