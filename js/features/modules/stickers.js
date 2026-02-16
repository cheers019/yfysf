let longPressTimer;
const stickerToggleBtns = [
    document.getElementById('sticker-toggle-btn'),
    document.getElementById('wechat-sticker-toggle-btn')
].filter(Boolean),
    stickerModal = document.getElementById('sticker-modal'),
    stickerGridContainer = document.getElementById('sticker-grid-container'),
    addNewStickerBtn = document.getElementById('add-new-sticker-btn'),
    addStickerModal = document.getElementById('add-sticker-modal'),
    addStickerModalTitle = document.getElementById('add-sticker-modal-title'),
    addStickerForm = document.getElementById('add-sticker-form'),
    stickerEditIdInput = document.getElementById('sticker-edit-id'),
    stickerPreview = document.getElementById('sticker-preview'),
    stickerNameInput = document.getElementById('sticker-name'),
    stickerUrlInput = document.getElementById('sticker-url-input'),
    stickerFileUpload = document.getElementById('sticker-file-upload');
const stickerActionSheet = document.getElementById('sticker-actionsheet'),
    editStickerBtn = document.getElementById('edit-sticker-btn'),
    deleteStickerBtn = document.getElementById('delete-sticker-btn');

let currentStickerCategory = 'all';
let isStickerSelectionMode = false;
let selectedStickerIds = new Set();
let currentStickerActionTarget = null;

// ===== 🆕 表情包分组功能：数据迁移函数 =====
/**
 * 迁移旧版表情包数据到分组版本
 * - 为旧表情包添加 group 字段（null = 未分类）
 * - 为旧表情包添加 lastUsedTime 字段
 */
async function migrateStickersToGroupVersion() {
    let needSave = false;
    
    if (!db.myStickers) {
        db.myStickers = [];
        return;
    }
    
    db.myStickers.forEach(sticker => {
        // 检查是否已有 group 字段（已迁移过）
        if (sticker.group === undefined) {
            sticker.group = null;  // 归入"未分类"
            needSave = true;
        }
        
        // 检查是否已有 lastUsedTime（可选功能）
        if (!sticker.lastUsedTime) {
            sticker.lastUsedTime = Date.now();
            needSave = true;
        }
    });
    
    if (needSave) {
        await saveData();
        console.log('✅ 表情包数据已迁移到分组版本');
    }
}

/**
 * 迁移角色的表情包权限设置
 * - 将旧的 shareStickers 布尔值转换为 stickerGroups 字符串
 */
async function migrateCharacterStickerBindings() {
    let needSave = false;
    
    db.characters.forEach(char => {
        // 如果有旧的 shareStickers 字段
        // 严格区分 undefined/null（未配置）和 ''（已配置但为空）
        if (char.shareStickers === true && (char.stickerGroups === undefined || char.stickerGroups === null)) {
            // 只有当 stickerGroups 是 undefined 或 null 时，才进行迁移
            // 如果它是 ''（空字符串），说明用户已经明确清空了，不要动它
            // 将所有分组绑定给该角色（保持旧行为）
            const allGroups = [...new Set(
                db.myStickers
                    .map(s => s.group || '未分类')
                    .filter(Boolean)
            )];
            char.stickerGroups = allGroups.join(',');
            needSave = true;
        } else if (char.stickerGroups === undefined || char.stickerGroups === null) {
            // 只有当 stickerGroups 是 undefined 或 null 时，才初始化为空字符串
            // 如果它已经是 ''（空字符串），说明用户已经明确清空了，不要动它
            char.stickerGroups = '';  // 初始化为空（不绑定任何表情）
            needSave = true;
        }
    });
    
    if (needSave) {
        await saveData();
        console.log('✅ 角色表情包绑定已迁移');
    }
}
// ===== 迁移函数结束 =====

// ===============================================================
// START: 批量添加表情包功能
function setupBatchStickerUpload() {
    const modal = document.getElementById('batch-add-sticker-modal');
    const uploadView = document.getElementById('batch-upload-view');
    const namingView = document.getElementById('batch-naming-view');

    const fileInput = document.getElementById('batch-sticker-files-upload');
    const urlInput = document.getElementById('batch-sticker-urls-input');
    const groupInput = document.getElementById('batch-sticker-group-input'); // 🆕 分组输入框
    const processBtn = document.getElementById('process-batch-stickers-btn');
    
    const previewGrid = document.getElementById('batch-sticker-preview-grid');
    const namesInput = document.getElementById('batch-sticker-names-input');
    const saveBtn = document.getElementById('save-batch-stickers-btn');
    const backBtn = document.getElementById('back-to-batch-upload-btn');
    
    // 🛡️ 安全检查
    if (!modal || !uploadView || !namingView || !processBtn || !saveBtn || !backBtn) {
        console.warn('⚠️ setupBatchStickerUpload: 批量导入相关元素未完全加载');
        return;
    }
    
    let tempStickerData = []; // 用于存储待保存的 base64 数据

    const resetModal = () => {
        if (uploadView) uploadView.style.display = 'block';
        if (namingView) namingView.style.display = 'none';
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = '';
        if (namesInput) namesInput.value = '';
        if (groupInput) groupInput.value = ''; // 🆕 重置分组输入
        if (previewGrid) previewGrid.innerHTML = '';
        tempStickerData = [];
    };

    // 点击遮罩关闭弹窗
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('visible');
            resetModal();
        }
    });

    // 返回上一步
    backBtn.addEventListener('click', () => {
        resetModal();
    });

    // 🔥 核心：处理"下一步"按钮点击
    processBtn.addEventListener('click', async () => {
        console.log('🔵 [批量导入] 点击了"下一步"按钮');
        
        if (!fileInput || !urlInput) {
            console.error('❌ [批量导入] 输入元素未找到');
            showToast('系统错误：输入元素未加载');
            return;
        }
        
        const files = fileInput.files ? Array.from(fileInput.files) : [];
        const urls = urlInput.value ? urlInput.value.split(',').map(u => u.trim()).filter(Boolean) : [];

        console.log(`🔵 [批量导入] 文件数量: ${files.length}, URL数量: ${urls.length}`);

        if (files.length === 0 && urls.length === 0) {
            showToast('请选择文件或输入URL');
            return;
        }

        showToast('正在处理图片，请稍候...');
        if (previewGrid) previewGrid.innerHTML = '<div class="placeholder-text">处理中...</div>';
        if (uploadView) uploadView.style.display = 'none';
        if (namingView) namingView.style.display = 'block';

        const promises = [];
        tempStickerData = [];

        // 处理本地文件
        files.forEach(file => {
            promises.push(
                compressImage(file, { quality: 0.8, maxWidth: 200, maxHeight: 200 })
                    .then(dataUrl => {
                        tempStickerData.push({ data: dataUrl });
                        console.log(`✅ [批量导入] 文件处理成功: ${file.name}`);
                    })
                    .catch(err => {
                        console.error(`❌ [批量导入] 文件处理失败: ${file.name}`, err);
                    })
            );
        });
        
        // 处理URL
        urls.forEach(url => {
            // 对于URL，我们直接使用，不进行压缩
            tempStickerData.push({ data: url });
            console.log(`✅ [批量导入] URL添加成功: ${url}`);
        });
        
        try {
            await Promise.all(promises);
            console.log(`🔵 [批量导入] 所有图片处理完成，共 ${tempStickerData.length} 张`);

            // 渲染预览
            if (previewGrid) {
                previewGrid.innerHTML = '';
                tempStickerData.forEach((sticker, index) => {
                    const item = document.createElement('div');
                    item.className = 'sticker-item';
                    item.innerHTML = `<img src="${sticker.data}" alt="预览${index+1}">`;
                    previewGrid.appendChild(item);
                });
            }
            
            showToast(`已成功加载 ${tempStickerData.length} 张图片，请为它们命名。`);
        } catch (error) {
            console.error('❌ [批量导入] 处理图片时出错:', error);
            showToast('处理图片时出错，请重试');
            resetModal();
        }
    });
    
    // 保存按钮
    saveBtn.addEventListener('click', async () => {
        console.log('🔵 [批量导入] 点击了"保存"按钮');
        
        if (tempStickerData.length === 0) {
            showToast('没有可保存的表情包');
            return;
        }

        const names = namesInput ? namesInput.value.split(',').map(n => n.trim()) : [];
        const groupName = groupInput ? groupInput.value.trim() : null; // 🆕 获取分组名称
        
        console.log(`🔵 [批量导入] 分组名称: "${groupName || '未分类'}"`);
        
        tempStickerData.forEach((sticker, index) => {
            const newSticker = {
                id: `sticker_${Date.now()}_${index}`,
                name: names[index] || `表情包${db.myStickers.length + index + 1}`,
                data: sticker.data,
                group: groupName || null, // 🆕 保存分组
                lastUsedTime: Date.now() // 🆕 记录时间
            };
            db.myStickers.push(newSticker);
        });

        await saveData();
        modal.classList.remove('visible');
        resetModal();
        
        // 🆕 如果表情包弹窗是打开的，重新渲染
        const stickerModalElement = document.getElementById('sticker-modal');
        if (stickerModalElement && stickerModalElement.classList.contains('visible')) {
            renderStickerTabs();
            renderStickerGrid();
        }
        
        console.log(`✅ [批量导入] 成功添加 ${tempStickerData.length} 个表情包到分组 "${groupName || '未分类'}"`);
        showToast(`成功添加了 ${tempStickerData.length} 个表情包！`);
    });
}
// 
// ===============================================================

async function sendSticker(sticker) {
    if (currentChatType === 'private') {
        const character = db.characters.find(c => c.id === currentChatId);
        if (character && character.isBlockedByAi) {
            showToast('你已被对方拉黑');
            return; // 阻止函数继续执行
        }
    }
    
    // 🆕 更新表情包的最后使用时间
    const stickerInDb = db.myStickers.find(s => s.id === sticker.id);
    if (stickerInDb) {
        stickerInDb.lastUsedTime = Date.now();
    }
    
    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
    const myName = (currentChatType === 'private') ? chat.myName : chat.me.nickname;
    const messageContentForAI = `[${myName}的表情包：${sticker.name}]`;
    const message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: messageContentForAI,
        parts: [{type: 'text', text: messageContentForAI}],
        timestamp: Date.now(),
        stickerData: sticker.data
    };
    if (currentChatType === 'group') {
        message.senderId = 'user_me';
    }
    chat.history.push(message);
    addMessageBubble(message);
    await saveData();
    renderChatList();
    stickerModal.classList.remove('visible');
}

async function setupStickerSystem() {
    // 🆕 获取新的 UI 元素（添加安全检查）
    const stickerMenuBtn = document.getElementById('sticker-menu-btn');
    const stickerMenuActionSheet = document.getElementById('sticker-menu-action-sheet');
    const stickerMenuBackdrop = document.getElementById('sticker-menu-backdrop');
    const menuMultiSelectBtn = document.getElementById('menu-multi-select-btn');
    const menuBatchImportBtn = document.getElementById('menu-batch-import-btn');
    const menuAddNewBtn = document.getElementById('menu-add-new-btn');
    const menuCancelBtn = document.getElementById('menu-cancel-btn');
    const stickerGroupInput = document.getElementById('sticker-group-input');
    const functionPanel = document.getElementById('function-panel');
    const messageArea = document.getElementById('message-area');
    const chatRoomContent = document.querySelector('#chat-room-screen .content');
    
    // 🛡️ 安全检查：如果核心元素不存在，输出警告并返回
    if (!stickerModal) {
        console.warn('⚠️ setupStickerSystem: stickerModal 元素未找到');
        return;
    }
    if (stickerToggleBtns.length === 0) {
        console.warn('⚠️ setupStickerSystem: stickerToggleBtn 元素未找到');
        return;
    }
    
    const scrollToBottom = () => {
        if (messageArea) {
            messageArea.scrollTop = messageArea.scrollHeight;
            return;
        }
        if (chatRoomContent) {
            chatRoomContent.scrollTop = chatRoomContent.scrollHeight;
        }
    };
    const shouldScrollToBottom = () => {
        if (!messageArea) return false;
        const distance = messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight;
        return distance < 120;
    };

    // 表情包弹窗开关
    stickerToggleBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (functionPanel && functionPanel.classList.contains('visible')) {
                functionPanel.classList.remove('visible');
            }
            stickerModal.classList.toggle('visible');
            if (stickerModal.classList.contains('visible')) {
                renderStickerTabs(); // 🆕 渲染分组标签
                renderStickerGrid();
            }
            if (shouldScrollToBottom()) {
                setTimeout(scrollToBottom, 50);
            }
        });
    });
    
    // 🆕 打开右上角菜单（添加完整安全检查）
    if (stickerMenuBtn && stickerMenuActionSheet) {
        stickerMenuBtn.addEventListener('click', () => {
            stickerMenuActionSheet.classList.add('visible');
        });
    }
    
    // 🆕 关闭菜单（点击遮罩或取消按钮）
    if (stickerMenuBackdrop && stickerMenuActionSheet) {
        stickerMenuBackdrop.addEventListener('click', () => {
            stickerMenuActionSheet.classList.remove('visible');
        });
    }
    if (menuCancelBtn && stickerMenuActionSheet) {
        menuCancelBtn.addEventListener('click', () => {
            stickerMenuActionSheet.classList.remove('visible');
        });
    }
    
    // 🆕 菜单项：多选管理
    if (menuMultiSelectBtn && stickerMenuActionSheet) {
        menuMultiSelectBtn.addEventListener('click', () => {
            stickerMenuActionSheet.classList.remove('visible');
            enterStickerSelectionMode(); // 进入多选模式
        });
    }
    
    // 🆕 菜单项：批量导入
    if (menuBatchImportBtn && stickerMenuActionSheet) {
        menuBatchImportBtn.addEventListener('click', () => {
            stickerMenuActionSheet.classList.remove('visible');
            updateGroupSuggestions(); // 🆕 更新分组建议
            const batchModal = document.getElementById('batch-add-sticker-modal');
            if (batchModal) {
                batchModal.classList.add('visible');
            }
        });
    }
    
    // 🆕 菜单项：添加新表情
    if (menuAddNewBtn && stickerMenuActionSheet) {
        menuAddNewBtn.addEventListener('click', () => {
            stickerMenuActionSheet.classList.remove('visible');
            if (addStickerModalTitle) addStickerModalTitle.textContent = '添加新表情';
            if (addStickerForm) addStickerForm.reset();
            if (stickerEditIdInput) stickerEditIdInput.value = '';
            if (stickerPreview) stickerPreview.innerHTML = '<span>预览</span>';
            if (stickerUrlInput) stickerUrlInput.disabled = false;
            updateGroupSuggestions(); // 🆕 更新分组建议
            if (addStickerModal) addStickerModal.classList.add('visible');
        });
    }
    
    // 原有的添加按钮（保留，防止其他地方调用）
    if (addNewStickerBtn) {
        addNewStickerBtn.addEventListener('click', () => {
            if (addStickerModalTitle) addStickerModalTitle.textContent = '添加新表情';
            if (addStickerForm) addStickerForm.reset();
            if (stickerEditIdInput) stickerEditIdInput.value = '';
            if (stickerPreview) stickerPreview.innerHTML = '<span>预览</span>';
            if (stickerUrlInput) stickerUrlInput.disabled = false;
            updateGroupSuggestions(); // 🆕 更新分组建议
            if (addStickerModal) addStickerModal.classList.add('visible');
        });
    }
    
    // 🆕 修改：添加/编辑表情时支持分组
    if (addStickerForm) {
        addStickerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!stickerNameInput) {
                return showToast('表单元素未加载');
            }
            
            const name = stickerNameInput.value.trim();
            const group = stickerGroupInput ? stickerGroupInput.value.trim() : null; // 🆕 获取分组
            const id = stickerEditIdInput ? stickerEditIdInput.value : '';
            const previewImg = stickerPreview ? stickerPreview.querySelector('img') : null;
            const data = previewImg ? previewImg.src : null;
            
            if (!name || !data) {
                return showToast('请填写表情名称并提供图片');
            }
            
            const stickerData = {
                name, 
                data,
                group: group || null, // 🆕 保存分组（空值为 null）
                lastUsedTime: Date.now() // 🆕 记录时间
            };
            
            if (id) {
                // 编辑现有表情
                const index = db.myStickers.findIndex(s => s.id === id);
                if (index > -1) {
                    db.myStickers[index] = {...db.myStickers[index], ...stickerData};
                }
            } else {
                // 新增表情
                stickerData.id = `sticker_${Date.now()}`;
                db.myStickers.push(stickerData);
            }
            
            await saveData();
            renderStickerTabs(); // 🆕 重新渲染标签
            renderStickerGrid();
            if (addStickerModal) addStickerModal.classList.remove('visible');
            showToast('表情包已保存');
        });
    }
    
    if (stickerUrlInput) {
        stickerUrlInput.addEventListener('input', (e) => {
            if (stickerPreview) stickerPreview.innerHTML = `<img src="${e.target.value}" alt="预览">`;
            if (stickerFileUpload) stickerFileUpload.value = '';
        });
    }
    
    if (stickerFileUpload) {
        stickerFileUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const compressedUrl = await compressImage(file, {quality: 0.8, maxWidth: 200, maxHeight: 200});
                    if (stickerPreview) stickerPreview.innerHTML = `<img src="${compressedUrl}" alt="预览">`;
                    if (stickerUrlInput) {
                        stickerUrlInput.value = '';
                        stickerUrlInput.disabled = true;
                    }
                } catch (error) {
                    console.error('表情包压缩失败:', error);
                    showToast('表情包压缩失败，请重试');
                }
            }
        });
    }
    
    if (editStickerBtn) {
        editStickerBtn.addEventListener('click', () => {
            if (!currentStickerActionTarget) return;
            const sticker = db.myStickers.find(s => s.id === currentStickerActionTarget);
            if (sticker) {
                if (addStickerModalTitle) addStickerModalTitle.textContent = '编辑表情';
                if (stickerEditIdInput) stickerEditIdInput.value = sticker.id;
                if (stickerNameInput) stickerNameInput.value = sticker.name;
                if (stickerPreview) stickerPreview.innerHTML = `<img src="${sticker.data}" alt="预览">`;
                
                // 🆕 更新分组建议并回显分组信息
                updateGroupSuggestions();
                if (stickerGroupInput) {
                    stickerGroupInput.value = sticker.group || '';
                }
                
                if (stickerUrlInput) {
                    if (sticker.data.startsWith('http')) {
                        stickerUrlInput.value = sticker.data;
                        stickerUrlInput.disabled = false;
                    } else {
                        stickerUrlInput.value = '';
                        stickerUrlInput.disabled = true;
                    }
                }
                if (addStickerModal) addStickerModal.classList.add('visible');
            }
            if (stickerActionSheet) stickerActionSheet.classList.remove('visible');
            currentStickerActionTarget = null;
        });
    }
    
    if (deleteStickerBtn) {
        deleteStickerBtn.addEventListener('click', async () => {
            if (!currentStickerActionTarget) return;
            const sticker = db.myStickers.find(s => s.id === currentStickerActionTarget);
            if (sticker) {
                if (confirm(`确定要删除表情"${sticker.name}"吗？`)) {
                    db.myStickers = db.myStickers.filter(s => s.id !== currentStickerActionTarget);
                    await saveData();
                    renderStickerTabs(); // 🆕 重新渲染标签（删除后分组可能变化）
                    renderStickerGrid();
                    showToast('表情已删除');
                }
            }
            if (stickerActionSheet) stickerActionSheet.classList.remove('visible');
            currentStickerActionTarget = null;
        });
    }
    
    // ===== 🆕 多选管理底部操作栏按钮 =====
    const selectAllStickersBtn = document.getElementById('select-all-stickers-btn');
    const exitSelectionBtn = document.getElementById('exit-selection-mode-btn');
    const moveSelectedBtn = document.getElementById('move-selected-stickers-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-stickers-btn');
    
    // 🆕 智能全选/反选当前视图
    if (selectAllStickersBtn) {
        selectAllStickersBtn.addEventListener('click', () => {
            toggleSelectAllCurrentStickers();
        });
    }
    
    // 退出选择模式
    if (exitSelectionBtn) {
        exitSelectionBtn.addEventListener('click', () => {
            exitStickerSelectionMode();
        });
    }
    
    // 移动到分组
    if (moveSelectedBtn) {
        moveSelectedBtn.addEventListener('click', () => {
            moveSelectedStickersToGroup();
        });
    }
    
    // 批量删除
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', () => {
            deleteSelectedStickers();
        });
    }
    
    // 移动分组弹窗的按钮
    const cancelMoveBtn = document.getElementById('cancel-move-stickers-btn');
    const confirmMoveBtn = document.getElementById('confirm-move-stickers-btn');
    const moveModal = document.getElementById('move-stickers-modal');
    
    if (cancelMoveBtn && moveModal) {
        cancelMoveBtn.addEventListener('click', () => {
            moveModal.classList.remove('visible');
        });
    }
    
    if (confirmMoveBtn) {
        confirmMoveBtn.addEventListener('click', () => {
            confirmMoveStickers();
        });
    }
    
    // 点击移动弹窗遮罩关闭
    if (moveModal) {
        moveModal.addEventListener('click', (e) => {
            if (e.target === moveModal) {
                moveModal.classList.remove('visible');
            }
        });
    }
}

// ===== 🆕 多选管理功能 =====

// 进入多选模式
function enterStickerSelectionMode() {
    isStickerSelectionMode = true;
    selectedStickerIds.clear();
    
    const stickerModalElement = document.getElementById('sticker-modal');
    if (stickerModalElement) {
        stickerModalElement.classList.add('selection-mode');
    }
    
    // 重新渲染网格以显示复选框
    renderStickerGrid();
    updateSelectionCount();
    updateSelectAllButtonState(); // 🆕 初始化全选按钮状态
    
    console.log('✅ 进入多选模式');
}

// 退出多选模式
function exitStickerSelectionMode() {
    isStickerSelectionMode = false;
    selectedStickerIds.clear();
    
    const stickerModalElement = document.getElementById('sticker-modal');
    if (stickerModalElement) {
        stickerModalElement.classList.remove('selection-mode');
    }
    
    // 重新渲染网格以隐藏复选框
    renderStickerGrid();
    
    console.log('✅ 退出多选模式');
}

// 切换表情选中状态
function toggleStickerSelection(stickerId) {
    if (selectedStickerIds.has(stickerId)) {
        selectedStickerIds.delete(stickerId);
    } else {
        selectedStickerIds.add(stickerId);
    }
    updateSelectionCount(); // 这个函数内部会调用 updateSelectAllButtonState()
    
    // 更新单个表情项的视觉状态
    const item = document.querySelector(`.sticker-item[data-sticker-id="${stickerId}"]`);
    if (item) {
        if (selectedStickerIds.has(stickerId)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    }
}

// 更新选中数量显示
function updateSelectionCount() {
    const countElement = document.getElementById('selected-sticker-count');
    if (countElement) {
        countElement.textContent = `已选 ${selectedStickerIds.size} 项`;
    }
    
    // 🆕 更新全选按钮的文字和状态
    updateSelectAllButtonState();
}

// 🆕 更新全选按钮的文字状态
function updateSelectAllButtonState() {
    const selectAllBtn = document.getElementById('select-all-stickers-btn');
    if (!selectAllBtn) return;
    
    const currentStickers = getCurrentlyDisplayedStickers();
    if (currentStickers.length === 0) {
        selectAllBtn.disabled = true;
        selectAllBtn.style.opacity = '0.5';
        return;
    }
    
    selectAllBtn.disabled = false;
    selectAllBtn.style.opacity = '1';
    
    // 检查当前视图是否已全选
    const currentStickerIds = currentStickers.map(s => s.id);
    const allSelected = currentStickerIds.every(id => selectedStickerIds.has(id));
    
    const btnText = selectAllBtn.querySelector('span');
    if (btnText) {
        btnText.textContent = allSelected ? '取消' : '全选';
    }
}

// 🆕 获取当前显示的表情列表（根据当前标签筛选）
function getCurrentlyDisplayedStickers() {
    let stickersToShow = [];
    if (currentStickerCategory === 'all') {
        stickersToShow = [...db.myStickers];
    } else if (currentStickerCategory === 'uncategorized') {
        stickersToShow = db.myStickers.filter(s => !s.group || s.group.trim() === '');
    } else {
        stickersToShow = db.myStickers.filter(s => s.group === currentStickerCategory);
    }
    return stickersToShow;
}

// 🆕 智能全选/反选（Toggle）当前视图的表情
function toggleSelectAllCurrentStickers() {
    const currentStickers = getCurrentlyDisplayedStickers();
    
    if (currentStickers.length === 0) {
        showToast('当前分组没有表情');
        return;
    }
    
    // 检查当前显示的表情是否已全部选中
    const currentStickerIds = currentStickers.map(s => s.id);
    const allSelected = currentStickerIds.every(id => selectedStickerIds.has(id));
    
    if (allSelected) {
        // 情况 B：已全选 → 取消选中当前视图的所有表情
        currentStickerIds.forEach(id => {
            selectedStickerIds.delete(id);
            const item = document.querySelector(`.sticker-item[data-sticker-id="${id}"]`);
            if (item) item.classList.remove('selected');
        });
        console.log(`✅ 取消选中当前视图的 ${currentStickerIds.length} 个表情`);
        showToast(`已取消选中 ${currentStickerIds.length} 项`);
    } else {
        // 情况 A：未全选 → 选中当前视图的所有表情
        currentStickerIds.forEach(id => {
            selectedStickerIds.add(id);
            const item = document.querySelector(`.sticker-item[data-sticker-id="${id}"]`);
            if (item) item.classList.add('selected');
        });
        console.log(`✅ 选中当前视图的 ${currentStickerIds.length} 个表情`);
        showToast(`已全选 ${currentStickerIds.length} 项`);
    }
    
    // 更新选中数量显示
    updateSelectionCount();
}

// 批量移动到指定分组
async function moveSelectedStickersToGroup() {
    if (selectedStickerIds.size === 0) {
        showToast('请先选择要移动的表情');
        return;
    }
    
    // 打开移动分组弹窗
    const moveModal = document.getElementById('move-stickers-modal');
    const targetGroupInput = document.getElementById('move-stickers-target-group');
    
    if (!moveModal || !targetGroupInput) {
        console.error('❌ 移动分组弹窗元素未找到');
        return;
    }
    
    // 更新分组建议列表
    updateMoveGroupSuggestions();
    
    // 清空输入框
    targetGroupInput.value = '';
    
    // 显示弹窗
    moveModal.classList.add('visible');
}

// 更新移动分组弹窗的建议列表
function updateMoveGroupSuggestions() {
    const datalist = document.getElementById('move-stickers-group-suggestions');
    if (!datalist) return;
    
    const groups = getAllStickerGroups();
    datalist.innerHTML = '';
    
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        datalist.appendChild(option);
    });
}

// 确认移动到指定分组
async function confirmMoveStickers() {
    const targetGroupInput = document.getElementById('move-stickers-target-group');
    const moveModal = document.getElementById('move-stickers-modal');
    
    if (!targetGroupInput) return;
    
    const targetGroup = targetGroupInput.value.trim() || null;
    
    console.log(`🔵 [多选管理] 移动 ${selectedStickerIds.size} 个表情到分组 "${targetGroup || '未分类'}"`);
    
    // 更新选中表情的分组
    let movedCount = 0;
    db.myStickers.forEach(sticker => {
        if (selectedStickerIds.has(sticker.id)) {
            sticker.group = targetGroup;
            movedCount++;
        }
    });
    
    // 保存数据
    await saveData();
    
    // 关闭弹窗
    if (moveModal) moveModal.classList.remove('visible');
    
    // 刷新界面
    renderStickerTabs();
    renderStickerGrid();
    
    // 退出选择模式
    exitStickerSelectionMode();
    
    showToast(`成功移动 ${movedCount} 个表情到 "${targetGroup || '未分类'}"`);
    console.log(`✅ [多选管理] 成功移动 ${movedCount} 个表情`);
}

// 批量删除选中的表情
async function deleteSelectedStickers() {
    if (selectedStickerIds.size === 0) {
        showToast('请先选择要删除的表情');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedStickerIds.size} 个表情吗？`)) {
        return;
    }
    
    console.log(`🔵 [多选管理] 删除 ${selectedStickerIds.size} 个表情`);
    
    // 删除选中的表情
    const beforeCount = db.myStickers.length;
    db.myStickers = db.myStickers.filter(s => !selectedStickerIds.has(s.id));
    const deletedCount = beforeCount - db.myStickers.length;
    
    // 保存数据
    await saveData();
    
    // 刷新界面
    renderStickerTabs();
    renderStickerGrid();
    
    // 退出选择模式
    exitStickerSelectionMode();
    
    showToast(`成功删除 ${deletedCount} 个表情`);
    console.log(`✅ [多选管理] 成功删除 ${deletedCount} 个表情`);
}

// ===== 多选管理功能结束 =====

// ===== 🆕 角色表情包分组绑定功能 =====

/**
 * 渲染角色设置中的表情包分组选择器
 * @param {Array<string>} selectedGroups - 当前角色已选中的分组列表
 */
function renderStickerGroupsSelector(selectedGroups = []) {
    const container = document.getElementById('sticker-groups-selection-container');
    if (!container) {
        console.warn('⚠️ 表情包分组选择器容器未找到');
        return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 获取所有已有分组
    const allGroups = getAllStickerGroups();
    
    // 添加"未分类"选项（如果存在未分类表情）
    const hasUngrouped = db.myStickers && db.myStickers.some(s => !s.group || s.group.trim() === '');
    if (hasUngrouped) {
        allGroups.unshift('未分类');
    }
    
    // 如果没有任何分组
    if (allGroups.length === 0) {
        container.innerHTML = `
            <p style="color: #999; grid-column: 1/-1; text-align: center; margin: 0; font-size: 13px;">
                📦 还没有表情包，先去<a href="#" onclick="document.getElementById('sticker-toggle-btn').click(); return false;" style="color: var(--primary-color);">添加表情包</a>吧
            </p>
        `;
        updateStickerGroupsStatusSummary(0, 0);
        return;
    }
    
    // 渲染复选框
    allGroups.forEach((groupName, index) => {
        // 🆕 增强容错：确保 groupName 是有效字符串
        const displayName = (groupName && groupName.toString().trim()) || '未分类';
        const isChecked = selectedGroups.includes(displayName);
        
        const label = document.createElement('label');
        label.className = 'sticker-group-checkbox-label';
        label.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 10px;
            background: white;
            border: 2px solid ${isChecked ? 'var(--primary-color)' : '#ddd'};
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
        `;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'sticker-group-checkbox';
        checkbox.value = displayName;
        checkbox.checked = isChecked;
        checkbox.style.cssText = 'margin-right: 6px; cursor: pointer; width: 16px; height: 16px;';
        
        const span = document.createElement('span');
        span.textContent = displayName; // 🆕 确保显示名称
        span.style.cssText = 'font-size: 13px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #333;';
        
        // 🆕 动态更新边框颜色和状态摘要
        checkbox.addEventListener('change', () => {
            label.style.borderColor = checkbox.checked ? 'var(--primary-color)' : '#ddd';
            updateStickerGroupsStatusSummary(); // 实时更新状态摘要
        });
        
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
    
    // 🆕 初始化状态摘要
    updateStickerGroupsStatusSummary(selectedGroups.length, allGroups.length);
    
    console.log(`✅ 渲染表情包分组选择器: ${allGroups.length} 个分组, 已选中: [${selectedGroups.join(', ')}]`);
}

/**
 * 🆕 更新折叠菜单的状态摘要
 * @param {number} selectedCount - 已选中数量（可选，自动计算）
 * @param {number} totalCount - 总数量（可选，自动计算）
 */
function updateStickerGroupsStatusSummary(selectedCount = null, totalCount = null) {
    const summaryElement = document.getElementById('sticker-groups-status-summary');
    if (!summaryElement) return;
    
    // 自动计算数量
    if (selectedCount === null) {
        const checkboxes = document.querySelectorAll('.sticker-group-checkbox');
        selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        totalCount = checkboxes.length;
    }
    
    // 生成状态文本
    let statusText = '';
    let statusColor = '#888';
    
    if (totalCount === 0) {
        statusText = '暂无分组';
        statusColor = '#999';
    } else if (selectedCount === 0) {
        statusText = '未配置（已禁用）';
        statusColor = '#f44336';
    } else if (selectedCount === totalCount) {
        statusText = '全部允许';
        statusColor = 'var(--primary-color)';
    } else {
        statusText = `已选 ${selectedCount}/${totalCount} 个分组`;
        statusColor = 'var(--secondary-color)';
    }
    
    summaryElement.textContent = statusText;
    summaryElement.style.color = statusColor;
}

/**
 * 获取当前选中的表情包分组
 * @returns {Array<string>} 选中的分组名称数组
 */
function getSelectedStickerGroups() {
    const checkboxes = document.querySelectorAll('.sticker-group-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * 根据角色的分组绑定，筛选可用的表情包
 * @param {Object} character - 角色对象
 * @returns {Array} 筛选后的表情包列表
 */
function getAvailableStickersForCharacter(character) {
    if (!character || !db.myStickers || db.myStickers.length === 0) {
        return [];
    }
    
    // 获取角色绑定的分组
    let allowedGroups = [];
    // 严格区分 undefined/null（未配置）和 ''（已配置但为空）
    if (character.stickerGroups !== undefined && character.stickerGroups !== null) {
        // 已配置过（包括空字符串 ''）
        if (typeof character.stickerGroups === 'string' && character.stickerGroups.trim() !== '') {
            allowedGroups = character.stickerGroups.split(',').map(g => g.trim()).filter(Boolean);
        }
        // 如果 character.stickerGroups === ''，allowedGroups 保持为 []（已禁用）
    }
    // 如果 character.stickerGroups 是 undefined 或 null，allowedGroups 保持为 []（未配置，禁用）
    
    // 如果没有绑定任何分组（留空或旧角色），返回空数组（禁用表情包）
    if (allowedGroups.length === 0) {
        console.log(`🔵 [表情包筛选] 角色 "${character.realName}" 未绑定任何分组，表情包功能已禁用`);
        return [];
    }
    
    // 筛选表情包
    const availableStickers = db.myStickers.filter(sticker => {
        const stickerGroup = (sticker.group || '未分类').trim();
        const isAllowed = allowedGroups.includes(stickerGroup);
        return isAllowed;
    });
    
    console.log(`🔵 [表情包筛选] 角色 "${character.realName}" 允许分组: [${allowedGroups.join(', ')}], 可用表情: ${availableStickers.length}/${db.myStickers.length}`);
    
    return availableStickers;
}

// ===== 角色表情包分组绑定功能结束 =====

// 🆕 获取所有已存在的分组名称（去重）
function getAllStickerGroups() {
    if (!db.myStickers) {
        db.myStickers = [];
    }
    
    const allGroups = [...new Set(
        db.myStickers
            .map(s => s.group)
            .filter(g => g && g !== '未分类') // 过滤掉 null、undefined、空字符串和"未分类"
    )];
    
    return allGroups.sort(); // 按字母排序
}

// 🆕 更新分组建议列表（datalist）
function updateGroupSuggestions() {
    const groups = getAllStickerGroups();
    
    // 更新单个添加弹窗的 datalist
    const singleDatalist = document.getElementById('sticker-group-suggestions');
    if (singleDatalist) {
        singleDatalist.innerHTML = '';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            singleDatalist.appendChild(option);
        });
    }
    
    // 更新批量导入弹窗的 datalist
    const batchDatalist = document.getElementById('batch-sticker-group-suggestions');
    if (batchDatalist) {
        batchDatalist.innerHTML = '';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            batchDatalist.appendChild(option);
        });
    }
}

// 🆕 渲染分组标签栏
function renderStickerTabs() {
    const tabsContainer = document.getElementById('sticker-tabs');
    if (!tabsContainer) {
        console.warn('⚠️ renderStickerTabs: sticker-tabs 容器未找到');
        return;
    }
    
    if (!db.myStickers) {
        db.myStickers = [];
    }
    
    tabsContainer.innerHTML = '';
    
    // 1. 获取所有分组
    const allGroups = getAllStickerGroups();
    
    // 2. 创建"全部"标签
    const allTab = document.createElement('div');
    allTab.className = 'sticker-tab' + (currentStickerCategory === 'all' ? ' active' : '');
    allTab.textContent = '全部';
    allTab.addEventListener('click', () => {
        currentStickerCategory = 'all';
        renderStickerTabs();
        renderStickerGrid();
    });
    tabsContainer.appendChild(allTab);
    
    // 3. 创建"未分类"标签（只有当存在未分类表情时才显示）
    const hasUncategorized = db.myStickers.some(s => !s.group);
    if (hasUncategorized) {
        const uncategorizedTab = document.createElement('div');
        uncategorizedTab.className = 'sticker-tab' + (currentStickerCategory === 'uncategorized' ? ' active' : '');
        uncategorizedTab.textContent = '未分类';
        uncategorizedTab.addEventListener('click', () => {
            currentStickerCategory = 'uncategorized';
            renderStickerTabs();
            renderStickerGrid();
        });
        tabsContainer.appendChild(uncategorizedTab);
    }
    
    // 4. 创建其他分组标签
    allGroups.forEach(groupName => {
        const tab = document.createElement('div');
        tab.className = 'sticker-tab' + (currentStickerCategory === groupName ? ' active' : '');
        tab.textContent = groupName;
        tab.addEventListener('click', () => {
            currentStickerCategory = groupName;
            renderStickerTabs();
            renderStickerGrid();
        });
        tabsContainer.appendChild(tab);
    });
}

// 🆕 渲染表情包网格（支持分组筛选）
function renderStickerGrid() {
    const gridContainer = document.getElementById('sticker-grid-container');
    if (!gridContainer) {
        console.warn('⚠️ renderStickerGrid: sticker-grid-container 容器未找到');
        return;
    }
    
    if (!db.myStickers) {
        db.myStickers = [];
    }
    
    gridContainer.innerHTML = '';
    
    // 全局没有任何表情包
    if (db.myStickers.length === 0) {
        gridContainer.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color:#aaa; grid-column: 1 / -1;">
                <p style="font-size: 16px; margin-bottom: 10px;">📦 还没有表情包</p>
                <p style="font-size: 14px;">点击右上角菜单添加吧！</p>
            </div>
        `;
        return;
    }
    
    // 根据当前分组筛选表情包
    let stickersToShow = [];
    let emptyMessage = '';
    
    if (currentStickerCategory === 'all') {
        stickersToShow = db.myStickers;
        emptyMessage = '暂无表情包';
    } else if (currentStickerCategory === 'uncategorized') {
        stickersToShow = db.myStickers.filter(s => !s.group || s.group === '');
        emptyMessage = '未分类中暂无表情包';
    } else {
        stickersToShow = db.myStickers.filter(s => s.group === currentStickerCategory);
        emptyMessage = `"${currentStickerCategory}" 分组中暂无表情包`;
    }
    
    // 当前筛选条件下没有表情包
    if (stickersToShow.length === 0) {
        gridContainer.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color:#aaa; grid-column: 1 / -1;">
                <p style="font-size: 16px; margin-bottom: 10px;">🔍 ${emptyMessage}</p>
                <p style="font-size: 14px;">试试切换到其他分组查看</p>
            </div>
        `;
        return;
    }
    
    // 渲染表情包
    stickersToShow.forEach(sticker => {
        const item = document.createElement('div');
        item.className = 'sticker-item';
        item.dataset.stickerId = sticker.id; // 🆕 添加 data 属性
        
        // 🆕 添加选中状态
        if (selectedStickerIds.has(sticker.id)) {
            item.classList.add('selected');
        }
        
        // 🆕 添加复选框（只在选择模式下显示）
        const checkbox = document.createElement('div');
        checkbox.className = 'sticker-checkbox';
        item.appendChild(checkbox);
        
        // 添加图片和名称
        const img = document.createElement('img');
        img.src = sticker.data;
        img.alt = sticker.name;
        item.appendChild(img);
        
        const span = document.createElement('span');
        span.textContent = sticker.name;
        item.appendChild(span);
        
        // 🆕 点击事件：根据模式决定是发送还是选择
        item.addEventListener('click', () => {
            if (isStickerSelectionMode) {
                // 选择模式：切换选中状态
                toggleStickerSelection(sticker.id);
            } else {
                // 普通模式：发送表情
                sendSticker(sticker);
            }
        });
        
        // 长按/右键编辑（鼠标）- 只在非选择模式下生效
        item.addEventListener('mousedown', (e) => {
            if (isStickerSelectionMode) return; // 选择模式下禁用长按
            if (e.button !== 0) return;
            e.stopPropagation();
            longPressTimer = setTimeout(() => {
                handleStickerLongPress(sticker.id);
            }, 500);
        });
        item.addEventListener('mouseup', () => clearTimeout(longPressTimer));
        item.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
        
        // 长按编辑（触摸）- 只在非选择模式下生效
        item.addEventListener('touchstart', (e) => {
            if (isStickerSelectionMode) return; // 选择模式下禁用长按
            e.stopPropagation();
            longPressTimer = setTimeout(() => {
                handleStickerLongPress(sticker.id);
            }, 500);
        });
        item.addEventListener('touchend', () => clearTimeout(longPressTimer));
        item.addEventListener('touchmove', () => clearTimeout(longPressTimer));
        
        gridContainer.appendChild(item);
    });
    
    // 🆕 更新全选按钮状态（如果在选择模式下）
    if (isStickerSelectionMode) {
        updateSelectAllButtonState();
    }
}

function handleStickerLongPress(stickerId) {
    clearTimeout(longPressTimer);
    currentStickerActionTarget = stickerId;
    stickerActionSheet.classList.add('visible');
}

function renderMyStickers() {
    if (!stickerGridContainer) return; // 安全检查
    
    stickerGridContainer.innerHTML = '';
    if (db.myStickers.length === 0) {
        stickerGridContainer.innerHTML = '<p style="color:#aaa; text-align:center; grid-column: 1 / -1;">还没有表情哦，快去添加吧！</p>';
        return;
    }

    db.myStickers.forEach(sticker => {
        const item = document.createElement('div');
        item.className = 'sticker-item';
        item.dataset.id = sticker.id;
        item.innerHTML = `<img src="${sticker.url}" alt="${sticker.name}"><span>${sticker.name}</span>`;
        
        // 为每个表情项添加长按/右键菜单事件
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            currentStickerActionTarget = sticker.id;
            stickerActionSheet.classList.add('visible');
        });
        item.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                e.preventDefault();
                currentStickerActionTarget = sticker.id;
                stickerActionSheet.classList.add('visible');
            }, 500);
        });
        item.addEventListener('touchend', () => clearTimeout(longPressTimer));
        item.addEventListener('touchmove', () => clearTimeout(longPressTimer));

        stickerGridContainer.appendChild(item);
    });
}

function registerStickerRenderer() {
    if (!window.displayDispatcher || typeof window.displayDispatcher.register !== 'function') return false;
    window.displayDispatcher.register('sticker', function (message) {
        if (!message || !message.content) return '';
        const content = message.content;
        const sentStickerRegex = /\[(?:.+?)的表情包：.+?\]/i;
        const receivedStickerRegex = /\[(?:.+?)发送的表情包：([\s\S]+?)\]/i;
        const sentStickerMatch = content.match(sentStickerRegex);
        const receivedStickerMatch = content.match(receivedStickerRegex);
        const isSent = message.senderId ? (message.senderId === 'user_me') : (message.role === 'user');
        if (!((isSent && sentStickerMatch) || (!isSent && receivedStickerMatch))) return '';
        const db = (window.appState && window.appState.db) ? window.appState.db : window.db;
        if (!db) return '';
        const stickerData = message.stickerData;
        let stickerSrc = null, stickerName = '';
        if (isSent) {
            stickerSrc = stickerData;
            const match = content.match(/\[.*?的表情包：(.*?)\]/);
            if (match) stickerName = match[1];
        } else {
            stickerName = receivedStickerMatch[1].trim();
            const sticker = db.myStickers.find(s => s.name === stickerName);
            if (sticker) { stickerSrc = sticker.data; }
            else {
                const urlMatch = stickerName.match(/https?:\/\/[^\s\])]+/);
                if (urlMatch) { stickerSrc = urlMatch[0]; }
                else { const pathExtractionRegex = /[a-zA-Z0-9]+\/.*$/; const extractedPathMatch = stickerName.match(pathExtractionRegex); const finalPath = extractedPathMatch ? extractedPathMatch[0] : stickerName; stickerSrc = `https://i.postimg.cc/${finalPath}`; }
            }
        }
        if (stickerSrc) { return `<div class="image-bubble"><img src="${stickerSrc}" alt="表情包: ${escapeHTML(stickerName)}"></div>`; }
        return escapeHTML(`[表情包：${stickerName}]`);
    });
    return true;
}

if (!registerStickerRenderer()) {
    window.displayDispatcherPending = window.displayDispatcherPending || [];
    window.displayDispatcherPending.push(registerStickerRenderer);
}
