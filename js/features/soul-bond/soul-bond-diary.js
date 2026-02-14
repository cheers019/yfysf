function getBondDiaryCharacter() {
    if (window.SoulBondLogic && typeof window.SoulBondLogic.getBondCharacter === 'function') {
        return window.SoulBondLogic.getBondCharacter();
    }
    return null;
}

function ensureDiaryExchanges(character) {
    if (!character.soulBondData) character.soulBondData = {};
    if (!Array.isArray(character.soulBondData.diaryExchanges)) character.soulBondData.diaryExchanges = [];
    return character.soulBondData.diaryExchanges;
}

function renderDiaryExchanges() {
    const character = SoulBondDiary.getBondDiaryCharacter();
    const container = document.getElementById('diary-exchange-list-container');
    const placeholder = document.getElementById('no-diary-exchanges-placeholder');
    if (!container || !placeholder) return;

    if (!character) {
        container.innerHTML = '';
        placeholder.style.display = 'block';
        return;
    }

    const exchanges = SoulBondDiary.ensureDiaryExchanges(character);
    if (exchanges.length === 0) {
        container.innerHTML = '';
        placeholder.style.display = 'block';
        return;
    }

    placeholder.style.display = 'none';
    container.innerHTML = '';

    const pad2 = typeof window.pad === 'function' ? window.pad : (value) => String(value).padStart(2, '0');
    const partnerName = character.remarkName || character.realName || character.name || '';
    const myName = character.myName || '我';

    exchanges.forEach(exchange => {
        const bookDiv = document.createElement('div');
        bookDiv.className = 'diary-book';
        bookDiv.dataset.id = exchange.id;

        const date = new Date(exchange.timestamp);
        const dateString = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

        bookDiv.innerHTML = `
            <div class="diary-book-inner">
                <div class="diary-book-cover" style="background-image: url('${exchange.coverImage}')">
                    <span class="cover-date">${dateString}</span>
                    <h4 class="cover-title">${exchange.coverTitle || '我们的日记'}</h4>
                    <span class="cover-authors">${myName} & ${partnerName}</span>
                </div>
                <div class="diary-book-back">
                    <p>点击查看<br>${exchange.coverTitle || '我们的日记'}</p>
                </div>
            </div>
        `;
        container.appendChild(bookDiv);
    });
}

function openDiaryViewer(exchangeId) {
    const character = SoulBondDiary.getBondDiaryCharacter();
    if (!character) return;
    const exchanges = SoulBondDiary.ensureDiaryExchanges(character);
    const exchange = exchanges.find(ex => ex.id === exchangeId);
    if (!exchange) return;

    const viewerTitle = document.getElementById('diary-viewer-title');
    const contentContainer = document.getElementById('diary-viewer-content');
    const viewerModal = document.getElementById('diary-exchange-viewer-modal');
    if (!viewerTitle || !contentContainer || !viewerModal) return;

    viewerTitle.textContent = exchange.coverTitle || '交换日记';
    const userImageHTML = exchange.userImage ? `<img src="${exchange.userImage}" alt="日记图片" class="entry-image">` : '';
    const partnerAvatar = character.avatar || character.icon || '';
    const partnerName = character.remarkName || character.realName || character.name || '';
    const myAvatar = character.myAvatar || character.avatar || '';
    const myName = character.myName || '我';

    contentContainer.innerHTML = `
        <div class="diary-exchange-entry user-entry">
            <div class="entry-header">
                <img src="${myAvatar}" alt="My Avatar">
                <span class="author-name">${myName}</span>
            </div>
            <p class="entry-content">${exchange.userEntry.replace(/\n/g, '<br>')}</p>
            ${userImageHTML}
        </div>
        <div class="diary-exchange-entry ai-reply">
            <div class="entry-header">
                <img src="${partnerAvatar}" alt="AI Avatar">
                <span class="author-name">${partnerName}</span>
            </div>
            <p class="entry-content">${exchange.aiReply.replace(/\n/g, '<br>')}</p>
        </div>
    `;
    viewerModal.classList.add('visible');
}

function generateDiaryExchangePrompt(character, userContent, userImage) {
    let imagePromptPart = userImage ? "Ta还附上了一张图片。你的回信必须深刻结合图片内容和文字来写。" : "";

    let prompt = `你正在扮演角色“${character.realName}”，人设是：${character.persona}。
你刚刚收到了“我”（${character.myName}）写给你的一篇交换日记。${imagePromptPart}

# 我写的日记内容：
"${userContent}"

# 你的任务：
1.  **创作回信**: 严格以 ${character.realName} 的第一人称视角，写一篇**不少于200字**的回复日记。你的回信需要深刻体现你读完日记（以及看完图片，如果附带了）之后的复杂情感、联想、回忆或对未来的期许。
2.  **构思封面**: 根据你们的日记内容，为这本日记构思一个封面。你需要提供：
    - 一个简短、文艺的封面标题 (coverTitle)。
    - 一个用于AI绘画的、描述封面画面的英文关键词短语 (coverImagePrompt)。
3.  **严格格式**: 你的输出必须是严格的JSON格式，不要包含任何其他文字。

# JSON格式示例:
{
  "diaryContent": "这里是你写的、不少于200字的回信日记正文...",
  "coverTitle": "海边的约定",
  "coverImagePrompt": "anime style, a couple sitting on the beach, watching sunset, warm colors, romantic"
}`;

    return prompt;
}

function safeJsonParse(str) {
    try {
        let cleanStr = str.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanStr);
    } catch (error) {
        console.error("JSON解析失败，原始字符串为:", str);
        throw error;
    }
}

function setupDiaryExchangeApp() {
    const writeModal = document.getElementById('write-diary-exchange-modal');
    const writeForm = document.getElementById('diary-exchange-form');
    const imageUpload = document.getElementById('exchange-diary-image-upload');
    const imagePreview = document.getElementById('exchange-diary-image-preview');
    const submitBtn = writeForm ? writeForm.querySelector('button[type="submit"]') : null;
    const listContainer = document.getElementById('diary-exchange-list-container');
    const viewerModal = document.getElementById('diary-exchange-viewer-modal');

    let tempImageDataUrl = null;

    const openBtn = document.getElementById('write-new-exchange-btn');
    if (openBtn && writeForm && imagePreview && submitBtn && writeModal) {
        openBtn.addEventListener('click', () => {
            writeForm.reset();
            imagePreview.style.display = 'none';
            imagePreview.style.backgroundImage = 'none';
            tempImageDataUrl = null;
            submitBtn.disabled = false;
            writeModal.classList.add('visible');
        });
    }

    if (imageUpload && imagePreview) {
        imageUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (typeof window.compressImage !== 'function') {
                if (typeof window.showToast === 'function') window.showToast('图片处理失败');
                tempImageDataUrl = null;
                return;
            }
            try {
                const compressedUrl = await window.compressImage(file, { quality: 0.8, maxWidth: 800, maxHeight: 800 });
                tempImageDataUrl = compressedUrl;
                imagePreview.style.backgroundImage = `url(${compressedUrl})`;
                imagePreview.style.display = 'block';
            } catch (error) {
                if (typeof window.showToast === 'function') window.showToast('图片处理失败');
                tempImageDataUrl = null;
            }
        });
    }

    if (writeForm && submitBtn && writeModal) {
        writeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const character = SoulBondDiary.getBondDiaryCharacter();
            if (!character) return;

            const contentInput = document.getElementById('exchange-diary-content');
            const userContent = contentInput ? contentInput.value.trim() : '';
            if (!userContent) {
                if (typeof window.showToast === 'function') window.showToast('日记内容不能为空');
                return;
            }

            submitBtn.disabled = true;
            writeModal.classList.remove('visible');
            if (typeof window.showToast === 'function') window.showToast('正在发送日记，请稍候...');

            try {
                if (typeof window.callAiApi !== 'function') {
                    throw new Error('未找到AI接口');
                }

                const prompt = SoulBondDiary.generateDiaryExchangePrompt(character, userContent, tempImageDataUrl);
                const functionalSettings = window.db && window.db.functionalApiSettings && Object.keys(window.db.functionalApiSettings).length > 0 &&
                    window.db.functionalApiSettings.url && window.db.functionalApiSettings.key && window.db.functionalApiSettings.model
                    ? window.db.functionalApiSettings
                    : (window.db ? window.db.apiSettings : null);

                if (!functionalSettings) {
                    throw new Error('未找到可用的模型配置');
                }

                let messagesForApi;
                if (functionalSettings.provider === 'claude' && tempImageDataUrl) {
                    const base64Match = tempImageDataUrl.match(/^data:(image\/.+);base64,(.*)$/);
                    messagesForApi = [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image', source: { type: 'base64', media_type: base64Match[1], data: base64Match[2] } }] }];
                } else {
                    messagesForApi = [{ role: 'user', content: prompt }];
                }

                const aiResponseText = await window.callAiApi(messagesForApi, functionalSettings);
                const responseData = safeJsonParse(aiResponseText);

                const newExchange = {
                    id: `exchange_${Date.now()}`,
                    timestamp: Date.now(),
                    userEntry: userContent,
                    userImage: tempImageDataUrl,
                    aiReply: responseData.diaryContent,
                    coverImage: `https://image.pollinations.ai/prompt/${encodeURIComponent(responseData.coverImagePrompt)}`,
                    coverTitle: responseData.coverTitle
                };

                const exchanges = SoulBondDiary.ensureDiaryExchanges(character);
                exchanges.unshift(newExchange);

                if (typeof window.saveData === 'function') {
                    await window.saveData();
                }
                SoulBondDiary.renderExchanges();
                if (typeof window.showToast === 'function') window.showToast('交换日记已收到回复！');
            } catch (error) {
                console.error("交换日记失败:", error);
                if (typeof window.showToast === 'function') window.showToast(`发送失败: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    if (listContainer) {
        let longPressTimer;
        const handleLongPress = async (targetElement) => {
            const diaryBook = targetElement.closest('.diary-book');
            if (!diaryBook) return;
            const exchangeId = diaryBook.dataset.id;
            if (!exchangeId) return;
            if (!confirm('确定要删除这本日记吗？')) return;

            const character = SoulBondDiary.getBondDiaryCharacter();
            if (!character) return;
            const exchanges = SoulBondDiary.ensureDiaryExchanges(character);
            const nextExchanges = exchanges.filter(ex => ex.id !== exchangeId);
            character.soulBondData.diaryExchanges = nextExchanges;
            if (typeof window.saveData === 'function') {
                await window.saveData();
            }
            SoulBondDiary.renderExchanges();
            if (typeof window.showToast === 'function') window.showToast('交换日记已删除');
        };

        listContainer.addEventListener('click', (e) => {
            const diaryBook = e.target.closest('.diary-book');
            if (diaryBook) {
                SoulBondDiary.openViewer(diaryBook.dataset.id);
            }
        });
        listContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            handleLongPress(e.target);
        });
        listContainer.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => handleLongPress(e.target), 500);
        });
        listContainer.addEventListener('touchend', () => clearTimeout(longPressTimer));
        listContainer.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    }

    const closeViewerBtn = document.getElementById('close-diary-viewer-btn');
    if (closeViewerBtn && viewerModal) {
        closeViewerBtn.addEventListener('click', () => {
            viewerModal.classList.remove('visible');
        });
    }
}

const SoulBondDiary = {
    getBondDiaryCharacter,
    ensureDiaryExchanges,
    renderExchanges: renderDiaryExchanges,
    openViewer: openDiaryViewer,
    generateDiaryExchangePrompt,
    setup: setupDiaryExchangeApp
};

window.SoulBondDiary = SoulBondDiary;
