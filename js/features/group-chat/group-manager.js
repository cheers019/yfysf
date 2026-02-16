function openSetGroupTitleModal() {
    const db = window.db;
    const currentChatId = window.currentChatId;
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;

    const memberListEl = document.getElementById('group-title-member-list');
    memberListEl.innerHTML = '';

    const myItem = document.createElement('li');
    myItem.className = 'list-item';
    myItem.style.cursor = 'pointer';
    myItem.dataset.memberId = 'user_me';
    myItem.innerHTML = `
        <img src="${group.me.avatar}" alt="${group.me.nickname}" class="chat-avatar">
        <div class="item-details">
            <div class="item-name">${group.me.nickname} <span style="font-weight:normal; color:#888;">(我)</span></div>
            <div class="item-preview">${group.me.groupTitle || '暂无头衔'}</div>
        </div>`;
    memberListEl.appendChild(myItem);

    group.members.forEach(member => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.cursor = 'pointer';
        li.dataset.memberId = member.id;
        li.innerHTML = `
            <img src="${member.avatar}" alt="${member.groupNickname}" class="chat-avatar">
            <div class="item-details">
                <div class="item-name">${member.groupNickname}</div>
                <div class="item-preview">${member.groupTitle || '暂无头衔'}</div>
            </div>`;
        memberListEl.appendChild(li);
    });

    memberListEl.onclick = handleGroupTitleMemberSelect;

    document.getElementById('set-group-title-modal').classList.add('visible');
}

async function handleGroupTitleMemberSelect(e) {
    const memberItem = e.target.closest('.list-item');
    if (!memberItem) return;

    const db = window.db;
    const currentChatId = window.currentChatId;
    const memberId = memberItem.dataset.memberId;
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;

    const isMe = memberId === 'user_me';
    const member = isMe ? group.me : group.members.find(m => m.id === memberId);
    
    if (!member) return;

    const currentTitle = member.groupTitle || '';
    const newTitle = prompt(`为 "${isMe ? member.nickname : member.groupNickname}" 设置群头衔（最多7个字，留空则取消头衔）：`, currentTitle);

    if (newTitle === null) return;

    if (newTitle.length > 7) {
        window.showToast('群头衔不能超过7个字！');
        return;
    }
    
    member.groupTitle = newTitle.trim();
    
    document.getElementById('set-group-title-modal').classList.remove('visible');
    window.showToast('群头衔设置成功！');
    
    if (!isMe) {
        await sendGroupTitleNotification(member, member.groupTitle);
    } else {
        await window.saveData();
    }
    
    window.chatUiCore.renderMessages(false, true);
    const groupSettingsSidebar = document.getElementById('group-settings-sidebar');
    if(groupSettingsSidebar.classList.contains('open')) {
        renderGroupMembersInSettings(group);
    }
}

async function sendGroupTitleNotification(member, newTitle) {
    const db = window.db;
    const currentChatId = window.currentChatId;
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;

    const actionText = newTitle ? `的群头衔为 "${newTitle}"` : `取消了 ${member.realName} 的群头衔`;
    const messageContent = `[system: ${group.me.nickname} 设置了 ${member.realName} ${actionText}]`;
    
    const message = {
        id: `msg_title_${Date.now()}`,
        role: 'user',
        content: messageContent,
        parts: [{ type: 'text', text: messageContent }],
        timestamp: Date.now(),
        senderId: 'user_me'
    };

    group.history.push(message);
    window.addMessageBubble(message);
    await window.saveData();
}

function getBadgeClassForTitle(title) {
    if (!title) return '';
    const length = title.length;
    if (title.includes('主')) return 'lv26';
    if (length <= 2) return 'lv10';
    if (length <= 4) return 'lv11';
    return 'lv12';
}

function setupGroupChatSystem() {
    const createGroupBtn = document.getElementById('create-group-btn');
    const createGroupModal = document.getElementById('create-group-modal');
    const createGroupForm = document.getElementById('create-group-form');
    const memberSelectionList = document.getElementById('member-selection-list');
    const groupNameInput = document.getElementById('group-name-input');
    const groupSettingsSidebar = document.getElementById('group-settings-sidebar');
    const groupSettingsForm = document.getElementById('group-settings-form');
    const groupMembersListContainer = document.getElementById('group-members-list-container');
    const editGroupMemberModal = document.getElementById('edit-group-member-modal');
    const editGroupMemberForm = document.getElementById('edit-group-member-form');
    const addMemberActionSheet = document.getElementById('add-member-actionsheet');
    const inviteExistingMemberBtn = document.getElementById('invite-existing-member-btn');
    const createNewMemberBtn = document.getElementById('create-new-member-btn');
    const inviteMemberModal = document.getElementById('invite-member-modal');
    const inviteMemberSelectionList = document.getElementById('invite-member-selection-list');
    const confirmInviteBtn = document.getElementById('confirm-invite-btn');
    const createMemberForGroupModal = document.getElementById('create-member-for-group-modal');
    const createMemberForGroupForm = document.getElementById('create-member-for-group-form');

    createGroupBtn.addEventListener('click', () => {
        renderMemberSelectionList();
        createGroupModal.classList.add('visible');
    });
    createGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const db = window.db;
        const selectedMemberIds = Array.from(memberSelectionList.querySelectorAll('input:checked')).map(input => input.value);
        const groupName = groupNameInput.value.trim();
        if (selectedMemberIds.length < 1) return window.showToast('请至少选择一个群成员。');
        if (!groupName) return window.showToast('请输入群聊名称。');
        const firstChar = db.characters.length > 0 ? db.characters[0] : null;
        const newGroup = {
            id: `group_${Date.now()}`,
            name: groupName,
            avatar: 'https://i.postimg.cc/fTLCngk1/image.jpg',
            me: {
                nickname: firstChar ? firstChar.myName : '我',
                persona: firstChar ? firstChar.myPersona : '',
                avatar: firstChar ? firstChar.myAvatar : 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg'
            },
            members: selectedMemberIds.map(charId => {
                const char = db.characters.find(c => c.id === charId);
                return {
                    id: `member_${char.id}`,
                    originalCharId: char.id,
                    realName: char.realName,
                    groupNickname: char.remarkName,
                    persona: char.persona,
                    avatar: char.avatar
                };
            }),
            theme: 'white_pink',
            maxMemory: 10,
            chatBg: '',
            history: [],
            isPinned: false,
            useCustomBubbleCss: false,
            customBubbleCss: '',
            aiProactiveChatEnabled: false,
            aiProactiveChatDelay: 0,
            aiProactiveChatInterval: 0,
            pendingMessages: [],
            worldBookIds: []
        };
        db.groups.push(newGroup);
        await window.saveData();
        window.renderChatList();
        createGroupModal.classList.remove('visible');
        window.showToast(`群聊“${groupName}”创建成功！`);
    });
    groupSettingsForm.addEventListener('submit', e => {
        e.preventDefault();
        saveGroupSettingsFromSidebar();
        groupSettingsSidebar.classList.remove('open');
    });
    const useGroupCustomCssCheckbox = document.getElementById('setting-group-use-custom-css'),
        groupCustomCssTextarea = document.getElementById('setting-group-custom-bubble-css'),
        resetGroupCustomCssBtn = document.getElementById('reset-group-custom-bubble-css-btn'),
        groupPreviewBox = document.getElementById('group-bubble-css-preview');
    document.getElementById('setting-group-avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await window.compressImage(file, {quality: 0.8, maxWidth: 400, maxHeight: 400});
                const group = window.db.groups.find(g => g.id === window.currentChatId);
                if (group) {
                    group.avatar = compressedUrl;
                    document.getElementById('setting-group-avatar-preview').src = compressedUrl;
                }
            } catch (error) {
                window.showToast('群头像压缩失败，请重试');
            }
        }
    });
    document.getElementById('clear-group-chat-history-btn').addEventListener('click', async () => {
        const group = window.db.groups.find(g => g.id === window.currentChatId);
        if (!group) return;
        if (confirm(`你确定要清空群聊"${group.name}"的所有聊天记录吗？此操作无法撤销。`)) {
            await window.clearHistoryDirectly();
        }
    });
    groupMembersListContainer.addEventListener('click', e => {
        const memberDiv = e.target.closest('.group-member');
        const addBtn = e.target.closest('.add-member-btn');
        if (memberDiv) {
            openGroupMemberEditModal(memberDiv.dataset.id);
        } else if (addBtn) {
            addMemberActionSheet.classList.add('visible');
        }
    });
    document.getElementById('edit-member-avatar-preview').addEventListener('click', () => {
        document.getElementById('edit-member-avatar-upload').click();
    });
    document.getElementById('edit-member-avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await window.compressImage(file, {quality: 0.8, maxWidth: 400, maxHeight: 400});
                document.getElementById('edit-member-avatar-preview').src = compressedUrl;
            } catch (error) {
                window.showToast('成员头像压缩失败，请重试');
            }
        }
    });
    editGroupMemberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const memberId = document.getElementById('editing-member-id').value;
        const group = window.db.groups.find(g => g.id === window.currentChatId);
        const member = group.members.find(m => m.id === memberId);
        if (member) {
            member.avatar = document.getElementById('edit-member-avatar-preview').src;
            member.groupNickname = document.getElementById('edit-member-group-nickname').value;
            member.realName = document.getElementById('edit-member-real-name').value;
            member.persona = document.getElementById('edit-member-persona').value;
            await window.saveData();
            renderGroupMembersInSettings(group);
            document.querySelectorAll(`.message-wrapper[data-sender-id="${member.id}"] .group-nickname`).forEach(el => {
                el.textContent = member.groupNickname;
            });
            window.showToast('成员信息已更新');
        }
        editGroupMemberModal.classList.remove('visible');
    });
    inviteExistingMemberBtn.addEventListener('click', () => {
        renderInviteSelectionList();
        inviteMemberModal.classList.add('visible');
        addMemberActionSheet.classList.remove('visible');
    });
    createNewMemberBtn.addEventListener('click', () => {
        createMemberForGroupForm.reset();
        document.getElementById('create-group-member-avatar-preview').src = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
        createMemberForGroupModal.classList.add('visible');
        addMemberActionSheet.classList.remove('visible');
    });
    document.getElementById('create-group-member-avatar-preview').addEventListener('click', () => {
        document.getElementById('create-group-member-avatar-upload').click();
    });
    document.getElementById('create-group-member-avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await window.compressImage(file, {quality: 0.8, maxWidth: 400, maxHeight: 400});
                document.getElementById('create-group-member-avatar-preview').src = compressedUrl;
            } catch (error) {
                window.showToast('新成员头像压缩失败，请重试');
            }
        }
    });
    confirmInviteBtn.addEventListener('click', async () => {
        const group = window.db.groups.find(g => g.id === window.currentChatId);
        if (!group) return;
        const selectedCharIds = Array.from(inviteMemberSelectionList.querySelectorAll('input:checked')).map(input => input.value);
        selectedCharIds.forEach(charId => {
            const char = window.db.characters.find(c => c.id === charId);
            if (char) {
                const newMember = {
                    id: `member_${char.id}`,
                    originalCharId: char.id,
                    realName: char.realName,
                    groupNickname: char.remarkName,
                    persona: char.persona,
                    avatar: char.avatar
                };
                group.members.push(newMember);
                sendInviteNotification(group, newMember.realName);
            }
        });
        if (selectedCharIds.length > 0) {
            await window.saveData();
            renderGroupMembersInSettings(group);
            window.chatUiCore.renderMessages(false, true);
            window.showToast('已邀请新成员');
        }
        inviteMemberModal.classList.remove('visible');
    });
    createMemberForGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const group = window.db.groups.find(g => g.id === window.currentChatId);
        if (!group) return;
        const newMember = {
            id: `member_group_only_${Date.now()}`,
            originalCharId: null,
            realName: document.getElementById('create-group-member-realname').value,
            groupNickname: document.getElementById('create-group-member-nickname').value,
            persona: document.getElementById('create-group-member-persona').value,
            avatar: document.getElementById('create-group-member-avatar-preview').src,
        };
        group.members.push(newMember);
        sendInviteNotification(group, newMember.realName);
        await window.saveData();
        renderGroupMembersInSettings(group);
        window.chatUiCore.renderMessages(false, true);
        window.showToast(`新成员 ${newMember.groupNickname} 已加入`);
        createMemberForGroupModal.classList.remove('visible');
    });
    document.getElementById('setting-group-my-avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await window.compressImage(file, {quality: 0.8, maxWidth: 400, maxHeight: 400});
                document.getElementById('setting-group-my-avatar-preview').src = compressedUrl;
            } catch (error) {
                window.showToast('头像压缩失败')
            }
        }
    });
    document.getElementById('set-group-title-btn').addEventListener('click', openSetGroupTitleModal);
    document.getElementById('close-group-title-modal-btn').addEventListener('click', () => {
        document.getElementById('set-group-title-modal').classList.remove('visible');
    });
}

function renderMemberSelectionList() {
    const db = window.db;
    const memberSelectionList = document.getElementById('member-selection-list');
    memberSelectionList.innerHTML = '';
    if (db.characters.length === 0) {
        memberSelectionList.innerHTML = '<li style="color:#aaa; text-align:center; padding: 10px 0;">没有可选择的人设。</li>';
        return;
    }
    db.characters.forEach(char => {
        const li = document.createElement('li');
        li.className = 'member-selection-item';
        li.innerHTML = `<input type="checkbox" id="select-${char.id}" value="${char.id}"><img src="${char.avatar}" alt="${char.remarkName}"><label for="select-${char.id}">${char.remarkName}</label>`;
        memberSelectionList.appendChild(li);
    });
}

function loadGroupSettingsToSidebar() {
    const db = window.db;
    const currentChatId = window.currentChatId;
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;
    const themeSelect = document.getElementById('setting-group-theme-color');
    const colorThemes = window.colorThemes || {};
    if (themeSelect.options.length === 0) {
        Object.keys(colorThemes).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = colorThemes[key].name;
            themeSelect.appendChild(option);
        });
    }
    document.getElementById('setting-group-avatar-preview').src = group.avatar;
    document.getElementById('setting-group-name').value = group.name;
    document.getElementById('setting-group-my-avatar-preview').src = group.me.avatar;
    document.getElementById('setting-group-my-nickname').value = group.me.nickname;
    document.getElementById('setting-group-my-persona').value = group.me.persona;
    themeSelect.value = group.theme || 'white_pink';
    document.getElementById('setting-group-max-memory').value = group.maxMemory;
    renderGroupMembersInSettings(group);
    const useGroupCustomCssCheckbox = document.getElementById('setting-group-use-custom-css'),
        groupCustomCssTextarea = document.getElementById('setting-group-custom-bubble-css'),
        groupPreviewBox = document.getElementById('group-bubble-css-preview');
    useGroupCustomCssCheckbox.checked = group.useCustomBubbleCss || false;
    groupCustomCssTextarea.value = group.customBubbleCss || '';
    groupCustomCssTextarea.disabled = !useGroupCustomCssCheckbox.checked;
    const theme = colorThemes[group.theme || 'white_pink'];
    window.updateBubbleCssPreview(groupPreviewBox, group.customBubbleCss, !group.useCustomBubbleCss, theme);
    const bubbleScaleRange = document.getElementById('bubble-scale-range');
    const bubbleScaleValue = document.getElementById('bubble-scale-value');
    const chatRoomScreen = document.getElementById('chat-room-screen');
    
    const currentScale = group.bubbleScale || 1;
    bubbleScaleRange.value = currentScale;
    bubbleScaleValue.textContent = `${Math.round(currentScale * 100)}%`;
    chatRoomScreen.style.setProperty('--bubble-scale', currentScale);

    const proactiveToggle = document.getElementById('group-ai-proactive-chat-toggle');
    const proactiveOptions = document.getElementById('group-ai-proactive-options');
    const proactiveDelayInput = document.getElementById('group-ai-proactive-chat-delay');
    const proactiveIntervalInput = document.getElementById('group-ai-proactive-chat-interval');

    proactiveToggle.checked = group.aiProactiveChatEnabled || false;
    proactiveDelayInput.value = group.aiProactiveChatDelay || '';
    proactiveIntervalInput.value = group.aiProactiveChatInterval || '';
    proactiveOptions.style.display = proactiveToggle.checked ? 'block' : 'none';

    proactiveToggle.onchange = (evt) => {
        proactiveOptions.style.display = evt.target.checked ? 'block' : 'none';
    };
}

function renderGroupMembersInSettings(group) {
    const groupMembersListContainer = document.getElementById('group-members-list-container');
    groupMembersListContainer.innerHTML = '';
    group.members.forEach(member => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'group-member';
        memberDiv.dataset.id = member.id;
        memberDiv.innerHTML = `<img src="${member.avatar}" alt="${member.groupNickname}"><span>${member.groupNickname}</span>`;
        groupMembersListContainer.appendChild(memberDiv);
    });
    const addBtn = document.createElement('div');
    addBtn.className = 'add-member-btn';
    addBtn.innerHTML = `<div class="add-icon">+</div><span>添加</span>`;
    groupMembersListContainer.appendChild(addBtn);
}

async function saveGroupSettingsFromSidebar() {
    const db = window.db;
    const currentChatId = window.currentChatId;
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;
    const oldName = group.name;
    const newName = document.getElementById('setting-group-name').value;
    if (oldName !== newName) {
        group.name = newName;
        sendRenameNotification(group, newName);
    }
    group.avatar = document.getElementById('setting-group-avatar-preview').src;
    group.me.avatar = document.getElementById('setting-group-my-avatar-preview').src;
    group.me.nickname = document.getElementById('setting-group-my-nickname').value;
    group.me.persona = document.getElementById('setting-group-my-persona').value;
    group.theme = document.getElementById('setting-group-theme-color').value;
    group.maxMemory = document.getElementById('setting-group-max-memory').value;
    group.useCustomBubbleCss = document.getElementById('setting-group-use-custom-css').checked;
    group.customBubbleCss = document.getElementById('setting-group-custom-bubble-css').value;
    window.updateCustomBubbleStyle(currentChatId, group.customBubbleCss, group.useCustomBubbleCss);
    
    group.bubbleScale = document.getElementById('bubble-scale-range').value;

    group.aiProactiveChatEnabled = document.getElementById('group-ai-proactive-chat-toggle').checked;
    group.aiProactiveChatDelay = parseInt(document.getElementById('group-ai-proactive-chat-delay').value, 10) || 0;
    group.aiProactiveChatInterval = parseInt(document.getElementById('group-ai-proactive-chat-interval').value, 10) || 0;

    await window.saveData();
    window.showToast('群聊设置已保存！');
    const chatRoomTitle = document.getElementById('chat-room-title');
    chatRoomTitle.textContent = group.name;
    window.renderChatList();
    window.chatUiCore.renderMessages(false, true);
}

function openGroupMemberEditModal(memberId) {
    const db = window.db;
    const currentChatId = window.currentChatId;
    const group = db.groups.find(g => g.id === currentChatId);
    const member = group.members.find(m => m.id === memberId);
    if (!member) return;
    document.getElementById('edit-group-member-title').textContent = `编辑 ${member.groupNickname}`;
    document.getElementById('editing-member-id').value = member.id;
    document.getElementById('edit-member-avatar-preview').src = member.avatar;
    document.getElementById('edit-member-group-nickname').value = member.groupNickname;
    document.getElementById('edit-member-real-name').value = member.realName;
    document.getElementById('edit-member-persona').value = member.persona;
    const editGroupMemberModal = document.getElementById('edit-group-member-modal');
    editGroupMemberModal.classList.add('visible');
}

function renderInviteSelectionList() {
    const db = window.db;
    const currentChatId = window.currentChatId;
    const inviteMemberSelectionList = document.getElementById('invite-member-selection-list');
    const confirmInviteBtn = document.getElementById('confirm-invite-btn');
    inviteMemberSelectionList.innerHTML = '';
    const group = db.groups.find(g => g.id === currentChatId);
    if (!group) return;
    const currentMemberCharIds = new Set(group.members.map(m => m.originalCharId));
    const availableChars = db.characters.filter(c => !currentMemberCharIds.has(c.id));
    if (availableChars.length === 0) {
        inviteMemberSelectionList.innerHTML = '<li style="color:#aaa; text-align:center; padding: 10px 0;">没有可邀请的新成员了。</li>';
        confirmInviteBtn.disabled = true;
        return;
    }
    confirmInviteBtn.disabled = false;
    availableChars.forEach(char => {
        const li = document.createElement('li');
        li.className = 'invite-member-select-item';
        li.innerHTML = `<input type="checkbox" id="invite-select-${char.id}" value="${char.id}"><label for="invite-select-${char.id}"><img src="${char.avatar}" alt="${char.remarkName}"><span>${char.remarkName}</span></label>`;
        inviteMemberSelectionList.appendChild(li);
    });
}

function sendInviteNotification(group, newMemberRealName) {
    const messageContent = `[${group.me.nickname}邀请${newMemberRealName}加入了群聊]`;
    const message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: messageContent,
        parts: [{type: 'text', text: messageContent}],
        timestamp: Date.now(),
        senderId: 'user_me'
    };
    group.history.push(message);
}

function sendRenameNotification(group, newName) {
    const myName = group.me.nickname;
    const messageContent = `[${myName}修改群名为：${newName}]`;
    const message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: messageContent,
        parts: [{type: 'text', text: messageContent}],
        timestamp: Date.now()
    };
    group.history.push(message);
}
