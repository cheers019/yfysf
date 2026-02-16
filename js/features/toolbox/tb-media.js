(() => {
    const TB_Media = {};
    let getContext = null;
    let messenger = null;
    let renderChatList = null;
    let showToast = null;
    let compressImageFn = null;
    let imageUploadInput = null;
    let sendVoiceModal = null;
    let sendPvModal = null;

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

    const isBlockedByAi = () => {
        const runtime = getRuntime();
        if (runtime.currentChatType !== 'private') return false;
        const character = runtime.db && runtime.db.characters ? runtime.db.characters.find(c => c.id === runtime.currentChatId) : null;
        if (character && character.isBlockedByAi) {
            const toast = showToast || window.showToast;
            if (typeof toast === 'function') toast('你已被对方拉黑');
            return true;
        }
        return false;
    };

    const sendImageForRecognition = async (base64Data) => {
        if (!base64Data) return;
        if (typeof isGenerating !== 'undefined' && isGenerating) return;
        if (isBlockedByAi()) return;
        const runtime = getRuntime();
        const chat = getChat();
        if (!chat) return;
        const myName = runtime.currentChatType === 'private' ? chat.myName : chat.me.nickname;
        const textPrompt = `[${myName}发来了一张图片：]`;
        const message = {
            role: 'user',
            content: base64Data,
            parts: [{ type: 'text', text: textPrompt }, { type: 'image', data: base64Data }],
            senderId: runtime.currentChatType === 'group' ? 'user_me' : undefined
        };
        await messenger.sendActionMessage({
            chat,
            chatId: runtime.currentChatId,
            chatType: runtime.currentChatType,
            message,
            renderArgs: [false, true]
        });
        refreshChatList();
    };

    const sendMyVoiceMessage = async (text) => {
        if (!text) return;
        if (isBlockedByAi()) return;
        const runtime = getRuntime();
        const chat = getChat();
        if (!chat) return;
        const myName = runtime.currentChatType === 'private' ? chat.myName : chat.me.nickname;
        const content = `[${myName}的语音：${text}]`;
        const message = {
            role: 'user',
            content: content,
            parts: [{ type: 'text', text: content }],
            senderId: runtime.currentChatType === 'group' ? 'user_me' : undefined
        };
        await messenger.sendActionMessage({
            chat,
            chatId: runtime.currentChatId,
            chatType: runtime.currentChatType,
            message,
            renderArgs: [false, true]
        });
        refreshChatList();
        if (sendVoiceModal) sendVoiceModal.classList.remove('visible');
    };

    const sendMyPhotoVideo = async (text) => {
        if (!text) return;
        if (isBlockedByAi()) return;
        const runtime = getRuntime();
        const chat = getChat();
        if (!chat) return;
        const myName = runtime.currentChatType === 'private' ? chat.myName : chat.me.nickname;
        const content = `[${myName}发来的照片/视频：${text}]`;
        const message = {
            role: 'user',
            content: content,
            parts: [{ type: 'text', text: content }],
            senderId: runtime.currentChatType === 'group' ? 'user_me' : undefined
        };
        await messenger.sendActionMessage({
            chat,
            chatId: runtime.currentChatId,
            chatType: runtime.currentChatType,
            message,
            renderArgs: [false, true]
        });
        refreshChatList();
        if (sendPvModal) sendPvModal.classList.remove('visible');
    };

    const openVoiceModal = () => {
        const sendVoiceForm = document.getElementById('send-voice-form');
        const voiceDurationPreview = document.getElementById('voice-duration-preview');
        sendVoiceModal = document.getElementById('send-voice-modal');
        if (sendVoiceForm) sendVoiceForm.reset();
        if (voiceDurationPreview) voiceDurationPreview.textContent = '0"';
        if (sendVoiceModal) sendVoiceModal.classList.add('visible');
    };

    const openPhotoVideoModal = () => {
        const sendPvForm = document.getElementById('send-pv-form');
        sendPvModal = document.getElementById('send-pv-modal');
        if (sendPvForm) sendPvForm.reset();
        if (sendPvModal) sendPvModal.classList.add('visible');
    };

    const triggerImageRecognition = () => {
        if (imageUploadInput) imageUploadInput.click();
    };

    TB_Media.init = (options) => {
        if (!options) return;
        getContext = options.getContext;
        messenger = options.messenger || window.TB_Messenger;
        renderChatList = options.renderChatList;
        showToast = options.showToast || window.showToast;
        compressImageFn = options.compressImage || window.compressImage;

        const imageRecognitionBtn = document.getElementById('image-recognition-btn');
        imageUploadInput = document.getElementById('image-upload-input');
        if (imageRecognitionBtn && imageUploadInput) {
            imageRecognitionBtn.addEventListener('click', triggerImageRecognition);
            imageUploadInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        if (typeof compressImageFn !== 'function') {
                            throw new Error('compressImage not available');
                        }
                        const compressedUrl = await compressImageFn(file, {
                            quality: 0.8,
                            maxWidth: 1024,
                            maxHeight: 1024
                        });
                        await sendImageForRecognition(compressedUrl);
                    } catch (error) {
                        if (typeof showToast === 'function') showToast('图片处理失败，请重试');
                    } finally {
                        e.target.value = null;
                    }
                }
            });
        }

        const voiceMessageBtn = document.getElementById('voice-message-btn');
        const sendVoiceForm = document.getElementById('send-voice-form');
        const voiceTextInput = document.getElementById('voice-text-input');
        sendVoiceModal = document.getElementById('send-voice-modal');
        if (voiceMessageBtn) voiceMessageBtn.addEventListener('click', openVoiceModal);
        if (sendVoiceForm) {
            sendVoiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                sendMyVoiceMessage(voiceTextInput.value.trim());
            });
        }

        const photoVideoBtn = document.getElementById('photo-video-btn');
        const sendPvForm = document.getElementById('send-pv-form');
        const pvTextInput = document.getElementById('pv-text-input');
        sendPvModal = document.getElementById('send-pv-modal');
        if (photoVideoBtn) photoVideoBtn.addEventListener('click', openPhotoVideoModal);
        if (sendPvForm) {
            sendPvForm.addEventListener('submit', (e) => {
                e.preventDefault();
                sendMyPhotoVideo(pvTextInput.value.trim());
            });
        }
    };

    TB_Media.getHandlers = () => ({
        'photo-video': openPhotoVideoModal,
        'image-recognition': triggerImageRecognition,
        'voice-message': openVoiceModal
    });

    if (window.displayDispatcher && typeof window.displayDispatcher.register === 'function') {
        window.displayDispatcher.register('voice', (data) => {
            if (!data) return '';
            return `
                <div class="voice-bubble" style="background-color: ${data.bubbleTheme.bg}; color: ${data.bubbleTheme.text};">
                    <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                    <span class="duration">${data.duration}"</span>
                </div>
                <div class="voice-transcript">${data.text}</div>`;
        });
        window.displayDispatcher.register('image', (data) => {
            if (!data) return '';
            return `<div class="image-bubble"><img src="${data.imageData}" alt="图片消息"></div>`;
        });
        window.displayDispatcher.register('video', (data) => {
            if (!data) return '';
            return `<div class="pv-card"><div class="pv-card-content">${data.text}</div><div class="pv-card-image-overlay" style="background-image: url('${data.isSent ? 'https://i.postimg.cc/L8NFrBrW/1752307494497.jpg' : 'https://i.postimg.cc/1tH6ds9g/1752301200490.jpg'}');"></div><div class="pv-card-footer"><svg viewBox="0 0 24 24"><path d="M4,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M4,6V18H20V6H4M10,9A1,1 0 0,1 11,10A1,1 0 0,1 10,11A1,1 0 0,1 9,10A1,1 0 0,1 10,9M8,17L11,13L13,15L17,10L20,14V17H8Z"></path></svg><span>照片/视频・点击查看</span></div>`;
        });
    }

    window.TB_Media = TB_Media;
})();
