(() => {
    const TB_Core = {};
    const registry = {};
    let getContext = null;
    let handleLegacyAction = null;

    const register = (action, handler) => {
        if (!action || typeof handler !== 'function') return;
        registry[action] = handler;
    };

    const bindFunctionPanel = () => {
        const plusBtn = document.getElementById('plus-btn');
        const functionPanel = document.getElementById('function-panel');
        const messageArea = document.getElementById('message-area');
        const stickerModal = document.getElementById('sticker-modal');
        const chatRoomContent = document.querySelector('#chat-room-screen .content');

        const setupFunctionPages = () => {
            if (!functionPanel) return;
            const wrapper = functionPanel.querySelector('.function-pages-wrapper');
            if (!wrapper) return;
            const dots = functionPanel.querySelector('.function-dots');
            const items = Array.from(functionPanel.querySelectorAll('.function-item'));
            if (!items.length) return;

            wrapper.innerHTML = '';
            if (dots) dots.innerHTML = '';

            const itemsPerPage = 8;
            const pageCount = Math.ceil(items.length / itemsPerPage);

            for (let i = 0; i < pageCount; i += 1) {
                const page = document.createElement('div');
                page.className = 'function-page';
                const grid = document.createElement('div');
                grid.className = 'function-grid';
                items.slice(i * itemsPerPage, (i + 1) * itemsPerPage).forEach(item => {
                    grid.appendChild(item);
                });
                page.appendChild(grid);
                wrapper.appendChild(page);
            }

            if (dots) {
                for (let i = 0; i < pageCount; i += 1) {
                    const dot = document.createElement('div');
                    dot.className = 'function-dot';
                    dot.dataset.index = String(i);
                    if (i === 0) dot.classList.add('active');
                    dots.appendChild(dot);
                }
            }

            const updateDots = () => {
                if (!dots) return;
                const pageWidth = wrapper.clientWidth || 1;
                const index = Math.round(wrapper.scrollLeft / pageWidth);
                const allDots = dots.querySelectorAll('.function-dot');
                allDots.forEach((dot, idx) => {
                    if (idx === index) dot.classList.add('active');
                    else dot.classList.remove('active');
                });
            };

            if (!wrapper.dataset.scrollBound) {
                wrapper.addEventListener('scroll', updateDots, { passive: true });
                wrapper.dataset.scrollBound = 'true';
            }
            if (dots && !dots.dataset.clickBound) {
                dots.addEventListener('click', (e) => {
                    const dot = e.target.closest('.function-dot');
                    if (!dot) return;
                    const pageWidth = wrapper.clientWidth || 1;
                    const targetIndex = Number(dot.dataset.index || 0);
                    wrapper.scrollTo({ left: targetIndex * pageWidth, behavior: 'smooth' });
                });
                dots.dataset.clickBound = 'true';
            }
            updateDots();
        };

        const scrollToBottom = () => {
            if (messageArea) {
                messageArea.scrollTop = messageArea.scrollHeight;
                return;
            }
            if (chatRoomContent) {
                chatRoomContent.scrollTop = chatRoomContent.scrollHeight;
            }
        };

        setupFunctionPages();
        if (plusBtn) {
            plusBtn.addEventListener('click', () => {
                if (!functionPanel) return;
                if (stickerModal && stickerModal.classList.contains('visible')) {
                    stickerModal.classList.remove('visible');
                }
                functionPanel.classList.toggle('visible');
                setTimeout(scrollToBottom, 50);
            });
        }

        if (chatRoomContent) {
            chatRoomContent.addEventListener('click', (e) => {
                const loadMoreBtn = e.target.closest('#load-more-btn');
                if (loadMoreBtn) return;
                if (e.target.closest('.message-bubble')) return;
                if (e.target.closest('.card-v5')) return;
                if (e.target.closest('.load-more-btn')) return;
                const panelVisible = (functionPanel && functionPanel.classList.contains('visible')) || (stickerModal && stickerModal.classList.contains('visible'));
                const clickedInsidePanel = (functionPanel && functionPanel.contains(e.target)) || (stickerModal && stickerModal.contains(e.target));
                if (panelVisible && !clickedInsidePanel) {
                    if (functionPanel && functionPanel.classList.contains('visible')) {
                        functionPanel.classList.remove('visible');
                    }
                    if (stickerModal && stickerModal.classList.contains('visible')) {
                        stickerModal.classList.remove('visible');
                    }
                    setTimeout(scrollToBottom, 50);
                }
            });
        }

        if (functionPanel) {
            functionPanel.addEventListener('click', (e) => {
                const item = e.target.closest('.function-item');
                if (!item) return;
                const action = item.dataset.action;
                functionPanel.classList.remove('visible');
                setTimeout(scrollToBottom, 50);
                if (registry[action]) {
                    registry[action](action, e);
                } else if (typeof handleLegacyAction === 'function') {
                    handleLegacyAction(action, e);
                }
            });
        }
    };

    TB_Core.init = (options) => {
        if (!options) return;
        getContext = options.getContext;
        handleLegacyAction = options.handleLegacyAction;
        if (window.TB_Messenger && typeof window.TB_Messenger.init === 'function') {
            window.TB_Messenger.init({
                getContext,
                saveData: options.saveData,
                renderMessages: options.renderMessages
            });
        }
        if (window.TB_Plot && typeof window.TB_Plot.init === 'function') {
            window.TB_Plot.init({
                getContext,
                messenger: window.TB_Messenger,
                renderChatList: options.renderChatList
            });
            const handlers = window.TB_Plot.getHandlers ? window.TB_Plot.getHandlers() : {};
            Object.keys(handlers).forEach(action => register(action, handlers[action]));
        }
        if (window.TB_Media && typeof window.TB_Media.init === 'function') {
            window.TB_Media.init({
                getContext,
                messenger: window.TB_Messenger,
                renderChatList: options.renderChatList,
                showToast: options.showToast,
                compressImage: options.compressImage
            });
            const handlers = window.TB_Media.getHandlers ? window.TB_Media.getHandlers() : {};
            Object.keys(handlers).forEach(action => register(action, handlers[action]));
        }
        if (window.TB_AiActions && typeof window.TB_AiActions.init === 'function') {
            window.TB_AiActions.init({
                getContext,
                saveData: options.saveData,
                renderMessages: options.renderMessages,
                renderChatList: options.renderChatList,
                showToast: options.showToast
            });
            const handlers = window.TB_AiActions.getHandlers ? window.TB_AiActions.getHandlers() : {};
            Object.keys(handlers).forEach(action => register(action, handlers[action]));
        }
        if (window.TB_Token && typeof window.TB_Token.init === 'function') {
            window.TB_Token.init({
                getContext,
                showToast: options.showToast,
                calculateCurrentContextTokens: options.calculateCurrentContextTokens
            });
            const handlers = window.TB_Token.getHandlers ? window.TB_Token.getHandlers() : {};
            Object.keys(handlers).forEach(action => register(action, handlers[action]));
        }
        if (window.TB_CallLogManager && typeof window.TB_CallLogManager.init === 'function') {
            window.TB_CallLogManager.init({
                getContext,
                saveData: options.saveData,
                showToast: options.showToast
            });
        }
        bindFunctionPanel();
    };

    TB_Core.register = register;

    window.TB_Core = TB_Core;
})();
