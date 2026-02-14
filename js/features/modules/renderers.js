let editingRuleId = null;
let ruleCache = {};
let isRenderingRulesUIBound = false;
let isSelectionMode = false;
let selectedRuleIds = new Set();
let currentCategory = '默认分类';
let isRuleEditorCategoryDropdownBound = false;

function ensureRenderersStore() {
    if (!window.db) return [];
    if (!db.renderers) db.renderers = [];
    return db.renderers;
}

function getCharacterList() {
    return Array.isArray(db?.characters) ? db.characters : [];
}

function openRenderingRulesScreen() {
    console.log("渲染器：当前已启用的规则:", ensureRenderersStore().filter(r => r.isEnabled));
    renderRulesList();
    if (typeof switchScreen === 'function') switchScreen('rendering-rules-screen');
}

function renderRulesList() {
    const tabsContainer = document.getElementById('rules-tabs');
    const contentContainer = document.getElementById('rules-content-container');
    if (!tabsContainer || !contentContainer) return;

    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    const allRules = ensureRenderersStore();
    if (allRules.length === 0) {
        contentContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 50px;">还没有任何渲染器。点击右上角“+”创建第一个吧！</p>';
        updateBatchToolbar();
        return;
    }

    tabsContainer.style.display = 'flex';
    
    const categories = new Set();
    allRules.forEach(r => {
        if (!r.category) r.category = '默认分类';
        categories.add(r.category);
    });

    const preferredOrder = ['全部', '未分类', '默认分类'];
    const sortedCategories = Array.from(categories).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const orderedCategories = [];
    preferredOrder.forEach(cat => {
        if (categories.has(cat)) orderedCategories.push(cat);
    });
    sortedCategories.forEach(cat => {
        if (!preferredOrder.includes(cat)) orderedCategories.push(cat);
    });
    
    if (!categories.has(currentCategory)) {
        currentCategory = orderedCategories[0] || '默认分类';
    }

    orderedCategories.forEach(cat => {
        const tab = document.createElement('button');
        tab.className = `rules-tab ${cat === currentCategory ? 'active' : ''}`;
        tab.textContent = cat;
        tab.dataset.categoryName = cat;
        tab.onclick = () => switchRuleCategory(cat);
        tabsContainer.appendChild(tab);
    });
    
    orderedCategories.forEach(cat => {
        const pane = document.createElement('div');
        pane.className = `rules-category-pane ${cat === currentCategory ? 'active' : ''}`;
        pane.dataset.categoryName = cat;
        
        const rulesInCat = allRules.filter(r => r.category === cat);
        rulesInCat.forEach(rule => {
            const card = createRuleItemElement(rule);
            pane.appendChild(card);
        });
        
        contentContainer.appendChild(pane);
    });
    
    updateBatchToolbar();
}

function createRuleItemElement(rule) {
    const card = document.createElement('div');
    const isSelected = selectedRuleIds.has(rule.id);
    card.className = `rule-card ${rule.isEnabled ? 'enabled' : ''} ${isSelected ? 'selected' : ''}`;
    card.dataset.ruleId = rule.id;
    
    const checkboxStyle = isSelectionMode ? 'display: block;' : 'display: none;';
    const checkboxChecked = isSelected ? 'checked' : '';
    
    card.innerHTML = `
        <div class="rule-card-checkbox" style="${checkboxStyle} position: absolute; right: 10px; top: 10px; z-index: 10;">
            <input type="checkbox" ${checkboxChecked} style="width: 18px; height: 18px; cursor: pointer;">
        </div>
        <div class="card-title">${rule.name}</div>
        <div class="card-content-preview">${rule.regex}</div>
    `;
    
    // Bind events
    card.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') {
             toggleRuleSelection(rule.id);
             return;
        }

        if (isSelectionMode) {
            toggleRuleSelection(rule.id);
        } else {
            if (card.dataset.longPressFired === '1') {
                card.dataset.longPressFired = '0';
                return;
            }
            openRuleEditorModal(rule.id);
        }
    });
    
    addLongPressListener(card, () => {
        if (!isSelectionMode) deleteRenderingRule(rule.id);
    });
    
    return card;
}

function openRuleEditorModal(ruleId = null) {
    editingRuleId = ruleId;
    const modal = document.getElementById('rule-editor-modal');
    const title = document.getElementById('rule-editor-title');
    const nameInput = document.getElementById('rule-name-input');
    const categoryInput = document.getElementById('rule-category-input');
    const chatIdSelect = document.getElementById('rule-chat-id-select');
    const regexInput = document.getElementById('rule-regex-input');
    const templateInput = document.getElementById('rule-template-input');
    const enabledSwitch = document.getElementById('rule-enabled-switch');
    
    if (!modal || !title || !nameInput || !chatIdSelect || !regexInput || !templateInput || !enabledSwitch) return;

    const categories = getRendererCategories();
    updateRuleCategoryDropdown(categories);
    bindRuleEditorCategoryDropdown();
    hideRuleCategoryDropdown();

    // Populate Chat IDs
    chatIdSelect.innerHTML = '<option value="global">公用 (所有角色)</option>';
    getCharacterList().forEach(chat => {
        chatIdSelect.innerHTML += `<option value="${chat.id}">${chat.remarkName || chat.name || '未命名'}</option>`;
    });

    if (ruleId) {
        const rule = ensureRenderersStore().find(r => r.id === ruleId);
        if (rule) {
            title.textContent = '编辑规则';
            nameInput.value = rule.name;
            if (categoryInput) categoryInput.value = rule.category || '默认分类';
            chatIdSelect.value = rule.chatId;
            regexInput.value = rule.regex;
            templateInput.value = rule.template;
            enabledSwitch.checked = (rule.isEnabled === true || rule.isEnabled === 'true' || rule.isEnabled === 1 || rule.isEnabled === '1');
        } else {
            resetEditor(title, nameInput, categoryInput, chatIdSelect, regexInput, templateInput, enabledSwitch);
        }
    } else {
        resetEditor(title, nameInput, categoryInput, chatIdSelect, regexInput, templateInput, enabledSwitch);
    }

    modal.classList.add('visible');
}

function resetEditor(title, name, cat, chat, regex, tmpl, enabled) {
    title.textContent = '创建新规则';
    name.value = '';
    if (cat) cat.value = currentCategory || '默认分类';
    chat.value = 'global';
    regex.value = '';
    tmpl.value = '';
    enabled.checked = true;
}

function updateRuleCategoryDropdown(categories) {
    const dropdown = document.getElementById('rule-category-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('div');
        option.className = 'rule-category-option';
        option.dataset.value = cat;
        option.textContent = cat;
        option.addEventListener('click', () => {
            const input = document.getElementById('rule-category-input');
            if (input) input.value = cat;
            hideRuleCategoryDropdown();
        });
        dropdown.appendChild(option);
    });
}

function showRuleCategoryDropdown() {
    const dropdown = document.getElementById('rule-category-dropdown');
    if (dropdown) dropdown.classList.add('visible');
}

function hideRuleCategoryDropdown() {
    const dropdown = document.getElementById('rule-category-dropdown');
    if (dropdown) dropdown.classList.remove('visible');
}

function filterRuleCategoryDropdown(value) {
    const dropdown = document.getElementById('rule-category-dropdown');
    if (!dropdown) return;
    const keyword = value.trim().toLowerCase();
    const options = dropdown.querySelectorAll('.rule-category-option');
    options.forEach(option => {
        const text = option.dataset.value?.toLowerCase() || '';
        option.style.display = text.includes(keyword) ? '' : 'none';
    });
}

function bindRuleEditorCategoryDropdown() {
    if (isRuleEditorCategoryDropdownBound) return;
    const input = document.getElementById('rule-category-input');
    const dropdown = document.getElementById('rule-category-dropdown');
    if (!input || !dropdown) return;
    input.addEventListener('focus', () => showRuleCategoryDropdown());
    input.addEventListener('click', (e) => {
        e.stopPropagation();
        showRuleCategoryDropdown();
    });
    input.addEventListener('input', () => {
        filterRuleCategoryDropdown(input.value);
        showRuleCategoryDropdown();
    });
    document.addEventListener('click', (e) => {
        if (e.target === input || dropdown.contains(e.target)) return;
        hideRuleCategoryDropdown();
    });
    isRuleEditorCategoryDropdownBound = true;
}

function saveRenderingRule() {
    const name = document.getElementById('rule-name-input')?.value.trim();
    const regex = document.getElementById('rule-regex-input')?.value.trim();
    const category = document.getElementById('rule-category-input')?.value.trim() || '默认分类';

    if (!name || !regex) {
        alert('规则名称和正则表达式不能为空！');
        return;
    }
    try {
        new RegExp(regex);
    } catch (e) {
        alert(`正则表达式格式错误: ${e.message}`);
        return;
    }

    const ruleData = {
        id: editingRuleId || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        category,
        chatId: document.getElementById('rule-chat-id-select')?.value || 'global',
        regex,
        template: document.getElementById('rule-template-input')?.value || '',
        isEnabled: document.getElementById('rule-enabled-switch')?.checked ?? true
    };

    const rules = ensureRenderersStore();
    const existingIndex = rules.findIndex(r => r.id === ruleData.id);
    if (existingIndex >= 0) {
        rules[existingIndex] = ruleData;
    } else {
        rules.push(ruleData);
    }

    ruleCache = {};
    if (typeof saveData === 'function') saveData();
    document.getElementById('rule-editor-modal')?.classList.remove('visible');
    hideRuleCategoryDropdown();
    
    currentCategory = category;
    renderRulesList();
}

async function deleteRenderingRule(ruleId) {
    const confirmed = typeof showCustomConfirm === 'function'
        ? await showCustomConfirm('删除规则', '确定要删除这条渲染器吗？', { confirmButtonClass: 'btn-danger' })
        : confirm('确定要删除这条渲染器吗？');
    if (!confirmed) return;

    const rules = ensureRenderersStore();
    const nextRules = rules.filter(r => r.id !== ruleId);
    db.renderers = nextRules;
    ruleCache = {};
    if (typeof saveData === 'function') await saveData();
    renderRulesList();
}

function switchRuleCategory(categoryName) {
    currentCategory = categoryName;
    document.querySelectorAll('.rules-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.categoryName === categoryName);
    });
    document.querySelectorAll('.rules-category-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.categoryName === categoryName);
    });
}

function applyAdvancedRenderingRules(content, chatId) {
    if (!ruleCache[chatId]) {
        const applicableRules = ensureRenderersStore().filter(r => r.chatId === 'global' || r.chatId === chatId);
        ruleCache[chatId] = applicableRules.filter(r => r.isEnabled);
    }
    const rules = ruleCache[chatId];
    if (!rules || rules.length === 0) return content;

    const sortedRules = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    for (const rule of sortedRules) {
        try {
            const regex = new RegExp(rule.regex, 'g');
            if (regex.test(content)) {
                return content.replace(regex, rule.template);
            }
        } catch (e) {
            console.error(`渲染规则 [${rule.name}] 的正则表达式无效:`, e);
        }
    }

    return content;
}

function addLongPressListener(element, callback) {
    let pressTimer;
    const startPress = (e) => {
        pressTimer = window.setTimeout(() => {
            element.dataset.longPressFired = '1';
            callback(e);
        }, 500);
    };
    const cancelPress = () => clearTimeout(pressTimer);
    element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        startPress(e);
    });
    element.addEventListener('mouseup', cancelPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchstart', startPress, { passive: false });
    element.addEventListener('touchend', cancelPress);
    element.addEventListener('touchmove', cancelPress);
}

function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    selectedRuleIds.clear();
    
    const toolbar = document.getElementById('rules-batch-toolbar');
    if (toolbar) {
        if (isSelectionMode) {
            toolbar.style.display = 'flex';
            toolbar.classList.add('visible');
        } else {
            toolbar.style.display = 'none';
            toolbar.classList.remove('visible');
        }
    }
    
    renderRulesList();
}

function toggleRuleSelection(ruleId) {
    if (selectedRuleIds.has(ruleId)) {
        selectedRuleIds.delete(ruleId);
    } else {
        selectedRuleIds.add(ruleId);
    }
    
    const card = document.querySelector(`.rule-card[data-rule-id="${ruleId}"]`);
    if (card) {
        card.classList.toggle('selected', selectedRuleIds.has(ruleId));
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = selectedRuleIds.has(ruleId);
    }
    
    updateBatchToolbar();
}

function updateBatchToolbar() {
    const count = selectedRuleIds.size;
    const countEl = document.getElementById('batch-selected-count');
    if (countEl) countEl.textContent = count;
}

async function handleBatchDelete() {
    if (selectedRuleIds.size === 0) return;
    const confirmed = confirm(`确定要删除选中的 ${selectedRuleIds.size} 条规则吗？`);
    if (!confirmed) return;
    
    const rules = ensureRenderersStore();
    db.renderers = rules.filter(r => !selectedRuleIds.has(r.id));
    selectedRuleIds.clear();
    ruleCache = {};
    if (typeof saveData === 'function') await saveData();
    renderRulesList();
    toggleSelectionMode();
}

function getRendererCategories() {
    const rules = ensureRenderersStore();
    const categories = new Set();
    rules.forEach(r => {
        if (!r.category) r.category = '默认分类';
        categories.add(r.category);
    });
    if (categories.size === 0) categories.add('默认分类');
    const preferredOrder = ['全部', '未分类', '默认分类'];
    const sortedCategories = Array.from(categories).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const orderedCategories = [];
    preferredOrder.forEach(cat => {
        if (categories.has(cat)) orderedCategories.push(cat);
    });
    sortedCategories.forEach(cat => {
        if (!preferredOrder.includes(cat)) orderedCategories.push(cat);
    });
    return orderedCategories;
}

function openMoveCategoryModal() {
    if (selectedRuleIds.size === 0) return;
    const modal = document.getElementById('renderer-move-category-modal');
    const select = document.getElementById('renderer-move-select');
    const input = document.getElementById('renderer-move-input');
    if (!modal || !select || !input) return;
    const categories = getRendererCategories();
    select.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
    if (categories.includes(currentCategory)) {
        select.value = currentCategory;
    }
    input.value = '';
    modal.classList.add('visible');
}

function closeMoveCategoryModal() {
    const modal = document.getElementById('renderer-move-category-modal');
    const select = document.getElementById('renderer-move-select');
    const input = document.getElementById('renderer-move-input');
    if (input) input.value = '';
    if (select) select.selectedIndex = 0;
    if (modal) modal.classList.remove('visible');
}

async function handleBatchMove() {
    openMoveCategoryModal();
}

async function confirmBatchMove() {
    if (selectedRuleIds.size === 0) {
        closeMoveCategoryModal();
        return;
    }
    const input = document.getElementById('renderer-move-input');
    const select = document.getElementById('renderer-move-select');
    const inputValue = input?.value.trim() || '';
    const selectValue = select?.value.trim() || '';
    const catName = inputValue || selectValue;
    if (!catName) {
        closeMoveCategoryModal();
        return;
    }
    const rules = ensureRenderersStore();
    let count = 0;
    rules.forEach(r => {
        if (selectedRuleIds.has(r.id)) {
            r.category = catName;
            count++;
        }
    });
    
    if (count > 0) {
        if (typeof saveData === 'function') await saveData();
        selectedRuleIds.clear();
        currentCategory = catName;
        renderRulesList();
        toggleSelectionMode();
    }
    closeMoveCategoryModal();
}

function handleBatchSelectAll() {
    const rules = ensureRenderersStore();
    const targetRules = rules.filter(r => r.category === currentCategory);
    
    const targetIds = targetRules.map(r => r.id);
    const allSelected = targetIds.length > 0 && targetIds.every(id => selectedRuleIds.has(id));
    
    if (allSelected) {
        targetIds.forEach(id => selectedRuleIds.delete(id));
    } else {
        targetIds.forEach(id => selectedRuleIds.add(id));
    }
    
    renderRulesList();
}

function bindRenderingRulesUI() {
    if (isRenderingRulesUIBound) return;
    const tabsContainer = document.getElementById('rules-tabs');
    const addBtn = document.getElementById('add-new-rule-btn');
    const cancelBtn = document.getElementById('cancel-rule-editor-btn');
    const saveBtn = document.getElementById('save-rule-btn');
    const backBtn = document.getElementById('renderer-back-btn');
    const manageBtn = document.getElementById('manage-categories-btn');
    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    const batchMoveBtn = document.getElementById('batch-move-btn');
    const batchCancelBtn = document.getElementById('batch-cancel-btn');
    const batchSelectAllBtn = document.getElementById('batch-select-all-btn');
    const moveCancelBtn = document.getElementById('renderer-move-cancel');
    const moveConfirmBtn = document.getElementById('renderer-move-confirm');

    if (addBtn) addBtn.addEventListener('click', () => openRuleEditorModal(null));
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        document.getElementById('rule-editor-modal')?.classList.remove('visible');
        hideRuleCategoryDropdown();
    });
    if (saveBtn) saveBtn.addEventListener('click', saveRenderingRule);
    if (backBtn) backBtn.addEventListener('click', () => switchScreen('home-container'));
    
    if (manageBtn) manageBtn.addEventListener('click', toggleSelectionMode);
    
    if (batchDeleteBtn) batchDeleteBtn.addEventListener('click', handleBatchDelete);
    if (batchMoveBtn) batchMoveBtn.addEventListener('click', handleBatchMove);
    if (batchCancelBtn) batchCancelBtn.addEventListener('click', toggleSelectionMode);
    if (batchSelectAllBtn) batchSelectAllBtn.addEventListener('click', handleBatchSelectAll);
    if (moveCancelBtn) moveCancelBtn.addEventListener('click', closeMoveCategoryModal);
    if (moveConfirmBtn) moveConfirmBtn.addEventListener('click', confirmBatchMove);

    isRenderingRulesUIBound = true;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindRenderingRulesUI);
} else {
    setTimeout(bindRenderingRulesUI, 0);
}

window.openRenderingRulesScreen = openRenderingRulesScreen;
window.applyRenderingRules = applyAdvancedRenderingRules;
window.applyAdvancedRenderingRules = applyAdvancedRenderingRules;
