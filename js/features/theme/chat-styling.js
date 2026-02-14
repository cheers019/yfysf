const colorThemes = {
  white_pink: { name: '白/粉', received: { bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D' }, sent: { bg: 'rgba(255,204,204,0.9)', text: '#A56767' } },
  white_blue: { name: '白/蓝', received: { bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D' }, sent: { bg: 'rgba(173,216,230,0.9)', text: '#4A6F8A' } },
  white_yellow: { name: '白/黄', received: { bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D' }, sent: { bg: 'rgba(249,237,105,0.9)', text: '#8B7E4B' } },
  white_green: { name: '白/绿', received: { bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D' }, sent: { bg: 'rgba(188,238,188,0.9)', text: '#4F784F' } },
  white_purple: { name: '白/紫', received: { bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D' }, sent: { bg: 'rgba(185,190,240,0.9)', text: '#6C5B7B' } },
  black_red: { name: '黑/红', received: { bg: 'rgba(30,30,30,0.85)', text: '#E0E0E0' }, sent: { bg: 'rgb(226,62,87,0.9)', text: '#fff' } },
  black_green: { name: '黑/绿', received: { bg: 'rgba(30,30,30,0.85)', text: '#E0E0E0' }, sent: { bg: 'rgba(119,221,119,0.9)', text: '#2E5C2E' } },
  black_white: { name: '黑/白', received: { bg: 'rgba(30,30,30,0.85)', text: '#E0E0E0' }, sent: { bg: 'rgba(245,245,245,0.9)', text: '#333' } },
  white_black: { name: '白/黑', received: { bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D' }, sent: { bg: 'rgba(50,50,50,0.85)', text: '#F5F5F5' } },
  yellow_purple: { name: '黄/紫', received: { bg: 'rgba(255,250,205,0.9)', text: '#8B7E4B' }, sent: { bg: 'rgba(185,190,240,0.9)', text: '#6C5B7B' } },
  pink_blue: { name: '粉/蓝', received: { bg: 'rgba(255,231,240,0.9)', text: '#7C6770' }, sent: { bg: 'rgba(173,216,230,0.9)', text: '#4A6F8A' } }
};

function updateCustomBubbleStyle(chatId, css, enabled) {
  const styleId = `custom-bubble-style-for-${chatId}`;
  let styleElement = document.getElementById(styleId);
  if (enabled && css) {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    const scopedCss = css.replace(/(\.message-bubble(?:\.sent|\.received)?)/g, `#chat-room-screen.chat-active-${chatId} $1`);
    styleElement.innerHTML = scopedCss;
  } else {
    if (styleElement) styleElement.remove();
  }
}

function updateBubbleCssPreview(previewContainer, css, useDefault, theme) {
  if (!previewContainer) return;
  const resolvedTheme = theme || colorThemes.white_pink;
  previewContainer.innerHTML = '';
  const sentBubble = document.createElement('div');
  sentBubble.className = 'message-bubble sent';
  sentBubble.textContent = '这是我方气泡。';
  sentBubble.style.alignSelf = 'flex-end';
  sentBubble.style.borderBottomRightRadius = '5px';
  const receivedBubble = document.createElement('div');
  receivedBubble.className = 'message-bubble received';
  receivedBubble.textContent = '这是对方气泡。';
  receivedBubble.style.alignSelf = 'flex-start';
  receivedBubble.style.borderBottomLeftRadius = '5px';
  [sentBubble, receivedBubble].forEach(bubble => {
    bubble.style.maxWidth = '70%';
    bubble.style.padding = '8px 12px';
    bubble.style.wordWrap = 'break-word';
    bubble.style.lineHeight = '1.4';
  });
  if (useDefault || !css) {
    sentBubble.style.backgroundColor = resolvedTheme.sent.bg;
    sentBubble.style.color = resolvedTheme.sent.text;
    sentBubble.style.borderRadius = '18px';
    sentBubble.style.borderBottomRightRadius = '5px';
    receivedBubble.style.backgroundColor = resolvedTheme.received.bg;
    receivedBubble.style.color = resolvedTheme.received.text;
    receivedBubble.style.borderRadius = '18px';
    receivedBubble.style.borderBottomLeftRadius = '5px';
  } else {
    const styleTag = document.createElement('style');
    const scopedCss = css.replace(/(\.message-bubble(?:\.sent|\.received)?)/g, `#${previewContainer.id} $1`);
    styleTag.textContent = scopedCss;
    previewContainer.appendChild(styleTag);
  }
  previewContainer.appendChild(receivedBubble);
  previewContainer.appendChild(sentBubble);
}

function applyChatTheme(chatId, type) {
  const chatRoomScreen = document.getElementById('chat-room-screen');
  if (!chatRoomScreen) return;
  const t = type || window.currentChatType;
  const chat = t === 'private' ? window.db.characters.find(c => c.id === chatId) : window.db.groups.find(g => g.id === chatId);
  if (!chat) return;
  chatRoomScreen.style.backgroundImage = chat.chatBg ? `url(${chat.chatBg})` : 'none';
  chatRoomScreen.style.setProperty('--bubble-scale', t === 'group' ? (chat.bubbleScale || 1) : 1);
  chatRoomScreen.className = chatRoomScreen.className.replace(/\bchat-active-[^ ]+\b/g, '');
  chatRoomScreen.classList.add(`chat-active-${chatId}`);
  updateCustomBubbleStyle(chatId, chat.customBubbleCss, chat.useCustomBubbleCss);
}

function populateThemeOptions() {
  const privateSelect = document.getElementById('setting-theme-color');
  if (privateSelect) {
    privateSelect.innerHTML = '';
    Object.keys(colorThemes).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = colorThemes[key].name;
      privateSelect.appendChild(option);
    });
  }
  const groupSelect = document.getElementById('setting-group-theme-color');
  if (groupSelect && groupSelect.options.length === 0) {
    Object.keys(colorThemes).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = colorThemes[key].name;
      groupSelect.appendChild(option);
    });
  }
}

function bindPrivateCustomCssPreview() {
  const useCustomCssCheckbox = document.getElementById('setting-use-custom-css');
  const customCssTextarea = document.getElementById('setting-custom-bubble-css');
  const privatePreviewBox = document.getElementById('private-bubble-css-preview');
  if (!useCustomCssCheckbox || !customCssTextarea || !privatePreviewBox) return;
  useCustomCssCheckbox.addEventListener('change', (e) => {
    customCssTextarea.disabled = !e.target.checked;
    const char = window.db.characters.find(c => c.id === window.currentChatId);
    if (char) {
      const themeKey = char.theme || 'white_pink';
      const theme = colorThemes[themeKey];
      updateBubbleCssPreview(privatePreviewBox, customCssTextarea.value, !e.target.checked, theme);
    }
  });
  customCssTextarea.addEventListener('input', (e) => {
    const char = window.db.characters.find(c => c.id === window.currentChatId);
    if (char && useCustomCssCheckbox.checked) {
      const themeKey = char.theme || 'white_pink';
      const theme = colorThemes[themeKey];
      updateBubbleCssPreview(privatePreviewBox, e.target.value, false, theme);
    }
  });
  const resetBtn = document.getElementById('reset-custom-bubble-css-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const char = window.db.characters.find(c => c.id === window.currentChatId);
      if (char) {
        customCssTextarea.value = '';
        useCustomCssCheckbox.checked = false;
        customCssTextarea.disabled = true;
        const themeKey = char.theme || 'white_pink';
        const theme = colorThemes[themeKey];
        updateBubbleCssPreview(privatePreviewBox, '', true, theme);
        if (window.showToast) window.showToast('样式已重置为默认');
      }
    });
  }
}

function bindGroupCustomCssPreview() {
  const useGroupCustomCssCheckbox = document.getElementById('setting-group-use-custom-css');
  const groupCustomCssTextarea = document.getElementById('setting-group-custom-bubble-css');
  const groupPreviewBox = document.getElementById('group-bubble-css-preview');
  if (!useGroupCustomCssCheckbox || !groupCustomCssTextarea || !groupPreviewBox) return;
  useGroupCustomCssCheckbox.addEventListener('change', (e) => {
    groupCustomCssTextarea.disabled = !e.target.checked;
    const group = window.db.groups.find(g => g.id === window.currentChatId);
    if (group) {
      const theme = colorThemes[group.theme || 'white_pink'];
      updateBubbleCssPreview(groupPreviewBox, groupCustomCssTextarea.value, !e.target.checked, theme);
    }
  });
  groupCustomCssTextarea.addEventListener('input', (e) => {
    const group = window.db.groups.find(g => g.id === window.currentChatId);
    if (group && useGroupCustomCssCheckbox.checked) {
      const theme = colorThemes[group.theme || 'white_pink'];
      updateBubbleCssPreview(groupPreviewBox, e.target.value, false, theme);
    }
  });
  const resetBtn = document.getElementById('reset-group-custom-bubble-css-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const group = window.db.groups.find(g => g.id === window.currentChatId);
      if (group) {
        groupCustomCssTextarea.value = '';
        useGroupCustomCssCheckbox.checked = false;
        groupCustomCssTextarea.disabled = true;
        const theme = colorThemes[group.theme || 'white_pink'];
        updateBubbleCssPreview(groupPreviewBox, '', true, theme);
        if (window.showToast) window.showToast('样式已重置为默认');
      }
    });
  }
}

function bindBackgroundUpload() {
  const chatRoomScreen = document.getElementById('chat-room-screen');
  const privateUpload = document.getElementById('setting-chat-bg-upload');
  if (privateUpload) {
    privateUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const char = window.db.characters.find(c => c.id === window.currentChatId);
        if (char) {
          try {
            const compressedUrl = await window.compressImage(file, { quality: 0.85, maxWidth: 1080, maxHeight: 1920 });
            char.chatBg = compressedUrl;
            if (chatRoomScreen) chatRoomScreen.style.backgroundImage = `url(${compressedUrl})`;
            if (window.saveData) await window.saveData();
            if (window.showToast) window.showToast('聊天背景已更换');
          } catch (error) {
            if (window.showToast) window.showToast('背景压缩失败，请重试');
          }
        }
      }
    });
  }
  const groupUpload = document.getElementById('setting-group-chat-bg-upload');
  if (groupUpload) {
    groupUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const compressedUrl = await window.compressImage(file, { quality: 0.85, maxWidth: 1080, maxHeight: 1920 });
          const group = window.db.groups.find(g => g.id === window.currentChatId);
          if (group) {
            group.chatBg = compressedUrl;
            if (chatRoomScreen) chatRoomScreen.style.backgroundImage = `url(${compressedUrl})`;
            if (window.saveData) await window.saveData();
            if (window.showToast) window.showToast('聊天背景已更换');
          }
        } catch (error) {
          if (window.showToast) window.showToast('群聊背景压缩失败，请重试');
        }
      }
    });
  }
}

function bindBubbleScale() {
  const bubbleScaleRange = document.getElementById('bubble-scale-range');
  const bubbleScaleValue = document.getElementById('bubble-scale-value');
  const chatRoomScreen = document.getElementById('chat-room-screen');
  if (!bubbleScaleRange || !bubbleScaleValue || !chatRoomScreen) return;
  bubbleScaleRange.addEventListener('input', () => {
    const scaleValue = bubbleScaleRange.value;
    bubbleScaleValue.textContent = `${Math.round(scaleValue * 100)}%`;
    chatRoomScreen.style.setProperty('--bubble-scale', scaleValue);
  });
}

function renderAvatarInSettings(containerId, avatarUrl, frameUrl) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<img src="${avatarUrl}" class="avatar-preview">${frameUrl ? `<img src="${frameUrl}" class="avatar-frame">` : ''}`;
  }
}
let currentFrameTarget = null;
let currentEditingMemberId = null;
function openAvatarFramePanel(target) {
  currentFrameTarget = target;
  renderAvatarFrameGrid();
  document.getElementById('avatar-frame-modal').classList.add('visible');
}
function renderAvatarFrameGrid() {
  const grid = document.getElementById('avatar-frame-grid');
  grid.innerHTML = '';
  if (!window.db.avatarFrames || window.db.avatarFrames.length === 0) {
    grid.innerHTML = '<p class="placeholder-text">还没有头像框，点击右上角“+”添加一个吧！</p>';
    return;
  }
  window.db.avatarFrames.forEach(frame => {
    const item = document.createElement('div');
    item.className = 'frame-item';
    item.dataset.frameUrl = frame.url;
    item.innerHTML = `<img src="${frame.url}" alt="头像框"><button class="delete-frame-btn" data-frame-id="${frame.id}">&times;</button>`;
    grid.appendChild(item);
  });
}
async function applyAvatarFrame() {
  const selectedItem = document.querySelector('#avatar-frame-grid .frame-item.selected');
  const frameUrl = selectedItem ? selectedItem.dataset.frameUrl : null;
  let avatarContainerId = '';
  let avatarUrl = '';
  if (window.currentChatType === 'private') {
    const character = window.db.characters.find(c => c.id === window.currentChatId);
    if (currentFrameTarget === 'private-ai') {
      character.avatarFrameUrl = frameUrl;
      avatarContainerId = 'char-avatar-container-setting';
      avatarUrl = character.avatar;
    } else if (currentFrameTarget === 'private-user') {
      character.myAvatarFrameUrl = frameUrl;
      avatarContainerId = 'my-avatar-container-setting';
      avatarUrl = character.myAvatar;
    }
  } else if (window.currentChatType === 'group') {
    const group = window.db.groups.find(g => g.id === window.currentChatId);
    if (currentFrameTarget === 'group-user') {
      group.me.avatarFrameUrl = frameUrl;
      avatarContainerId = 'group-my-avatar-container-setting';
      avatarUrl = group.me.avatar;
    } else if (currentFrameTarget === 'group-member' && currentEditingMemberId) {
      const member = group.members.find(m => m.id === currentEditingMemberId);
      if (member) {
        member.avatarFrameUrl = frameUrl;
        avatarContainerId = 'group-member-avatar-container-setting';
        avatarUrl = member.avatar;
      }
    }
  }
  if (avatarContainerId) {
    renderAvatarInSettings(avatarContainerId, avatarUrl, frameUrl);
  }
  if (window.saveData) await window.saveData();
  if (typeof window.renderMessages === 'function') window.renderMessages(false, true);
  document.getElementById('avatar-frame-modal').classList.remove('visible');
  if (window.showToast) window.showToast('头像框已应用！');
}
function setupAvatarFrameSystem() {
  const modal = document.getElementById('avatar-frame-modal');
  document.body.addEventListener('click', e => {
    const btn = e.target.closest('.avatar-frame-btn');
    if (btn) {
      if (btn.dataset.target === 'group-member') {
        currentEditingMemberId = document.getElementById('editing-member-id').value;
      }
      openAvatarFramePanel(btn.dataset.target);
    }
  });
  const addBtn = document.getElementById('add-avatar-frame-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const url = prompt('请输入头像框图片的URL：');
      if (url && url.trim()) {
        if (!window.db.avatarFrames) window.db.avatarFrames = [];
        window.db.avatarFrames.push({ id: `frame_${Date.now()}`, url: url.trim() });
        if (window.saveData) await window.saveData();
        renderAvatarFrameGrid();
      }
    });
  }
  const grid = document.getElementById('avatar-frame-grid');
  if (grid) {
    grid.addEventListener('click', e => {
      const target = e.target;
      if (target.closest('.delete-frame-btn')) {
        e.stopPropagation();
        const frameId = target.dataset.frameId;
        if (confirm('确定要删除这个头像框吗？')) {
          window.db.avatarFrames = window.db.avatarFrames.filter(f => f.id !== frameId);
          if (window.saveData) window.saveData();
          renderAvatarFrameGrid();
        }
      } else if (target.closest('.frame-item')) {
        document.querySelectorAll('#avatar-frame-grid .frame-item').forEach(el => el.classList.remove('selected'));
        target.closest('.frame-item').classList.add('selected');
      }
    });
  }
  const applyBtn = document.getElementById('apply-avatar-frame-btn');
  const cancelBtn = document.getElementById('cancel-avatar-frame-btn');
  const removeBtn = document.getElementById('remove-avatar-frame-btn');
  if (applyBtn) applyBtn.addEventListener('click', applyAvatarFrame);
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('visible'));
  if (removeBtn) removeBtn.addEventListener('click', () => {
    document.querySelectorAll('#avatar-frame-grid .frame-item').forEach(el => el.classList.remove('selected'));
    applyAvatarFrame();
  });
}

const PRES_KEY = 'bubblePresets';
function _getBubblePresets() {
  try { return JSON.parse(localStorage.getItem(PRES_KEY) || '[]'); } catch (e) { return []; }
}
function _saveBubblePresets(arr) {
  localStorage.setItem(PRES_KEY, JSON.stringify(arr || []));
}
function populateBubblePresetSelect() {
  const sel = document.getElementById('bubble-preset-select');
  if (!sel) return;
  const presets = _getBubblePresets();
  sel.innerHTML = '<option value="">— 选择预设 —</option>';
  presets.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}
async function applyPresetToCurrentChat(presetName) {
  const presets = _getBubblePresets();
  const preset = presets.find(p => p.name === presetName);
  if (!preset) { if (window.showToast) window.showToast('未找到该预设'); return; }
  const textarea = document.getElementById('setting-custom-bubble-css');
  if (textarea) textarea.value = preset.css;
  try {
    if (typeof window.currentChatId !== 'undefined' && typeof window.currentChatType !== 'undefined' && window.db) {
      const chat = (window.currentChatType === 'private') ? window.db.characters.find(c => c.id === window.currentChatId) : window.db.groups.find(g => g.id === window.currentChatId);
      if (chat) {
        chat.customBubbleCss = preset.css;
        chat.useCustomBubbleCss = true;
      }
    }
  } catch (e) {}
  try {
    updateCustomBubbleStyle(window.currentChatId || null, preset.css, true);
    const previewBox = document.getElementById('private-bubble-css-preview') || document.getElementById('group-bubble-css-preview');
    if (previewBox) updateBubbleCssPreview(previewBox, preset.css, false, colorThemes[(window.db.characters.find(c=>c.id===window.currentChatId)?.theme)||'white_pink']||colorThemes['white_pink']);
    if (window.showToast) window.showToast('预设已应用到当前聊天并保存');
    if (typeof window.saveData === 'function') { try { await window.saveData(); } catch (e) {} }
  } catch (e) {}
}
function saveCurrentTextareaAsPreset() {
  const textarea = document.getElementById('setting-custom-bubble-css');
  if (!textarea) return;
  const css = textarea.value.trim();
  if (!css) { if (window.showToast) window.showToast('当前 CSS 为空，无法保存'); return; }
  let name = prompt('请输入预设名称（将覆盖同名预设）:');
  if (!name) return;
  const presets = _getBubblePresets();
  const idx = presets.findIndex(p => p.name === name);
  if (idx >= 0) presets[idx].css = css; else presets.push({ name, css });
  _saveBubblePresets(presets);
  populateBubblePresetSelect();
  if (window.showToast) window.showToast('预设已保存');
}
function openManagePresetsModal() {
  const modal = document.getElementById('bubble-presets-modal');
  const list = document.getElementById('bubble-presets-list');
  if (!modal || !list) return;
  list.innerHTML = '';
  const presets = _getBubblePresets();
  if (!presets.length) list.innerHTML = '<p style="color:#888;margin:6px 0;">暂无预设</p>';
  presets.forEach((p, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 0';
    row.style.marginBottom = '12px';
    if (idx < presets.length - 1) {
      row.style.borderBottom = '1px solid #f5f5f5';
    }
    const nameDiv = document.createElement('div');
    nameDiv.style.flex = '1';
    nameDiv.style.minWidth = '120px';
    nameDiv.style.fontSize = '15px';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.whiteSpace = 'nowrap';
    nameDiv.style.overflow = 'hidden';
    nameDiv.style.textOverflow = 'ellipsis';
    nameDiv.textContent = p.name;
    row.appendChild(nameDiv);
    const btnWrap = document.createElement('div');
    btnWrap.style.display = 'flex';
    btnWrap.style.gap = '6px';
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.style.width = '36px';
    applyBtn.style.height = '36px';
    applyBtn.style.padding = '0';
    applyBtn.style.borderRadius = '8px';
    applyBtn.style.fontSize = '14px';
    applyBtn.style.fontWeight = 'bold';
    applyBtn.textContent = '应';
    applyBtn.onclick = function () { applyPresetToCurrentChat(p.name); modal.style.display = 'none'; };
    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn';
    renameBtn.style.width = '36px';
    renameBtn.style.height = '36px';
    renameBtn.style.padding = '0';
    renameBtn.style.borderRadius = '8px';
    renameBtn.style.fontSize = '14px';
    renameBtn.style.fontWeight = 'bold';
    renameBtn.textContent = '重';
    renameBtn.onclick = function () {
      const newName = prompt('输入新名称：', p.name);
      if (!newName) return;
      const presetsAll = _getBubblePresets();
      presetsAll[idx].name = newName;
      _saveBubblePresets(presetsAll);
      openManagePresetsModal();
      populateBubblePresetSelect();
    };
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.style.width = '36px';
    delBtn.style.height = '36px';
    delBtn.style.padding = '0';
    delBtn.style.borderRadius = '8px';
    delBtn.style.fontSize = '14px';
    delBtn.style.fontWeight = 'bold';
    delBtn.style.background = '#e57373';
    delBtn.style.borderColor = '#e57373';
    delBtn.style.color = '#fff';
    delBtn.textContent = '删';
    delBtn.onclick = function () {
      if (!confirm('确定删除预设 "' + p.name + '" ?')) return;
      const presetsAll = _getBubblePresets();
      presetsAll.splice(idx, 1);
      _saveBubblePresets(presetsAll);
      openManagePresetsModal();
      populateBubblePresetSelect();
    };
    btnWrap.appendChild(applyBtn);
    btnWrap.appendChild(renameBtn);
    btnWrap.appendChild(delBtn);
    row.appendChild(btnWrap);
    list.appendChild(row);
  });
  modal.style.display = 'flex';
}
function bindBubblePresetUI() {
  populateBubblePresetSelect();
  const sel = document.getElementById('bubble-preset-select');
  const applyBtn = document.getElementById('apply-preset-btn');
  const saveBtn = document.getElementById('save-preset-btn');
  const manageBtn = document.getElementById('manage-presets-btn');
  const modalClose = document.getElementById('close-presets-modal');
  if (sel) {
    sel.addEventListener('change', (e) => {
      const val = e.target.value;
      const previewBox = document.getElementById('private-bubble-css-preview') || document.getElementById('group-bubble-css-preview');
      if (!val) {
        try {
          const chat = (typeof window.currentChatType !== 'undefined' && typeof window.currentChatId !== 'undefined' && window.db) ? ((window.currentChatType === 'private') ? window.db.characters.find(c => c.id === window.currentChatId) : window.db.groups.find(g => g.id === window.currentChatId)) : null;
          const baseCss = (chat && chat.customBubbleCss) ? chat.customBubbleCss : (document.getElementById('setting-custom-bubble-css') ? document.getElementById('setting-custom-bubble-css').value : '');
          if (previewBox) updateBubbleCssPreview(previewBox, baseCss, !chat || !chat.useCustomBubbleCss, colorThemes[(chat?.theme)||'white_pink']||colorThemes['white_pink']);
        } catch (e) {}
        return;
      }
      const presets = _getBubblePresets();
      const p = presets.find(x => x.name === val);
      if (previewBox) updateBubbleCssPreview(previewBox, p ? p.css : '', false, colorThemes[(window.db.characters.find(c=>c.id===window.currentChatId)?.theme)||'white_pink']||colorThemes['white_pink']);
    });
  }
  if (applyBtn) applyBtn.addEventListener('click', () => {
    const selVal = document.getElementById('bubble-preset-select').value;
    if (!selVal) { if (window.showToast) window.showToast('请选择要应用的预设'); return; }
    applyPresetToCurrentChat(selVal);
  });
  if (saveBtn) saveBtn.addEventListener('click', saveCurrentTextareaAsPreset);
  if (manageBtn) manageBtn.addEventListener('click', openManagePresetsModal);
  if (modalClose) modalClose.addEventListener('click', () => { document.getElementById('bubble-presets-modal').style.display = 'none'; });
}

window.ChatStyling = {
  init: () => {
    populateThemeOptions();
    bindPrivateCustomCssPreview();
    bindGroupCustomCssPreview();
    bindBackgroundUpload();
    bindBubbleScale();
    bindBubblePresetUI();
    setupAvatarFrameSystem();
  },
  applyChatTheme,
  updateCustomBubbleStyle,
  updateBubbleCssPreview,
  bindBubblePresetUI,
  setupAvatarFrameSystem,
  applyAvatarFrame,
  renderAvatarInSettings,
  colorThemes
};
window.colorThemes = colorThemes;
window.updateCustomBubbleStyle = updateCustomBubbleStyle;
window.updateBubbleCssPreview = updateBubbleCssPreview;
window.bindBubblePresetUI = bindBubblePresetUI;
window.setupAvatarFrameSystem = setupAvatarFrameSystem;
window.applyAvatarFrame = applyAvatarFrame;
window.renderAvatarInSettings = renderAvatarInSettings;
