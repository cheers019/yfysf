function renderBondInvitationScreen() {
    const myAvatarContainer = document.getElementById('bond-invite-my-avatar');
    const myProfile = window.db.characters[0]
        ? { name: window.db.characters[0].myName, avatar: window.db.characters[0].myAvatar }
        : { name: '我', avatar: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg' };
    if (myAvatarContainer) {
        myAvatarContainer.innerHTML = `<img src="${myProfile.avatar}" alt="My Avatar"><div class="avatar-name">${myProfile.name}</div>`;
    }
}

function setupBondInvitationSystem() {
    const inviteModal = document.getElementById('bond-invite-modal');
    ['bond-invite-main-btn', 'bond-invite-ai-avatar'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', () => {
            const isAnyInvitationPending = window.db.characters.some(c => c.soulBondStatus === 'pending_by_user');
            if (isAnyInvitationPending) {
                if (typeof window.showToast === 'function') window.showToast('你已经有一个正在等待回应的邀请了，请先处理。');
                return;
            }
            const list = document.getElementById('bond-invite-selection-list');
            if (!list) return;
            list.innerHTML = '';
            const unboundCharacters = window.db.characters.filter(c => !c.isSoulBound && c.soulBondStatus !== 'pending_by_user');
            if (unboundCharacters.length === 0) {
                list.innerHTML = '<li class="placeholder-text" style="padding: 20px 0;">没有可邀请的对象了</li>';
            } else {
                unboundCharacters.forEach(char => {
                    const li = document.createElement('li');
                    li.className = 'list-item';
                    li.style.cursor = 'pointer';
                    li.dataset.charId = char.id;
                    li.innerHTML = `<img src="${char.avatar}" class="chat-avatar"><span>${char.remarkName}</span>`;
                    list.appendChild(li);
                });
            }
            if (inviteModal) inviteModal.classList.add('visible');
        });
    });
    const list = document.getElementById('bond-invite-selection-list');
    if (list) {
        list.addEventListener('click', async (e) => {
            const item = e.target.closest('.list-item');
            if (!item || !item.dataset.charId) return;
            const charId = item.dataset.charId;
            const character = window.db.characters.find(c => c.id === charId);
            if (!character) return;
            if (!confirm(`确定要向 ${character.remarkName} 发送心动绑定邀请吗？`)) return;
            character.soulBondStatus = 'pending_by_user';
            const bondRequestMessage = {
                id: `msg_bond_req_card_${Date.now()}`,
                role: 'user',
                content: `[我向 ${character.remarkName} 发起了心动绑定邀请]`,
                parts: [],
                timestamp: Date.now(),
                bondRequestData: { status: 'pending' }
            };
            character.history.push(bondRequestMessage);
            const systemContent = `[system: ${character.myName} 向你发起了“心动绑定”请求。这代表Ta希望与你建立唯一的、最亲密的关系，以解锁更多专属互动。请根据你的人设，认真考虑后作出决定。你的回复必须是且仅是以下两个指令之一：[accept-bond] (同意绑定) 或 [decline-bond] (拒绝绑定)]`;
            const contextMessage = { id: `msg_bond_req_ctx_${Date.now()}`, role: 'user', content: systemContent, parts: [{ type: 'text', text: systemContent }], timestamp: Date.now() };
            character.history.push(contextMessage);
            if (typeof window.saveData === 'function') await window.saveData();
            if (inviteModal) inviteModal.classList.remove('visible');
            if (typeof window.renderChatList === 'function') window.renderChatList();
            if (typeof window.showToast === 'function') window.showToast(`已向 ${character.remarkName} 发送邀请！`);
        });
    }
    window.renderBondInvitationScreen = renderBondInvitationScreen;
}

function renderSoulBondScreen() {
    const character = window.SoulBondLogic.getBondCharacter();
    if (!character) return;
    const soulBondData = character.soulBondData || {};
    const myName = soulBondData.myName || character.myName;
    const aiName = soulBondData.aiName || character.remarkName;
    const background = soulBondData.background || '';
    const anniversaryInfo = soulBondData.anniversaryInfo || null;
    const photos = soulBondData.photos || [];
    const screenContent = document.querySelector('#soul-bond-screen .content');
    if (screenContent) {
        screenContent.style.backgroundImage = background ? `url('${background}')` : 'none';
        screenContent.style.backgroundColor = background ? '' : '#fff8fa';
    }
    const bondAvatarsContainer = document.querySelector('.bond-avatars');
    if (bondAvatarsContainer) {
        bondAvatarsContainer.innerHTML = `
            <div class="bond-avatar-container">
                <img id="bond-my-avatar" src="${character.myAvatar}">
                <span id="bond-my-name">${myName}</span>
            </div>
            <svg id="bond-miss-you-btn" class="bond-heart" viewBox="0 0 24 24" title="想你啦（双击表示超级想你）">
                <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
            </svg>
            <div class="bond-avatar-container">
                <img id="bond-ai-avatar" src="${character.avatar}">
                <span id="bond-ai-name">${aiName}</span>
            </div>
        `;
    }
    if (anniversaryInfo && anniversaryInfo.date) {
        const startDate = new Date(anniversaryInfo.date);
        const now = new Date();
        const totalDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const nextAnniversaryDate = new Date(startDate);
        let years = now.getFullYear() - startDate.getFullYear();
        if (now.getMonth() < startDate.getMonth() || (now.getMonth() === startDate.getMonth() && now.getDate() < startDate.getDate())) {
            years--;
        }
        nextAnniversaryDate.setFullYear(startDate.getFullYear() + years + 1);
        const countdownDays = Math.ceil((nextAnniversaryDate - now) / (1000 * 60 * 60 * 24));
        const countdownEl = document.getElementById('bond-countdown-days');
        const totalDaysEl = document.getElementById('bond-total-days');
        const annDescEl = document.querySelector('.bond-anniversary p');
        if (totalDaysEl) totalDaysEl.textContent = totalDays >= 0 ? totalDays : 0;
        if (countdownEl) countdownEl.textContent = countdownDays;
        if (annDescEl) annDescEl.textContent = `距离 ${anniversaryInfo.description || '下一个纪念日'} 还有`;
    } else {
        const countdownEl = document.getElementById('bond-countdown-days');
        const totalDaysEl = document.getElementById('bond-total-days');
        const annDescEl = document.querySelector('.bond-anniversary p');
        if (totalDaysEl) totalDaysEl.textContent = '...';
        if (countdownEl) countdownEl.textContent = '...';
        if (annDescEl) annDescEl.textContent = '设置一个纪念日吧';
    }
    const photoScroll = document.getElementById('bond-photo-scroll');
    if (photoScroll) {
        photoScroll.innerHTML = '';
        if (photos.length > 0) {
            photos.forEach(photo => {
                const item = document.createElement('div');
                item.className = 'bond-photo-item';
                item.innerHTML = `
                    <div class="bond-photo-inner">
                        <div class="bond-photo-front"><img src="${photo.imageUrl}" alt="${photo.description}"></div>
                        <div class="bond-photo-back"><p>${photo.description}</p></div>
                    </div>
                `;
                item.addEventListener('click', () => item.classList.toggle('is-flipped'));
                photoScroll.appendChild(item);
            });
        } else {
            photoScroll.innerHTML = '<p class="placeholder-text" style="width: 100%;">还没有回忆照片哦</p>';
        }
    }
}

function setupSoulBondApp() {
    const appIcon = document.getElementById('soul-bond-app-icon');
    if (appIcon) {
        appIcon.addEventListener('click', () => {
            const boundCharacter = window.findBoundCharacter ? window.findBoundCharacter() : null;
            if (boundCharacter) {
                const soulBondScreen = document.getElementById('soul-bond-screen');
                if (soulBondScreen) soulBondScreen.dataset.characterId = boundCharacter.id;
                renderSoulBondScreen();
                if (typeof window.switchScreen === 'function') window.switchScreen('soul-bond-screen');
            } else {
                renderBondInvitationScreen();
                if (typeof window.switchScreen === 'function') window.switchScreen('bond-invitation-screen');
            }
        });
    }
    const settingsModal = document.getElementById('bond-settings-modal');
    const settingsForm = document.getElementById('bond-settings-form');
    const addCustomPhotoModal = document.getElementById('add-custom-bond-photo-modal');
    const customPhotoForm = document.getElementById('custom-bond-photo-form');
    const openSettingsBtn = document.getElementById('bond-settings-btn');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            const character = window.findBoundCharacter ? window.findBoundCharacter() : null;
            if (!character) {
                if (typeof window.showToast === 'function') window.showToast('未找到激活的绑定角色');
                return;
            }
            const settings = character.soulBondData || {};
            const myNameInput = document.getElementById('bond-my-name-input');
            const aiNameInput = document.getElementById('bond-ai-name-input');
            const annDateInput = document.getElementById('bond-anniversary-date-input');
            const annDescInput = document.getElementById('bond-anniversary-desc-input');
            const bgInput = document.getElementById('bond-background-url-input');
            if (myNameInput) myNameInput.value = settings.myName || character.myName || '';
            if (aiNameInput) aiNameInput.value = settings.aiName || character.remarkName || '';
            if (settings.anniversaryInfo) {
                if (annDateInput) annDateInput.value = settings.anniversaryInfo.date || '';
                if (annDescInput) annDescInput.value = settings.anniversaryInfo.description || '';
            } else {
                if (annDateInput) annDateInput.value = '';
                if (annDescInput) annDescInput.value = '';
            }
            if (bgInput) bgInput.value = settings.background || '';
            if (settingsModal) settingsModal.classList.add('visible');
        });
    }
    if (settingsModal) {
        settingsModal.addEventListener('click', async (event) => {
            const saveButton = event.target.closest('[data-action="save-settings"]');
            if (!saveButton) return;
            event.preventDefault();
            const character = window.findBoundCharacter ? window.findBoundCharacter() : null;
            if (!character) {
                if (typeof window.showToast === 'function') window.showToast('未找到激活的绑定角色');
                return;
            }
            character.soulBondData = character.soulBondData || { photos: [], wishlist: [] };
            const myNameInput = document.getElementById('bond-my-name-input');
            const aiNameInput = document.getElementById('bond-ai-name-input');
            const annDateInput = document.getElementById('bond-anniversary-date-input');
            const annDescInput = document.getElementById('bond-anniversary-desc-input');
            const bgInput = document.getElementById('bond-background-url-input');
            character.soulBondData.myName = myNameInput ? myNameInput.value : '';
            character.soulBondData.aiName = aiNameInput ? aiNameInput.value : '';
            const anniversaryDate = annDateInput ? annDateInput.value : '';
            const anniversaryDesc = annDescInput ? annDescInput.value : '';
            if (anniversaryDate) {
                character.soulBondData.anniversaryInfo = {
                    date: anniversaryDate,
                    description: anniversaryDesc || '纪念日'
                };
            } else {
                character.soulBondData.anniversaryInfo = null;
            }
            character.soulBondData.background = bgInput ? bgInput.value : '';
            if (typeof window.saveData === 'function') await window.saveData();
            renderSoulBondScreen();
            settingsModal.classList.remove('visible');
            if (typeof window.showToast === 'function') window.showToast('保存成功');
        });
    }
    const switchBtn = document.getElementById('bond-switch-btn');
    if (switchBtn) {
        switchBtn.addEventListener('click', async () => {
            const currentActiveCharacter = window.db.characters.find(c => c.isSoulBound === true);
            if (!currentActiveCharacter) {
                if (typeof window.showToast === 'function') window.showToast('未找到激活的绑定角色');
                return;
            }
            const currentActiveCharId = currentActiveCharacter.id;
            let roster = window.updateBondRoster(null, 'get');
            if (!roster.includes(currentActiveCharId)) {
                roster = window.updateBondRoster(currentActiveCharId, 'add');
            }
            if (roster.length < 2) {
                renderBondInvitationScreen();
                if (typeof window.switchScreen === 'function') window.switchScreen('bond-invitation-screen');
            } else {
                const otherCharId = roster.find(id => id !== currentActiveCharId);
                const otherCharacter = window.db.characters.find(c => c.id === otherCharId);
                if (!otherCharacter) {
                    if (typeof window.showToast === 'function') window.showToast('找不到另一个角色');
                    return;
                }
                currentActiveCharacter.isSoulBound = false;
                otherCharacter.isSoulBound = true;
                otherCharacter.soulBondStatus = 'active';
                if (typeof window.saveData === 'function') await window.saveData();
                const soulBondScreen = document.getElementById('soul-bond-screen');
                if (soulBondScreen) soulBondScreen.dataset.characterId = otherCharacter.id;
                renderSoulBondScreen();
                if (typeof window.showToast === 'function') window.showToast(`已切换到 ${otherCharacter.remarkName}`);
            }
        });
    }
    const addPhotoBtn = document.getElementById('add-bond-photo-btn');
    if (addPhotoBtn && customPhotoForm && addCustomPhotoModal && settingsModal) {
        addPhotoBtn.addEventListener('click', () => {
            customPhotoForm.reset();
            const preview = document.getElementById('custom-photo-preview');
            if (preview) preview.style.backgroundImage = 'none';
            addCustomPhotoModal.classList.add('visible');
            settingsModal.classList.remove('visible');
        });
    }
    const uploadInput = document.getElementById('custom-photo-upload');
    if (uploadInput) {
        uploadInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                const compressedUrl = await window.compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 });
                const preview = document.getElementById('custom-photo-preview');
                if (preview) preview.style.backgroundImage = `url(${compressedUrl})`;
            } catch (error) {
                if (typeof window.showToast === 'function') window.showToast('图片处理失败');
            }
        });
    }
    if (customPhotoForm) {
        customPhotoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const character = window.findBoundCharacter ? window.findBoundCharacter() : null;
            if (!character) {
                if (typeof window.showToast === 'function') window.showToast('未找到激活的绑定角色');
                if (addCustomPhotoModal) addCustomPhotoModal.classList.remove('visible');
                return;
            }
            const preview = document.getElementById('custom-photo-preview');
            const descInput = document.getElementById('custom-photo-desc');
            const imageUrl = preview ? preview.style.backgroundImage.slice(5, -2) : '';
            const description = descInput ? descInput.value.trim() : '';
            if (!imageUrl || !description) {
                if (typeof window.showToast === 'function') window.showToast('请选择图片并填写描述');
                return;
            }
            if (!character.soulBondData) {
                character.soulBondData = {};
            }
            if (!Array.isArray(character.soulBondData.photos)) {
                character.soulBondData.photos = [];
            }
            character.soulBondData.photos.unshift({ imageUrl, description });
            if (typeof window.saveData === 'function') await window.saveData();
            renderSoulBondScreen();
            if (addCustomPhotoModal) addCustomPhotoModal.classList.remove('visible');
            if (typeof window.showToast === 'function') window.showToast('一张新的回忆照片已添加！');
        });
    }
    const bottomNav = document.querySelector('.bond-bottom-nav');
    if (bottomNav) {
        bottomNav.addEventListener('click', (e) => {
            const btn = e.target.closest('.bond-nav-btn');
            if (!btn || !btn.dataset.feature) return;
            const feature = btn.dataset.feature;
            switch (feature) {
                case 'pomodoro': {
                    const character = window.SoulBondLogic.getBondCharacter();
                    const pomodoroScreen = document.getElementById('pomodoro-screen');
                    if (character && pomodoroScreen) {
                        pomodoroScreen.dataset.characterId = character.id;
                        if (typeof window.switchScreen === 'function') window.switchScreen('pomodoro-screen');
                    }
                    break;
                }
                case 'diary':
                    if (window.SoulBondDiary && typeof window.SoulBondDiary.renderExchanges === 'function') {
                        window.SoulBondDiary.renderExchanges();
                    }
                    if (typeof window.switchScreen === 'function') window.switchScreen('bond-diary-exchange-screen');
                    break;
                default:
                    break;
            }
        });
    }
    setupBondInvitationSystem();
    if (window.SoulBondDiary && typeof window.SoulBondDiary.setup === 'function') window.SoulBondDiary.setup();
    if (window.SoulBondMissYou && typeof window.SoulBondMissYou.setup === 'function') window.SoulBondMissYou.setup();
    if (window.SoulBondDailyQuestion && typeof window.SoulBondDailyQuestion.setup === 'function') window.SoulBondDailyQuestion.setup();
    if (window.SoulBondWishlist && typeof window.SoulBondWishlist.setup === 'function') window.SoulBondWishlist.setup();
    if (window.SoulBondMood && typeof window.SoulBondMood.setup === 'function') window.SoulBondMood.setup();
    if (window.SoulBondPomodoro && typeof window.SoulBondPomodoro.setup === 'function') window.SoulBondPomodoro.setup();
}

window.renderSoulBondScreen = renderSoulBondScreen;
window.renderBondInvitationScreen = renderBondInvitationScreen;
window.SoulBondManager = { setup: setupSoulBondApp };
