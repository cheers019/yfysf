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

    window.TB_Media = TB_Media;
})();
