(() => {
    const TB_CallLogManager = {};
    let getContext = null;
    let saveData = null;
    let showToast = null;
    
    // State
    let isManageMode = false;
    let selectedIds = new Set();

    // DOM Elements
    const elements = {
        screen: document.getElementById('call-log-manager-screen'),
        list: document.getElementById('call-log-list'),
        placeholder: document.getElementById('no-call-logs-placeholder'),
        title: document.getElementById('call-log-manager-title'),
        manageBtn: document.getElementById('call-log-manage-btn'),
        multiSelectBar: document.getElementById('call-log-multi-select-bar'),
        selectCount: document.getElementById('call-log-select-count'),
        selectAllBtn: document.getElementById('call-log-select-all-btn'),
        deleteBtn: document.getElementById('call-log-delete-btn'),
        
        // Edit Screen
        editScreen: document.getElementById('call-log-edit-screen'),
        editBackBtn: document.getElementById('call-log-edit-back-btn'),
        saveBtn: document.getElementById('call-log-save-btn'),
        editId: document.getElementById('edit-call-id'),
        editTarget: document.getElementById('edit-call-target'),
        editTime: document.getElementById('edit-call-time'),
        editTitle: document.getElementById('edit-call-title'),
        editDuration: document.getElementById('edit-call-duration'),
        transcriptContainer: document.getElementById('edit-call-transcript-container'),
        addTranscriptBtn: document.getElementById('add-transcript-line-btn')
    };

    // Helper: Format Date
    const formatDate = (ts) => new Date(ts).toLocaleString();

    const getRuntime = () => {
        const context = typeof getContext === 'function' ? getContext() : null;
        return {
            db: context && context.db ? context.db : window.db,
            currentChatId: context && context.currentChatId ? context.currentChatId : window.currentChatId,
            currentChatType: context && context.currentChatType ? context.currentChatType : (window.currentChatType || 'private')
        };
    };

    const getCurrentChatName = (runtime) => {
        if (!runtime || !runtime.db || !runtime.currentChatId) return '当前角色';
        if (runtime.currentChatType === 'group') {
            const group = Array.isArray(runtime.db.groups) ? runtime.db.groups.find(g => g.id === runtime.currentChatId) : null;
            return group ? (group.name || '当前群聊') : '当前群聊';
        }
        const character = Array.isArray(runtime.db.characters) ? runtime.db.characters.find(c => c.id === runtime.currentChatId) : null;
        return character ? (character.remarkName || character.name || '当前角色') : '当前角色';
    };

    const getFilteredLogs = () => {
        const runtime = getRuntime();
        if (!runtime.db) return { runtime, logs: [] };
        runtime.db.callLogs = runtime.db.callLogs || [];
        if (!runtime.currentChatId) return { runtime, logs: [] };
        const logs = runtime.db.callLogs.filter(log => {
            const effectiveCharId = log.charId || log.targetId || runtime.currentChatId;
            return effectiveCharId === runtime.currentChatId;
        });
        return { runtime, logs };
    };

    const syncCallRecordToHistory = (log) => {
        if (!log || !window.db) return [];
        const updatedTargets = [];
        const updateHistory = (history) => {
            if (!Array.isArray(history)) return false;
            for (let i = history.length - 1; i >= 0; i -= 1) {
                const msg = history[i];
                if (msg && msg.type === 'call-record' && msg.callRecordData && msg.callRecordData.id === log.id) {
                    msg.callRecordData.title = log.title || '通话记录';
                    msg.callRecordData.duration = log.duration;
                    return true;
                }
            }
            return false;
        };
        if (Array.isArray(window.db.characters)) {
            window.db.characters.forEach(character => {
                if (updateHistory(character.history)) {
                    updatedTargets.push({ id: character.id, type: 'private' });
                }
            });
        }
        if (Array.isArray(window.db.groups)) {
            window.db.groups.forEach(group => {
                if (updateHistory(group.history)) {
                    updatedTargets.push({ id: group.id, type: 'group' });
                }
            });
        }
        return updatedTargets;
    };

    // Render List
    const renderList = () => {
        try {
            if (!elements.list || !elements.placeholder || !elements.manageBtn) return;
            if (!window.db) window.db = {};
            window.db.callLogs = window.db.callLogs || [];
            const { runtime, logs } = getFilteredLogs();
            const totalLogs = window.db.callLogs.length;
            if (!window.__callLogAuditLogged) {
                console.log("【存储检查】当前本地档案库记录总数: " + totalLogs);
                window.__callLogAuditLogged = true;
            }
            elements.list.innerHTML = '';
            const currentName = getCurrentChatName(runtime);
            if (elements.title) {
                elements.title.textContent = runtime && runtime.currentChatId ? `与 ${currentName} 的通话记录` : '通话记录';
            }
            
            if (logs.length === 0) {
                elements.placeholder.style.display = 'block';
                elements.manageBtn.style.display = 'none';
                elements.placeholder.innerHTML = `<p>暂时没有与 ${currentName} 的通话记忆</p>`;
                return;
            }
            
            elements.placeholder.style.display = 'none';
            elements.manageBtn.style.display = 'block';

            const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

            sortedLogs.forEach(log => {
                const item = document.createElement('div');
                item.className = 'call-log-item';
                item.dataset.id = log.id;
                item.style.cssText = `
                    background: white;
                    margin-bottom: 10px;
                    padding: 15px;
                    border-radius: 12px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    transition: transform 0.2s;
                `;
                
                const checkbox = document.createElement('div');
                checkbox.className = 'selection-checkbox';
                checkbox.innerHTML = selectedIds.has(log.id) ? 
                    '<svg viewBox="0 0 24 24" fill="#2196f3" style="width:24px;height:24px"><path d="M10,17L5,12L6.41,10.58L10,13.41L17.59,5.83L19,7.25L10,17Z"/></svg>' : 
                    '<div style="width:22px;height:22px;border:2px solid #ccc;border-radius:50%"></div>';
                checkbox.style.display = isManageMode ? 'block' : 'none';
                
                const icon = document.createElement('div');
                icon.innerHTML = '<svg viewBox="0 0 24 24" fill="#667eea" style="width:40px;height:40px"><path d="M20,15.5C18.75,15.5 17.55,15.3 16.43,14.93C16.08,14.82 15.69,14.9 15.41,15.18L13.21,17.38C10.38,15.94 8.06,13.62 6.62,10.79L8.82,8.59C9.1,8.31 9.18,7.92 9.07,7.57C8.7,6.45 8.5,5.25 8.5,4A1,1 0 0,0 7.5,3H4A1,1 0 0,0 3,4A17,17 0 0,0 20,21A1,1 0 0,0 21,20V16.5A1,1 0 0,0 20,15.5M19,12H21C21,7 17,3 12,3V5C15.86,5 19,8.13 19,12Z" /></svg>';
                
                const info = document.createElement('div');
                info.style.flex = '1';
                const titleText = log.title || log.targetName || '未知对象';
                info.innerHTML = `
                    <div style="font-weight:bold; font-size:16px; margin-bottom:4px;">${titleText}</div>
                    <div style="font-size:12px; color:#888;">${formatDate(log.timestamp)} · ${log.duration}</div>
                `;
                
                const editBtn = document.createElement('button');
                editBtn.innerHTML = '✎';
                editBtn.style.cssText = `
                    background: #f0f0f0; border: none; width: 32px; height: 32px; border-radius: 50%; color: #666; font-size: 16px; cursor: pointer;
                `;
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    openEditScreen(log);
                };
                if (isManageMode) editBtn.style.display = 'none';

                item.onclick = () => {
                    if (isManageMode) {
                        toggleSelection(log.id);
                    } else {
                        if (window.showCallDetail) window.showCallDetail(log.id);
                    }
                };

                item.appendChild(checkbox);
                item.appendChild(icon);
                item.appendChild(info);
                item.appendChild(editBtn);
                elements.list.appendChild(item);
            });
        } catch (error) {
            console.error('TB_CallLogManager.renderList error:', error);
        }
    };

    const openManagerScreen = () => {
        try {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            if (elements.editScreen) elements.editScreen.classList.remove('active');
            isManageMode = false;
            selectedIds.clear();
            if (elements.multiSelectBar) elements.multiSelectBar.style.display = 'none';
            if (elements.manageBtn) elements.manageBtn.textContent = '管理';
            if (elements.screen) elements.screen.classList.add('active');
            renderList();
        } catch (error) {
            console.error('TB_CallLogManager.openManagerScreen error:', error);
        }
    };

    // Toggle Selection
    const toggleSelection = (id) => {
        if (selectedIds.has(id)) {
            selectedIds.delete(id);
        } else {
            selectedIds.add(id);
        }
        updateSelectionUI();
    };

    const updateSelectionUI = () => {
        try {
            if (elements.selectCount) elements.selectCount.textContent = `已选 ${selectedIds.size} 项`;
            renderList();
        } catch (error) {
            console.error('TB_CallLogManager.updateSelectionUI error:', error);
        }
    };

    // Manage Mode Toggle
    const toggleManageMode = () => {
        isManageMode = !isManageMode;
        selectedIds.clear();
        elements.multiSelectBar.style.display = isManageMode ? 'flex' : 'none';
        elements.manageBtn.textContent = isManageMode ? '完成' : '管理';
        renderList();
    };

    // Delete Logic
    const deleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？`)) return;
        
        if (!window.db) window.db = {};
        window.db.callLogs = window.db.callLogs || [];
        window.db.callLogs = window.db.callLogs.filter(log => !selectedIds.has(log.id));
        const persist = typeof saveData === 'function' ? saveData : window.saveData;
        if (typeof persist === 'function') await persist();
        
        isManageMode = false;
        elements.multiSelectBar.style.display = 'none';
        elements.manageBtn.textContent = '管理';
        selectedIds.clear();
        renderList();
        showToast('删除成功');
    };

    // Edit Logic
    const openEditScreen = (log) => {
        try {
            if (!log) return;
            elements.editId.value = log.id;
            elements.editTarget.value = log.targetName || '';
            elements.editTime.value = formatDate(log.timestamp);
            if (elements.editTitle) elements.editTitle.value = log.title || '';
            elements.editDuration.value = log.duration || '';
            
            elements.transcriptContainer.innerHTML = '';
            (log.transcript || []).forEach(line => addTranscriptLine(line));
            
            elements.screen.classList.remove('active');
            elements.editScreen.classList.add('active');
        } catch (error) {
            console.error('TB_CallLogManager.openEditScreen error:', error);
        }
    };

    const addTranscriptLine = (line = { sender: 'user', text: '' }) => {
        try {
            const div = document.createElement('div');
            div.className = 'transcript-line-edit';
            div.style.cssText = 'display:flex; gap:8px; align-items:center; background:white; padding:8px; border-radius:8px; border:1px solid #eee;';
            
            const senderSelect = document.createElement('select');
            senderSelect.innerHTML = `
                <option value="user" ${line.sender === 'user' ? 'selected' : ''}>我</option>
                <option value="ai" ${line.sender === 'ai' ? 'selected' : ''}>AI</option>
            `;
            senderSelect.style.cssText = 'padding:5px; border-radius:4px; border:1px solid #ddd; width: 60px;';
            
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.value = line.text || '';
            textInput.style.cssText = 'flex:1; padding:5px; border:1px solid #ddd; border-radius:4px;';
            
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = 'background:#ff4d4f; color:white; border:none; width:24px; height:24px; border-radius:50%; cursor:pointer;';
            removeBtn.onclick = () => div.remove();
            
            div.appendChild(senderSelect);
            div.appendChild(textInput);
            div.appendChild(removeBtn);
            elements.transcriptContainer.appendChild(div);
        } catch (error) {
            console.error('TB_CallLogManager.addTranscriptLine error:', error);
        }
    };

    const saveEdit = async () => {
        const id = elements.editId.value;
        const log = window.db.callLogs.find(l => l.id === id);
        if (!log) return;
        
        if (elements.editTitle) log.title = elements.editTitle.value.trim();
        log.duration = elements.editDuration.value;
        
        // Collect transcript
        const lines = [];
        elements.transcriptContainer.querySelectorAll('.transcript-line-edit').forEach(div => {
            const sender = div.querySelector('select').value;
            const text = div.querySelector('input').value;
            if (text.trim()) lines.push({ sender, text });
        });
        log.transcript = lines;
        
        const updatedTargets = syncCallRecordToHistory(log);
        const persist = typeof window.saveData === 'function' ? window.saveData : saveData;
        if (typeof persist === 'function') await persist();
        console.log("【同步成功】已同时更新档案库与主历史记录卡片");
        showToast('保存成功');
        if (typeof window.renderMessages === 'function' && window.currentChatId) {
            const shouldRender = updatedTargets.some(target => target.id === window.currentChatId);
            if (shouldRender) window.renderMessages(false, true);
        }
        
        elements.editScreen.classList.remove('active');
        elements.screen.classList.add('active');
        renderList();
    };

    // Init
    TB_CallLogManager.init = (options) => {
        getContext = options.getContext;
        saveData = options.saveData;
        showToast = options.showToast;
        if (!window.db) window.db = {};
        window.db.callLogs = window.db.callLogs || [];
        if (elements.screen) elements.screen.style.backgroundColor = '#ffffff';
        if (elements.editScreen) elements.editScreen.style.backgroundColor = '#ffffff';
        
        // Register Handler
        if (window.TB_Core && typeof window.TB_Core.register === 'function') {
            window.TB_Core.register('call-logs', openManagerScreen);
        }
        
        // Bind Events
        if (elements.manageBtn) elements.manageBtn.onclick = toggleManageMode;
        const entryBtn = document.getElementById('call-log-entry-btn');
        if (entryBtn) entryBtn.onclick = openManagerScreen;
        if (elements.selectAllBtn) elements.selectAllBtn.onclick = () => {
            const { logs } = getFilteredLogs();
            const allSelected = logs.length > 0 && logs.every(l => selectedIds.has(l.id));
            if (allSelected) {
                selectedIds.clear();
            } else {
                logs.forEach(l => selectedIds.add(l.id));
            }
            updateSelectionUI();
        };
        if (elements.deleteBtn) elements.deleteBtn.onclick = deleteSelected;
        
        // Edit Screen Events
        if (elements.editBackBtn) {
            elements.editBackBtn.setAttribute('data-target', 'call-log-manager-screen');
            elements.editBackBtn.onclick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            try {
                elements.editScreen.classList.remove('active');
                elements.screen.classList.add('active');
                renderList();
            } catch (error) {
                console.error('TB_CallLogManager.editBack error:', error);
            }
            };
        }
        if (elements.saveBtn) elements.saveBtn.onclick = saveEdit;
        if (elements.addTranscriptBtn) elements.addTranscriptBtn.onclick = () => addTranscriptLine();
    };

    TB_CallLogManager.open = openManagerScreen;
    window.TB_CallLogManager = TB_CallLogManager;
})();
