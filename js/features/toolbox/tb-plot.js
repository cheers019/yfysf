(() => {
    const TB_Plot = {};
    let getContext = null;
    let messenger = null;
    let renderChatList = null;

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

    const openTimeSkipModal = () => {
        const timeSkipModal = document.getElementById('time-skip-modal');
        const timeSkipForm = document.getElementById('time-skip-form');
        if (timeSkipForm) timeSkipForm.reset();
        if (timeSkipModal) timeSkipModal.classList.add('visible');
    };

    const sendTimeSkipMessage = async (text) => {
        if (!text) return;
        const runtime = getRuntime();
        if (runtime.currentChatType === 'private') {
            const character = runtime.db && runtime.db.characters ? runtime.db.characters.find(c => c.id === runtime.currentChatId) : null;
            if (character && character.isBlockedByAi) {
                if (typeof window.showToast === 'function') window.showToast('你已被对方拉黑');
                return;
            }
        }
        const chat = getChat();
        if (!chat) return;

        const visualMessage = {
            role: 'system',
            content: `[system-display:${text}]`,
            parts: []
        };
        const contextMessage = {
            role: 'user',
            content: `[system: ${text}]`,
            parts: [{ type: 'text', text: `[system: ${text}]` }]
        };
        if (runtime.currentChatType === 'group') {
            visualMessage.senderId = 'user_me';
            contextMessage.senderId = 'user_me';
        }

        await messenger.sendActionMessage({
            chat,
            chatId: runtime.currentChatId,
            chatType: runtime.currentChatType,
            messages: [visualMessage, contextMessage],
            renderArgs: [false, true]
        });
        refreshChatList();

        const timeSkipModal = document.getElementById('time-skip-modal');
        if (timeSkipModal) timeSkipModal.classList.remove('visible');
    };

    const openFileModal = () => {
        const sendFileModal = document.getElementById('send-file-modal');
        const sendFileForm = document.getElementById('send-file-form');
        if (sendFileForm) sendFileForm.reset();
        if (sendFileModal) sendFileModal.classList.add('visible');
    };

    const sendFileMessage = async (fileName, fileContent) => {
        const runtime = getRuntime();
        const chat = getChat();
        if (!chat || !fileName || !fileContent) return;

        const myName = runtime.currentChatType === 'private' ? chat.myName : chat.me.nickname;
        const contentString = `[${myName}的文件：${fileName}]`;
        const aiContentString = `[${myName}发送的文件，文件名：'${fileName}'，文件内容：'${fileContent}']`;
        const message = {
            role: 'user',
            content: aiContentString,
            parts: [{ type: 'text', text: aiContentString }],
            senderId: runtime.currentChatType === 'group' ? 'user_me' : undefined,
            fileData: { name: fileName, title: fileName, content: fileContent }
        };

        await messenger.sendActionMessage({
            chat,
            chatId: runtime.currentChatId,
            chatType: runtime.currentChatType,
            message,
            renderArgs: [false, true]
        });
        refreshChatList();

        const sendFileModal = document.getElementById('send-file-modal');
        if (sendFileModal) sendFileModal.classList.remove('visible');
    };

    const openLocationModal = () => {
        const sendLocationModal = document.getElementById('send-location-modal');
        const sendLocationForm = document.getElementById('send-location-form');
        if (sendLocationForm) sendLocationForm.reset();
        if (sendLocationModal) sendLocationModal.classList.add('visible');
    };

    const sendLocationMessage = async (mainLocation, detailLocation) => {
        const runtime = getRuntime();
        const chat = getChat();
        if (!chat || !mainLocation || !detailLocation) return;

        const myName = runtime.currentChatType === 'private' ? chat.myName : chat.me.nickname;
        const aiContentString = `[${myName}分享了位置：主位置 '${mainLocation}', 详细位置 '${detailLocation}']`;
        const message = {
            role: 'user',
            type: 'location',
            content: aiContentString,
            parts: [{ type: 'text', text: aiContentString }],
            senderId: runtime.currentChatType === 'group' ? 'user_me' : undefined,
            locationData: { main: mainLocation, detail: detailLocation }
        };

        await messenger.sendActionMessage({
            chat,
            chatId: runtime.currentChatId,
            chatType: runtime.currentChatType,
            message,
            renderArgs: [false, true]
        });
        refreshChatList();

        const sendLocationModal = document.getElementById('send-location-modal');
        if (sendLocationModal) sendLocationModal.classList.remove('visible');
    };

    TB_Plot.init = (options) => {
        if (!options) return;
        getContext = options.getContext;
        messenger = options.messenger || window.TB_Messenger;
        renderChatList = options.renderChatList;

        const timeSkipBtn = document.getElementById('time-skip-btn');
        const timeSkipModal = document.getElementById('time-skip-modal');
        const timeSkipForm = document.getElementById('time-skip-form');
        const timeSkipInput = document.getElementById('time-skip-input');
        if (timeSkipBtn) timeSkipBtn.addEventListener('click', openTimeSkipModal);
        if (timeSkipModal) {
            timeSkipModal.addEventListener('click', (e) => {
                if (e.target === timeSkipModal) timeSkipModal.classList.remove('visible');
            });
        }
        if (timeSkipForm) {
            timeSkipForm.addEventListener('submit', (e) => {
                e.preventDefault();
                sendTimeSkipMessage(timeSkipInput.value.trim());
            });
        }

        const fileBtn = document.getElementById('file-btn');
        const sendFileForm = document.getElementById('send-file-form');
        const fileNameInput = document.getElementById('file-name-input');
        const fileContentInput = document.getElementById('file-content-input');
        if (fileBtn) fileBtn.addEventListener('click', openFileModal);
        if (sendFileForm) {
            sendFileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                sendFileMessage(fileNameInput.value.trim(), fileContentInput.value.trim());
            });
        }

        const locationBtn = document.getElementById('location-btn');
        const sendLocationForm = document.getElementById('send-location-form');
        const locationMainInput = document.getElementById('location-main-input');
        const locationDetailInput = document.getElementById('location-detail-input');
        const closeLocationDisplayBtn = document.getElementById('close-location-display-btn');
        const displayLocationModal = document.getElementById('display-location-modal');
        if (locationBtn) locationBtn.addEventListener('click', openLocationModal);
        if (sendLocationForm) {
            sendLocationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                sendLocationMessage(locationMainInput.value.trim(), locationDetailInput.value.trim());
            });
        }
        if (closeLocationDisplayBtn && displayLocationModal) {
            closeLocationDisplayBtn.addEventListener('click', () => {
                displayLocationModal.classList.remove('visible');
            });
        }
    };

    TB_Plot.getHandlers = () => ({
        'time-skip': openTimeSkipModal,
        'file': openFileModal,
        'location': openLocationModal
    });

    window.TB_Plot = TB_Plot;
})();
