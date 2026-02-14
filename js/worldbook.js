let worldBookListContainer = null;
let noWorldBooksPlaceholder = null;
let addWorldBookBtn = null;
let editWorldBookForm = null;
let worldBookIdInput = null;
let worldBookNameInput = null;
let worldBookContentInput = null;
let linkWorldBookBtn = null;
let worldBookSelectionModal = null;
let worldBookSelectionList = null;
let saveWorldBookSelectionBtn = null;
let linkGroupWorldBookBtn = null;
let importWorldBookBtn = null;
let worldBookImportInput = null;
let worldBookBindingsReady = false;

function cacheWorldBookElements() {
    if (!worldBookListContainer) worldBookListContainer = document.getElementById('world-book-list-container');
    if (!noWorldBooksPlaceholder) noWorldBooksPlaceholder = document.getElementById('no-world-books-placeholder');
    if (!addWorldBookBtn) addWorldBookBtn = document.getElementById('add-world-book-btn');
    if (!editWorldBookForm) editWorldBookForm = document.getElementById('edit-world-book-form');
    if (!worldBookIdInput) worldBookIdInput = document.getElementById('world-book-id');
    if (!worldBookNameInput) worldBookNameInput = document.getElementById('world-book-name');
    if (!worldBookContentInput) worldBookContentInput = document.getElementById('world-book-content');
    if (!linkWorldBookBtn) linkWorldBookBtn = document.getElementById('link-world-book-btn');
    if (!worldBookSelectionModal) worldBookSelectionModal = document.getElementById('world-book-selection-modal');
    if (!worldBookSelectionList) worldBookSelectionList = document.getElementById('world-book-selection-list');
    if (!saveWorldBookSelectionBtn) saveWorldBookSelectionBtn = document.getElementById('save-world-book-selection-btn');
    if (!linkGroupWorldBookBtn) linkGroupWorldBookBtn = document.getElementById('link-group-world-book-btn');
    if (!importWorldBookBtn) importWorldBookBtn = document.getElementById('import-world-book-btn');
    if (!worldBookImportInput) worldBookImportInput = document.getElementById('world-book-import-input');
}

function populateCategorySelect(selectedCategoryId = 'uncategorized') {
    const selectEl = document.getElementById('world-book-category-select');
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="uncategorized">未分类</option>';

    if (db && Array.isArray(db.worldBookCategories)) {
        db.worldBookCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            selectEl.appendChild(option);
        });
    }

    selectEl.value = selectedCategoryId;
}

function setupWorldBookCategorySystem() {
    cacheWorldBookElements();
    if (!db.worldBookCategories) db.worldBookCategories = [];
    if (db.uncategorizedCollapsed === undefined) db.uncategorizedCollapsed = false;
    if (Array.isArray(db.worldBooks)) {
        db.worldBooks.forEach(book => {
            if (book.categoryId === undefined) {
                book.categoryId = 'uncategorized';
            }
        });
    }

    const addCategoryBtn = document.getElementById('add-world-book-category-btn');
    const addCategoryModal = document.getElementById('add-category-modal');
    const addCategoryForm = document.getElementById('add-category-form');
    const categoryNameInput = document.getElementById('category-name-input');
    if (!addCategoryBtn || !addCategoryModal || !addCategoryForm || !categoryNameInput || !worldBookListContainer) return;

    addCategoryBtn.addEventListener('click', () => {
        addCategoryForm.reset();
        addCategoryModal.classList.add('visible');
    });

    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = categoryNameInput.value.trim();
        if (name) {
            db.worldBookCategories.push({
                id: `cat_${Date.now()}`,
                name: name,
                isCollapsed: false
            });
            await saveData();
            renderWorldBookList();
            showToast(`分类“${name}”已创建`);
            addCategoryModal.classList.remove('visible');
        }
    });

    worldBookListContainer.addEventListener('click', async (e) => {
        const categoryHeader = e.target.closest('.category-header');
        if (!categoryHeader) return;

        const categoryWrapper = categoryHeader.parentElement;
        const categoryId = categoryWrapper.dataset.id;

        if (categoryId === 'uncategorized') {
            db.uncategorizedCollapsed = !db.uncategorizedCollapsed;
            categoryWrapper.classList.toggle('collapsed', db.uncategorizedCollapsed);
            await saveData();
        } else {
            const category = db.worldBookCategories.find(cat => cat.id === categoryId);
            if (category) {
                category.isCollapsed = !category.isCollapsed;
                categoryWrapper.classList.toggle('collapsed', category.isCollapsed);
                await saveData();
            }
        }
    });

    const handleLongPress = (targetElement, clientX, clientY) => {
        const categoryId = targetElement.dataset.id;
        let menuItems = [];

        if (categoryId === 'uncategorized') {
            menuItems.push({
                label: '删除此分类中的所有条目',
                danger: true,
                action: async () => {
                    if (confirm('此操作将永久删除“未分类”中的所有世界书条目，确定吗？')) {
                        db.worldBooks = db.worldBooks.filter(book => book.categoryId !== 'uncategorized');
                        await saveData();
                        renderWorldBookList();
                        showToast('“未分类”条目已全部删除');
                    }
                }
            });
        } else {
            const category = db.worldBookCategories.find(cat => cat.id === categoryId);
            if (category) {
                menuItems.push({
                    label: '删除分类及其中所有条目',
                    danger: true,
                    action: async () => {
                        const booksInCategoryCount = db.worldBooks.filter(book => book.categoryId === categoryId).length;
                        if (confirm(`此操作将永久删除分类“${category.name}”以及其中的 ${booksInCategoryCount} 个条目，此操作不可撤销。\n确定要继续吗？`)) {
                            db.worldBooks = db.worldBooks.filter(book => book.categoryId !== categoryId);
                            db.worldBookCategories = db.worldBookCategories.filter(cat => cat.id !== categoryId);
                            await saveData();
                            renderWorldBookList();
                            showToast(`分类“${category.name}”及其内容已删除`);
                        }
                    }
                });
            }
        }
        if (menuItems.length > 0) {
            createContextMenu(menuItems, clientX, clientY);
        }
    };

    worldBookListContainer.addEventListener('contextmenu', e => {
        const categoryWrapper = e.target.closest('.world-book-category');
        if (categoryWrapper) {
            e.preventDefault();
            handleLongPress(categoryWrapper, e.clientX, e.clientY);
        }
    });

    worldBookListContainer.addEventListener('touchstart', (e) => {
        const categoryWrapper = e.target.closest('.world-book-category');
        if (categoryWrapper) {
            longPressTimer = setTimeout(() => {
                const touch = e.touches[0];
                handleLongPress(categoryWrapper, touch.clientX, touch.clientY);
            }, 500);
        }
    });
    worldBookListContainer.addEventListener('touchend', () => clearTimeout(longPressTimer));
    worldBookListContainer.addEventListener('touchmove', () => clearTimeout(longPressTimer));
}

function setupWorldBookApp() {
    cacheWorldBookElements();
    setupWorldBookCategorySystem();
    if (!worldBookListContainer || !addWorldBookBtn || !editWorldBookForm) return;

    if (importWorldBookBtn && worldBookImportInput) {
        importWorldBookBtn.addEventListener('click', () => {
            worldBookImportInput.click();
        });
        worldBookImportInput.addEventListener('change', handleWorldBookImport);
    }

    addWorldBookBtn.addEventListener('click', () => {
        currentEditingWorldBookId = null;
        editWorldBookForm.reset();
        document.querySelector('input[name="world-book-position"][value="before"]').checked = true;
        populateCategorySelect();
        switchScreen('edit-world-book-screen');
    });

    editWorldBookForm.onsubmit = async function(e) {
        e.preventDefault();
        const selectedCategoryId = document.getElementById('world-book-category-select').value;
        const name = worldBookNameInput.value.trim();
        const content = worldBookContentInput.value.trim();
        const position = document.querySelector('input[name="world-book-position"]:checked').value;
        const keywords = document.getElementById('world-book-keywords').value.trim();
        const alwaysActive = document.getElementById('world-book-always-active').checked;
        const caseSensitive = document.getElementById('world-book-case-sensitive').checked;

        if (!name || !content) return showToast('名称和内容不能为空');

        const bookData = { name, content, position, categoryId: selectedCategoryId, keywords, alwaysActive, caseSensitive };

        if (currentEditingWorldBookId) {
            const book = db.worldBooks.find(wb => wb.id === currentEditingWorldBookId);
            if (book) Object.assign(book, bookData);
        } else {
            bookData.id = `wb_${Date.now()}`;
            db.worldBooks.push(bookData);
        }

        await saveData();
        showToast('世界书条目已保存');
        renderWorldBookList();
        switchScreen('world-book-screen');
    };

    worldBookListContainer.addEventListener('click', e => {
        const item = e.target.closest('.world-book-item');
        if (item) {
            const book = db.worldBooks.find(wb => wb.id === item.dataset.id);
            if (book) {
                currentEditingWorldBookId = book.id;
                worldBookIdInput.value = book.id;
                worldBookNameInput.value = book.name;
                worldBookContentInput.value = book.content;
                document.querySelector(`input[name="world-book-position"][value="${book.position}"]`).checked = true;
                populateCategorySelect(book.categoryId || 'uncategorized');
                document.getElementById('world-book-keywords').value = book.keywords || '';
                document.getElementById('world-book-always-active').checked = book.alwaysActive || false;
                document.getElementById('world-book-case-sensitive').checked = book.caseSensitive || false;
                switchScreen('edit-world-book-screen');
            }
        }
    });

    worldBookListContainer.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const item = e.target.closest('.world-book-item');
        if (!item) return;
        longPressTimer = setTimeout(() => {
            const bookId = item.dataset.id;
            const menuItems = [{
                label: '删除',
                danger: true,
                action: async () => {
                    if (confirm('确定要删除这个世界书条目吗？')) {
                        db.worldBooks = db.worldBooks.filter(wb => wb.id !== bookId);
                        db.characters.forEach(char => {
                            char.worldBookIds = (char.worldBookIds || []).filter(id => id !== bookId);
                        });
                        db.groups.forEach(group => {
                            group.worldBookIds = (group.worldBookIds || []).filter(id => id !== bookId);
                        });
                        await saveData();
                        renderWorldBookList();
                        showToast('条目已删除');
                    }
                }
            }];
            createContextMenu(menuItems, e.clientX, e.clientY);
        }, 500);
    });

    worldBookListContainer.addEventListener('mouseup', () => clearTimeout(longPressTimer));
    worldBookListContainer.addEventListener('mouseleave', () => clearTimeout(longPressTimer));

    bindWorldBookSelectionHandlers();
}

function renderWorldBookList() {
    cacheWorldBookElements();
    if (!worldBookListContainer || !noWorldBooksPlaceholder) return;

    worldBookListContainer.innerHTML = '';
    const hasContent = db.worldBooks.length > 0 || db.worldBookCategories.length > 0;
    noWorldBooksPlaceholder.style.display = hasContent ? 'none' : 'block';

    const renderBooks = (books) => {
        let html = '';
        books.forEach(book => {
            html += `
                <li class="list-item world-book-item" data-id="${book.id}">
                    <div class="item-details" style="padding-left: 20px;">
                        <div class="item-name">${escapeHTML(book.name)}</div>
                        <div class="item-preview">${escapeHTML(book.content)}</div>
                    </div>
                </li>`;
        });
        return html;
    };

    db.worldBookCategories.forEach(cat => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'world-book-category';
        categoryDiv.dataset.id = cat.id;
        if (cat.isCollapsed) {
            categoryDiv.classList.add('collapsed');
        }

        const booksInCategory = db.worldBooks.filter(b => b.categoryId === cat.id);

        categoryDiv.innerHTML = `
            <div class="category-header">
                <span class="category-name">${cat.name} (${booksInCategory.length})</span>
                <span class="category-toggle-icon">▼</span>
            </div>
            <ul class="category-book-list">
                ${renderBooks(booksInCategory)}
            </ul>
        `;
        worldBookListContainer.appendChild(categoryDiv);
    });

    const uncategorizedBooks = db.worldBooks.filter(b => b.categoryId === 'uncategorized');
    if (uncategorizedBooks.length > 0) {
        const uncategorizedDiv = document.createElement('div');
        uncategorizedDiv.className = 'world-book-category';
        uncategorizedDiv.dataset.id = 'uncategorized';
        if (db.uncategorizedCollapsed) {
            uncategorizedDiv.classList.add('collapsed');
        }

        uncategorizedDiv.innerHTML = `
            <div class="category-header" id="uncategorized-header">
                <span class="category-name">未分类 (${uncategorizedBooks.length})</span>
                <span class="category-toggle-icon">▼</span>
            </div>
            <ul class="category-book-list">
                ${renderBooks(uncategorizedBooks)}
            </ul>
        `;
        worldBookListContainer.appendChild(uncategorizedDiv);
    }
}

async function handleWorldBookImport(event) {
    const files = event.target.files;
    if (!files.length) return;

    let importedFileCount = 0;
    let errorFileCount = 0;

    showToast(`检测到 ${files.length} 个文件，开始导入...`);

    for (const file of files) {
        try {
            const content = await file.text();
            const data = JSON.parse(content);

            if (data.prompts && Array.isArray(data.prompts)) {
                parseMoMPsyFormat(file.name, data);
                importedFileCount++;
            } else if (data.entries && typeof data.entries === 'object') {
                parseAuroraTheaterFormat(file.name, data);
                importedFileCount++;
            } else {
                throw new Error('无法识别的文件格式');
            }
        } catch (err) {
            console.error(`导入文件 ${file.name} 失败:`, err);
            errorFileCount++;
        }
    }

    if (importedFileCount > 0) {
        await saveData();
        renderWorldBookList();
        showToast(`成功导入 ${importedFileCount} 个文件！`);
    }
    if (errorFileCount > 0) {
        showToast(`${errorFileCount} 个文件导入失败，详情请查看控制台。`);
    }

    event.target.value = null;
}

function parseMoMPsyFormat(fileName, data) {
    const categoryName = fileName.replace(/\.json$/i, '');
    let category = db.worldBookCategories.find(cat => cat.name === categoryName);

    if (!category) {
        category = {
            id: `cat_import_${Date.now()}_${Math.random()}`,
            name: categoryName,
            isCollapsed: false
        };
        db.worldBookCategories.push(category);
    }

    data.prompts.forEach(prompt => {
        if (prompt.name && prompt.content) {
            const newEntry = {
                id: `wb_import_${Date.now()}_${Math.random()}`,
                name: prompt.name,
                content: prompt.content,
                categoryId: category.id,
                position: 'before',
                keywords: '',
                alwaysActive: false,
                caseSensitive: false
            };
            db.worldBooks.push(newEntry);
        }
    });
}

function parseAuroraTheaterFormat(fileName, data) {
    const categoryName = fileName.replace(/\.json$/i, '').replace(/3\.0\.0_Ver_|\.json极光小剧场 3\.0\.0 Ver @电波系/g, '').trim();
    let category = db.worldBookCategories.find(cat => cat.name === categoryName);

    if (!category) {
        category = {
            id: `cat_import_${Date.now()}_${Math.random()}`,
            name: categoryName || '导入的极光小剧场',
            isCollapsed: false
        };
        db.worldBookCategories.push(category);
    }

    Object.values(data.entries).forEach(entry => {
        if (entry.comment && entry.content) {
            const newEntry = {
                id: `wb_import_${Date.now()}_${Math.random()}`,
                name: entry.comment,
                content: entry.content,
                categoryId: category.id,
                position: 'before',
                keywords: entry.key ? entry.key.join(',') : '',
                alwaysActive: false,
                caseSensitive: false
            };
            db.worldBooks.push(newEntry);
        }
    });
}

function bindWorldBookSelectionHandlers() {
    if (worldBookBindingsReady) return;
    cacheWorldBookElements();
    if (!worldBookSelectionList || !worldBookSelectionModal || !saveWorldBookSelectionBtn) return;

    if (linkWorldBookBtn) {
        linkWorldBookBtn.addEventListener('click', () => {
            const character = db.characters.find(c => c.id === currentChatId);
            if (!character) return;
            worldBookSelectionList.innerHTML = '';

            const groups = {};
            (db.worldBooks || []).forEach(book => {
                const categoryId = book.categoryId || 'uncategorized';
                if (!groups[categoryId]) {
                    groups[categoryId] = [];
                }
                groups[categoryId].push(book);
            });

            (db.worldBookCategories || []).forEach(category => {
                const booksInCategory = groups[category.id] || [];
                if (booksInCategory.length === 0) return;

                const selectedIds = character.worldBookIds || [];
                const allInCategorySelected = booksInCategory.every(book => selectedIds.includes(book.id));
                const someInCategorySelected = booksInCategory.some(book => selectedIds.includes(book.id));

                const categoryHeader = document.createElement('li');
                categoryHeader.className = 'world-book-category-header';
                categoryHeader.innerHTML = `
                    <div class="world-book-category-title" data-category-id="${category.id}" style="display: flex; align-items: center; gap: 8px; padding: 10px; cursor: pointer; user-select: none; background: #f5f5f5; border-radius: 6px; margin-bottom: 5px;">
                        <svg class="world-book-category-arrow" data-category-id="${category.id}" viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; transition: transform 0.3s; transform: rotate(0deg);">
                            <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                        </svg>
                        <input type="checkbox" id="wb-cat-select-${category.id}" data-category-id="${category.id}" class="world-book-category-checkbox" ${allInCategorySelected ? 'checked' : ''} ${someInCategorySelected && !allInCategorySelected ? 'indeterminate' : ''}>
                        <label for="wb-cat-select-${category.id}" style="flex: 1; cursor: pointer; font-weight: 600;">
                            [ 分 类 ] ${category.name} (${booksInCategory.length}条)
                        </label>
                    </div>
                `;
                worldBookSelectionList.appendChild(categoryHeader);

                const itemsContainer = document.createElement('li');
                itemsContainer.className = 'world-book-category-items';
                itemsContainer.setAttribute('data-category-id', category.id);
                itemsContainer.style.display = 'none';
                itemsContainer.style.paddingLeft = '30px';
                itemsContainer.style.marginBottom = '10px';

                booksInCategory.forEach(book => {
                    const isChecked = selectedIds.includes(book.id);
                    const itemLi = document.createElement('div');
                    itemLi.className = 'world-book-select-item';
                    itemLi.style.padding = '6px 0';
                    const bookNamePreview = book.name || (book.content ? book.content.substring(0, 30) + '...' : '未命名条目');
                    itemLi.innerHTML = `
                        <input type="checkbox" id="wb-select-${book.id}" value="${book.id}" class="world-book-item-checkbox" data-category-id="${category.id}" ${isChecked ? 'checked' : ''}>
                        <label for="wb-select-${book.id}" style="cursor: pointer;">${bookNamePreview}</label>
                    `;
                    itemsContainer.appendChild(itemLi);
                });

                worldBookSelectionList.appendChild(itemsContainer);

                const categoryTitle = categoryHeader.querySelector('.world-book-category-title');
                const arrow = categoryHeader.querySelector('.world-book-category-arrow');
                const categoryCheckbox = categoryHeader.querySelector(`#wb-cat-select-${category.id}`);
                const categoryLabel = categoryHeader.querySelector(`label[for="wb-cat-select-${category.id}"]`);

                if (categoryCheckbox) {
                    categoryCheckbox.addEventListener('click', (e) => e.stopPropagation());
                }
                if (categoryLabel) {
                    categoryLabel.addEventListener('click', (e) => e.stopPropagation());
                }

                categoryTitle.addEventListener('click', (e) => {
                    if (e.target === categoryCheckbox || e.target === categoryLabel || e.target.closest('input') || e.target.closest('label')) {
                        return;
                    }
                    const isExpanded = itemsContainer.style.display !== 'none';
                    itemsContainer.style.display = isExpanded ? 'none' : 'block';
                    arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
                });

                categoryCheckbox.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    itemsContainer.querySelectorAll(`.world-book-item-checkbox[data-category-id="${category.id}"]`).forEach(itemCheckbox => {
                        itemCheckbox.checked = isChecked;
                    });
                    updateCategoryCheckboxState(category.id);
                });

                itemsContainer.querySelectorAll(`.world-book-item-checkbox[data-category-id="${category.id}"]`).forEach(itemCheckbox => {
                    itemCheckbox.addEventListener('change', () => {
                        updateCategoryCheckboxState(category.id);
                    });
                });
            });

            const uncategorizedBooks = groups['uncategorized'] || [];
            if (uncategorizedBooks.length > 0) {
                const separator = document.createElement('li');
                separator.innerHTML = `<h4 style="margin: 15px 0 5px; color: #888;">未分类条目</h4>`;
                worldBookSelectionList.appendChild(separator);

                const selectedIds = character.worldBookIds || [];
                uncategorizedBooks.forEach(book => {
                    const isChecked = selectedIds.includes(book.id);
                    const li = document.createElement('li');
                    li.className = 'world-book-select-item';
                    li.style.paddingLeft = '20px';
                    const bookNamePreview = book.name || (book.content ? book.content.substring(0, 30) + '...' : '未命名条目');
                    li.innerHTML = `
                        <input type="checkbox" id="wb-select-${book.id}" value="${book.id}" class="world-book-item-checkbox" ${isChecked ? 'checked' : ''}>
                        <label for="wb-select-${book.id}" style="cursor: pointer;">${bookNamePreview}</label>
                    `;
                    worldBookSelectionList.appendChild(li);
                });
            }

            function updateCategoryCheckboxState(categoryId) {
                const categoryCheckbox = document.getElementById(`wb-cat-select-${categoryId}`);
                if (!categoryCheckbox) return;
                const itemsContainer = worldBookSelectionList.querySelector(`.world-book-category-items[data-category-id="${categoryId}"]`);
                if (!itemsContainer) return;
                const itemCheckboxes = itemsContainer.querySelectorAll(`.world-book-item-checkbox[data-category-id="${categoryId}"]`);
                const checkedCount = Array.from(itemCheckboxes).filter(cb => cb.checked).length;
                const totalCount = itemCheckboxes.length;

                if (checkedCount === 0) {
                    categoryCheckbox.checked = false;
                    categoryCheckbox.indeterminate = false;
                } else if (checkedCount === totalCount) {
                    categoryCheckbox.checked = true;
                    categoryCheckbox.indeterminate = false;
                } else {
                    categoryCheckbox.checked = false;
                    categoryCheckbox.indeterminate = true;
                }
            }

            worldBookSelectionModal.classList.add('visible');
        });
    }

    if (linkGroupWorldBookBtn) {
        linkGroupWorldBookBtn.addEventListener('click', () => {
            const group = db.groups.find(g => g.id === currentChatId);
            if (!group) return;
            worldBookSelectionList.innerHTML = '';

            const groups = {};
            (db.worldBooks || []).forEach(book => {
                const categoryId = book.categoryId || 'uncategorized';
                if (!groups[categoryId]) {
                    groups[categoryId] = [];
                }
                groups[categoryId].push(book);
            });

            (db.worldBookCategories || []).forEach(category => {
                const booksInCategory = groups[category.id] || [];
                if (booksInCategory.length === 0) return;

                const selectedIds = group.worldBookIds || [];
                const allInCategorySelected = booksInCategory.every(book => selectedIds.includes(book.id));
                const someInCategorySelected = booksInCategory.some(book => selectedIds.includes(book.id));

                const categoryHeader = document.createElement('li');
                categoryHeader.className = 'world-book-category-header';
                categoryHeader.innerHTML = `
                    <div class="world-book-category-title" data-category-id="${category.id}" style="display: flex; align-items: center; gap: 8px; padding: 10px; cursor: pointer; user-select: none; background: #f5f5f5; border-radius: 6px; margin-bottom: 5px;">
                        <svg class="world-book-category-arrow" data-category-id="${category.id}" viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; transition: transform 0.3s; transform: rotate(0deg);">
                            <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                        </svg>
                        <input type="checkbox" id="wb-cat-select-group-${category.id}" data-category-id="${category.id}" class="world-book-category-checkbox" ${allInCategorySelected ? 'checked' : ''} ${someInCategorySelected && !allInCategorySelected ? 'indeterminate' : ''}>
                        <label for="wb-cat-select-group-${category.id}" style="flex: 1; cursor: pointer; font-weight: 600;">
                            [ 分 类 ] ${category.name} (${booksInCategory.length}条)
                        </label>
                    </div>
                `;
                worldBookSelectionList.appendChild(categoryHeader);

                const itemsContainer = document.createElement('li');
                itemsContainer.className = 'world-book-category-items';
                itemsContainer.setAttribute('data-category-id', category.id);
                itemsContainer.style.display = 'none';
                itemsContainer.style.paddingLeft = '30px';
                itemsContainer.style.marginBottom = '10px';

                booksInCategory.forEach(book => {
                    const isChecked = selectedIds.includes(book.id);
                    const itemLi = document.createElement('div');
                    itemLi.className = 'world-book-select-item';
                    itemLi.style.padding = '6px 0';
                    const bookNamePreview = book.name || (book.content ? book.content.substring(0, 30) + '...' : '未命名条目');
                    itemLi.innerHTML = `
                        <input type="checkbox" id="wb-select-group-${book.id}" value="${book.id}" class="world-book-item-checkbox" data-category-id="${category.id}" ${isChecked ? 'checked' : ''}>
                        <label for="wb-select-group-${book.id}" style="cursor: pointer;">${bookNamePreview}</label>
                    `;
                    itemsContainer.appendChild(itemLi);
                });

                worldBookSelectionList.appendChild(itemsContainer);

                const categoryTitle = categoryHeader.querySelector('.world-book-category-title');
                const arrow = categoryHeader.querySelector('.world-book-category-arrow');
                const categoryCheckbox = categoryHeader.querySelector(`#wb-cat-select-group-${category.id}`);
                const categoryLabel = categoryHeader.querySelector(`label[for="wb-cat-select-group-${category.id}"]`);

                if (categoryCheckbox) {
                    categoryCheckbox.addEventListener('click', (e) => e.stopPropagation());
                }
                if (categoryLabel) {
                    categoryLabel.addEventListener('click', (e) => e.stopPropagation());
                }

                categoryTitle.addEventListener('click', (e) => {
                    if (e.target === categoryCheckbox || e.target === categoryLabel || e.target.closest('input') || e.target.closest('label')) {
                        return;
                    }
                    const isExpanded = itemsContainer.style.display !== 'none';
                    itemsContainer.style.display = isExpanded ? 'none' : 'block';
                    arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
                });

                categoryCheckbox.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    itemsContainer.querySelectorAll(`.world-book-item-checkbox[data-category-id="${category.id}"]`).forEach(itemCheckbox => {
                        itemCheckbox.checked = isChecked;
                    });
                    updateCategoryCheckboxState(category.id, 'group');
                });

                itemsContainer.querySelectorAll(`.world-book-item-checkbox[data-category-id="${category.id}"]`).forEach(itemCheckbox => {
                    itemCheckbox.addEventListener('change', () => {
                        updateCategoryCheckboxState(category.id, 'group');
                    });
                });
            });

            const uncategorizedBooks = groups['uncategorized'] || [];
            if (uncategorizedBooks.length > 0) {
                const separator = document.createElement('li');
                separator.innerHTML = `<h4 style="margin: 15px 0 5px; color: #888;">未分类条目</h4>`;
                worldBookSelectionList.appendChild(separator);

                const selectedIds = group.worldBookIds || [];
                uncategorizedBooks.forEach(book => {
                    const isChecked = selectedIds.includes(book.id);
                    const li = document.createElement('li');
                    li.className = 'world-book-select-item';
                    li.style.paddingLeft = '20px';
                    const bookNamePreview = book.name || (book.content ? book.content.substring(0, 30) + '...' : '未命名条目');
                    li.innerHTML = `
                        <input type="checkbox" id="wb-select-group-${book.id}" value="${book.id}" class="world-book-item-checkbox" ${isChecked ? 'checked' : ''}>
                        <label for="wb-select-group-${book.id}" style="cursor: pointer;">${bookNamePreview}</label>
                    `;
                    worldBookSelectionList.appendChild(li);
                });
            }

            function updateCategoryCheckboxState(categoryId, prefix = '') {
                const checkboxId = prefix ? `wb-cat-select-${prefix}-${categoryId}` : `wb-cat-select-${categoryId}`;
                const categoryCheckbox = document.getElementById(checkboxId);
                if (!categoryCheckbox) return;
                const itemsContainer = worldBookSelectionList.querySelector(`.world-book-category-items[data-category-id="${categoryId}"]`);
                if (!itemsContainer) return;
                const itemCheckboxes = itemsContainer.querySelectorAll(`.world-book-item-checkbox[data-category-id="${categoryId}"]`);
                const checkedCount = Array.from(itemCheckboxes).filter(cb => cb.checked).length;
                const totalCount = itemCheckboxes.length;

                if (checkedCount === 0) {
                    categoryCheckbox.checked = false;
                    categoryCheckbox.indeterminate = false;
                } else if (checkedCount === totalCount) {
                    categoryCheckbox.checked = true;
                    categoryCheckbox.indeterminate = false;
                } else {
                    categoryCheckbox.checked = false;
                    categoryCheckbox.indeterminate = true;
                }
            }

            worldBookSelectionModal.classList.add('visible');
        });
    }

    saveWorldBookSelectionBtn.addEventListener('click', async () => {
        const selectedIds = [];
        worldBookSelectionList.querySelectorAll('.world-book-item-checkbox:checked').forEach(checkbox => {
            if (checkbox.value) {
                selectedIds.push(checkbox.value);
            }
        });

        const finalSelectedIds = selectedIds;
        if (currentChatType === 'private') {
            const character = db.characters.find(c => c.id === currentChatId);
            if (character) character.worldBookIds = finalSelectedIds;
        } else if (currentChatType === 'group') {
            const group = db.groups.find(g => g.id === currentChatId);
            if (group) group.worldBookIds = finalSelectedIds;
        }
        await saveData();
        worldBookSelectionModal.classList.remove('visible');
        showToast('世界书关联已更新');
    });

    worldBookBindingsReady = true;
}
