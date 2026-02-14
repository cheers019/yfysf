const defaultIcons = {
    'chat-list-screen': {name: '404', url: 'https://i.postimg.cc/VvQB8dQT/chan-143.png'},
    'api-settings-screen': {name: 'api', url: 'https://i.postimg.cc/50FqT8GL/chan-125.png'},
    'wallpaper-screen': {name: '壁纸', url: 'https://i.postimg.cc/3wqFttL3/chan-90.png'},
    'world-book-screen': {name: '世界书', url: 'https://i.postimg.cc/prCWkrKT/chan-74.png'},
    'customize-screen': {name: '自定义', url: 'https://i.postimg.cc/vZVdC7gt/chan-133.png'},
    'font-settings-screen': {name: '字体', url: 'https://i.postimg.cc/FzVtC0x4/chan-21.png'},
    'tutorial-screen': {name: '教程', url: 'https://i.postimg.cc/6QgNzCFf/chan-118.png'},
    'rendering-rules-screen': {name: '渲染器', url: 'https://i.postimg.cc/8CJ4gCFx/chan-109.png'},
    'ai-character-select-screen': {name: 'AI手机', url: 'https://i.postimg.cc/9Q8B2X3D/chan-101.png'},
    'mall-screen': {name: '商城', url: 'https://i.postimg.cc/PqYkx23B/shop-icon.png'},
    'soul-bond-app-icon': {name: '心灵羁绊', url: 'https://i.postimg.cc/P5pQd2Xp/image.png'},
    'day-mode-btn': {name: '', url: 'https://i.postimg.cc/Jz0tYqnT/chan-145.png'},
    'night-mode-btn': {name: '', url: 'https://i.postimg.cc/htYvkdQK/chan-146.png'},
    'record-label': { name: '唱片标签 (圆形)', url: 'https://i.postimg.cc/nzP9sgxr/chan-125.png' },
    'record-sleeve': { name: '唱片封套 (方形)', url: 'https://i.postimg.cc/KzC3q4w3/image.png' },
    'decorative-component': { name: '装饰组件 (方形)', url: '' },
    'ai-space-peek-messages': { name: '消息', icon: 'https://i.postimg.cc/Kvs4tDh5/export202509181826424260.png' },
    'ai-space-peek-memos': { name: '备忘录', icon: 'https://i.postimg.cc/JzD0xH1C/export202509181829064550.png' },
    'ai-space-peek-cart': { name: '购物车', icon: 'https://i.postimg.cc/pLwT6VTh/export202509181830143960.png' },
    'ai-space-peek-transfer': { name: '中转站', icon: 'https://i.postimg.cc/63wQBHCB/export202509181831140230.png' },
    'ai-space-peek-browser': { name: '浏览器', icon: 'https://i.postimg.cc/SKcsF02Z/export202509181830445980.png' },
    'ai-space-peek-album': { name: '相册', icon: 'https://i.postimg.cc/qBcdpqNc/export202509221549335970.png' },
    'ai-space-peek-unlock': { name: 'unlock！', icon: 'https://i.postimg.cc/28zNyYWs/export202509221542593320.png' },
    'ai-space-peek-signal': { name: '心动讯号', icon: 'https://i.postimg.cc/tJ0g1C0m/heart.png' },
    'ai-space-peek-music': { name: '音乐', icon: 'https://i.postimg.cc/d10J4VzR/image.png' },
};
window.defaultIcons = defaultIcons;

function applyGlobalCss(css) {
    const styleId = 'global-custom-css-style';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    styleElement.textContent = css || '';
}

function ensureGlobalCssPresets() {
    if (!db.globalCssPresets) db.globalCssPresets = [];
}

async function saveGlobalCssPreset() {
    const cssTextarea = document.getElementById('global-custom-css');
    if (!cssTextarea) return;
    const css = cssTextarea.value.trim();
    if (!css) { showToast('当前 CSS 为空，无法保存'); return; }
    const name = prompt('请输入预设名称（将覆盖同名预设）:');
    if (!name) return;
    ensureGlobalCssPresets();
    const idx = db.globalCssPresets.findIndex(p => p.name === name);
    const preset = { name, css };
    if (idx >= 0) db.globalCssPresets[idx] = preset; else db.globalCssPresets.push(preset);
    await saveData();
    showToast('全局CSS预设已保存');
}

function openGlobalCssPresetsModal() {
    const presetsModal = document.getElementById('global-css-presets-modal');
    const presetsList = document.getElementById('global-css-presets-list');
    const cssTextarea = document.getElementById('global-custom-css');
    if (!presetsModal || !presetsList || !cssTextarea) return;
    ensureGlobalCssPresets();
    presetsList.innerHTML = '';
    const presets = db.globalCssPresets || [];
    if (!presets.length) {
        presetsList.innerHTML = '<p style="color:#888;margin:6px 0;">暂无预设</p>';
    } else {
        presets.forEach((p, idx) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.padding = '6px 0';
            row.style.marginBottom = '12px';
            if (idx < presets.length - 1) row.style.borderBottom = '1px solid #f5f5f5';
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
            applyBtn.type = 'button';
            applyBtn.className = 'btn btn-primary';
            applyBtn.style.width = '36px';
            applyBtn.style.height = '36px';
            applyBtn.style.padding = '0';
            applyBtn.style.borderRadius = '8px';
            applyBtn.style.fontSize = '14px';
            applyBtn.style.fontWeight = 'bold';
            applyBtn.textContent = '应';
            applyBtn.onclick = async function (event) {
                event.preventDefault();
                cssTextarea.value = p.css || '';
                db.globalCustomCss = p.css || '';
                applyGlobalCss(p.css || '');
                await saveData();
                showToast('已应用该预设到全局样式');
                presetsModal.style.display = 'none';
            };
            const renameBtn = document.createElement('button');
            renameBtn.type = 'button';
            renameBtn.className = 'btn';
            renameBtn.style.width = '36px';
            renameBtn.style.height = '36px';
            renameBtn.style.padding = '0';
            renameBtn.style.borderRadius = '8px';
            renameBtn.style.fontSize = '14px';
            renameBtn.style.fontWeight = 'bold';
            renameBtn.textContent = '重';
            renameBtn.onclick = async function (event) {
                event.preventDefault();
                const newName = prompt('输入新名称：', p.name);
                if (!newName) return;
                db.globalCssPresets[idx].name = newName.trim();
                await saveData();
                openGlobalCssPresetsModal();
                showToast('预设已重命名');
            };
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn btn-danger';
            delBtn.style.width = '36px';
            delBtn.style.height = '36px';
            delBtn.style.padding = '0';
            delBtn.style.borderRadius = '8px';
            delBtn.style.fontSize = '14px';
            delBtn.style.fontWeight = 'bold';
            delBtn.textContent = '删';
            delBtn.onclick = async function (event) {
                event.preventDefault();
                if (!confirm('确定删除预设 "' + p.name + '" ?')) return;
                db.globalCssPresets.splice(idx, 1);
                await saveData();
                openGlobalCssPresetsModal();
                showToast('预设已删除');
            };
            btnWrap.appendChild(applyBtn);
            btnWrap.appendChild(renameBtn);
            btnWrap.appendChild(delBtn);
            row.appendChild(btnWrap);
            presetsList.appendChild(row);
        });
    }
    presetsModal.style.display = 'flex';
}

function updateClock() {
    const now = new Date();
    const timeDisplay = document.getElementById('time-display');
    const dateDisplay = document.getElementById('date-display');
    const padValue = window.pad || ((num) => num.toString().padStart(2, '0'));
    if (timeDisplay) timeDisplay.textContent = `${padValue(now.getHours())}:${padValue(now.getMinutes())}`;
    if (dateDisplay) dateDisplay.textContent = `${now.getFullYear()}年${padValue(now.getMonth() + 1)}月${padValue(now.getDate())}日`;
}

function setupHomeScreenPaging() {
    const container = document.querySelector('.home-page-wrapper');
    const dots = document.querySelectorAll('.home-page-indicator .dot');
    const homeContainer = document.getElementById('home-container');
    
    let startX = 0;
    let isDragging = false;
    let currentPageIndex = 0;

    function goToPage(index) {
        if (index < 0 || index > 1) return;
        container.style.transform = `translateX(-${index * 50}%)`;
        
        dots.forEach(dot => dot.classList.remove('active'));
        if(dots[index]) dots[index].classList.add('active');
        
        currentPageIndex = index;
    }

    homeContainer.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    homeContainer.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        handleSwipe(startX, touchEndX);
    });

    homeContainer.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
    });

    homeContainer.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        const endX = e.clientX;
        isDragging = false;
        handleSwipe(startX, endX);
    });
    
    homeContainer.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    function handleSwipe(start, end) {
        const diff = end - start;
        const threshold = 50;

        if (Math.abs(diff) > threshold) {
            if (diff < 0 && currentPageIndex === 0) {
                goToPage(1);
            } else if (diff > 0 && currentPageIndex === 1) {
                goToPage(0);
            }
        }
    }

    document.addEventListener('keydown', (e) => {
        if (document.getElementById('home-container').classList.contains('active')) {
            if (e.key === 'ArrowRight') {
                goToPage(1);
            } else if (e.key === 'ArrowLeft') {
                goToPage(0);
            }
        }
    });

    dots.forEach(dot => {
        dot.addEventListener('click', () => goToPage(parseInt(dot.dataset.index)));
    });
}

function setupHomeScreen() {
    const getIcon = (id) => db.customIcons[id] || defaultIcons[id]?.url;
    
    const homeScreen1 = document.getElementById('home-screen');
    homeScreen1.innerHTML = `
        <div class="time-widget">
            <div class="date" id="date-display"></div>
            <div class="time" id="time-display"></div>
        </div>
        <div class="home-profile-header">
            <div class="home-hero"></div>
            <div class="home-avatar-wrap">
                <img id="home-profile-avatar" alt="头像" src="https://i.postimg.cc/GtbTnxhP/o-o-1.jpg">
            </div>
            <div class="home-info-card">
                <h2 class="home-profile-name">点击设置昵称</h2>
                <p class="home-profile-signature">点击设置个性签名</p>
            </div>
        </div>
        <div class="main-content-area">
            <div class="left-column">
                <div class="contact-widgets-column">
                 <div class="contact-widget" id="custom-widget-1" data-widget-id="widget1">
                    <img src="https://i.ibb.co/6r11fGg/avatar1.png" alt="自定义组件1">
                    <span>自定义</span>
                </div>
                <div class="contact-widget avatar-right" id="custom-widget-2" data-widget-id="widget2">
                    <img src="https://i.ibb.co/d28n82t/avatar2.png" alt="自定义组件2">
                    <span>自定义</span>
                </div>
                </div>
                <div class="secondary-apps-dock">
                     <a href="#" class="app-icon" data-target="customize-screen"><img src="${getIcon('customize-screen')}" alt="自定义" class="icon-img"><span class="app-name">${defaultIcons['customize-screen'].name}</span></a>
                     <a href="#" class="app-icon" data-target="wallpaper-screen"><img src="${getIcon('wallpaper-screen')}" alt="壁纸" class="icon-img"><span class="app-name">${defaultIcons['wallpaper-screen'].name}</span></a>
                </div>
            </div>

            <div class="right-column">
                <div class="small-app-grid">
                    <a href="#" class="app-icon" data-target="chat-list-screen"><img src="${getIcon('chat-list-screen')}" alt="404" class="icon-img"><span class="app-name">${defaultIcons['chat-list-screen'].name}</span></a>
                    <a href="#" class="app-icon" data-target="api-settings-screen"><img src="${getIcon('api-settings-screen')}" alt="API" class="icon-img"><span class="app-name">${defaultIcons['api-settings-screen'].name}</span></a>
                    <a href="#" class="app-icon" data-target="world-book-screen"><img src="${getIcon('world-book-screen')}" alt="世界书" class="icon-img"><span class="app-name">${defaultIcons['world-book-screen'].name}</span></a>
                    <a href="#" class="app-icon" data-target="tutorial-screen"><img src="${getIcon('tutorial-screen')}" alt="教程" class="icon-img"><span class="app-name">${defaultIcons['tutorial-screen'].name}</span></a>
                </div>
                <div id="music-app-widget" class="record-player-widget">
                    <div class="record-sleeve" id="custom-record-sleeve"></div>
                    <div class="vinyl-record">
                        <div class="record-label" id="custom-record-label"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="dock">
            <a href="#" class="app-icon" id="day-mode-btn"><img src="${getIcon('day-mode-btn')}" alt="日间" class="icon-img"></a>
            <a href="#" class="app-icon" id="night-mode-btn"><img src="${getIcon('night-mode-btn')}" alt="夜间" class="icon-img"></a>
            <a href="#" class="app-icon" data-target="font-settings-screen"><img src="${getIcon('font-settings-screen')}" alt="字体" class="icon-img"></a>
<a href="#" class="app-icon" data-target="ai-space-home-screen"><img src="${getIcon('ai-character-select-screen')}" alt="AI空间" class="icon-img"></a>
        </div>`;

    const homeScreen2 = document.getElementById('home-screen-2');
 homeScreen2.innerHTML = `
        <div class="app-grid" style="margin-top: 80px;">
            <a href="#" class="app-icon" data-target="mall-screen">
                <img src="${getIcon('mall-screen')}" alt="商城" class="icon-img">
                <span class="app-name">${defaultIcons['mall-screen'].name}</span>
            </a>
            <a href="#" class="app-icon" id="soul-bond-app-icon">
                <img src="${getIcon('soul-bond-app-icon')}" alt="心灵羁绊" class="icon-img">
                <span class="app-name">${defaultIcons['soul-bond-app-icon'].name}</span>
            </a>
            <a href="#" class="app-icon" id="rendering-rules-app-icon">
                <img src="${getIcon('rendering-rules-screen')}" alt="渲染器" class="icon-img">
                <span class="app-name">${defaultIcons['rendering-rules-screen'].name}</span>
            </a>
        </div>`;
    document.getElementById('custom-record-label').style.backgroundImage = `url('${getIcon('record-label')}')`;
    document.getElementById('custom-record-sleeve').style.backgroundImage = `url('${getIcon('record-sleeve')}')`;

    updateClock();
    applyWallpaper(db.wallpaper, homeScreen1);
    applyWallpaper(db.wallpaper2, homeScreen2);
    applyHomeScreenMode(db.homeScreenMode);

    const widget1Data = db.customWidgets.find(w => w.id === 'widget1');
    const widget2Data = db.customWidgets.find(w => w.id === 'widget2');
    const widget1El = document.getElementById('custom-widget-1');
    const widget2El = document.getElementById('custom-widget-2');

    if (widget1Data && widget1El) {
        widget1El.querySelector('img').src = widget1Data.imageUrl;
        widget1El.querySelector('span').textContent = widget1Data.text;
    }
    if (widget2Data && widget2El) {
        widget2El.querySelector('img').src = widget2Data.imageUrl;
        widget2El.querySelector('span').textContent = widget2Data.text;
    }
    const rendererIcon = document.getElementById('rendering-rules-app-icon');
    if (rendererIcon) {
        rendererIcon.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof openRenderingRulesScreen === 'function') {
                openRenderingRulesScreen();
            }
        });
    }

    document.getElementById('day-mode-btn')?.addEventListener('click', (e) => { e.preventDefault(); applyHomeScreenMode('day'); });
    document.getElementById('night-mode-btn')?.addEventListener('click', (e) => { e.preventDefault(); applyHomeScreenMode('night'); });
    document.querySelector('[data-target="world-book-screen"]').addEventListener('click', renderWorldBookList);
    document.querySelector('[data-target="customize-screen"]').addEventListener('click', renderCustomizeForm);
    document.querySelector('[data-target="tutorial-screen"]').addEventListener('click', renderTutorialContent);
       
    setupHomeScreenProfileEditor(); 
}

function applyWallpaper(url, element) {
    if (element) {
        element.style.backgroundImage = `url(${url})`;
    }
}

function applyAiSpaceWallpaper(url) {
    const aiSpaceContent = document.querySelector('#ai-space-home-screen .content');
    if (aiSpaceContent) {
        if (url) {
            aiSpaceContent.style.backgroundImage = `url(${url})`;
            aiSpaceContent.style.backgroundSize = 'cover';
            aiSpaceContent.style.backgroundPosition = 'center';
            aiSpaceContent.style.backgroundColor = '';
        } else {
            aiSpaceContent.style.backgroundImage = 'none';
            aiSpaceContent.style.backgroundColor = '#f5f5f5';
        }
    }
}

async function applyHomeScreenMode(mode) {
    const homeScreen = document.getElementById('home-screen');
    if (!homeScreen) return;
    if (mode === 'day') {
        homeScreen.classList.add('day-mode');
    } else {
        homeScreen.classList.remove('day-mode');
    }
    db.homeScreenMode = mode;
    await saveData();
}

function setupCustomizeApp() {
    document.querySelector('[data-target="customize-screen"]').addEventListener('click', renderCustomizeForm);
}

let loadingTutorialBackup = false;

function setupTutorialApp() {
    const tutorialContentArea = document.getElementById('tutorial-content-area');
    if (!tutorialContentArea) return;
    tutorialContentArea.addEventListener('click', (e) => {
        const header = e.target.closest('.tutorial-header');
        if (header) {
            header.parentElement.classList.toggle('open');
        }
    });
}

function renderTutorialContent() {
    const tutorialContentArea = document.getElementById('tutorial-content-area');
    if (!tutorialContentArea) return;
    const tutorials = [
        {title: '写在前面', imageUrls: ['https://i.postimg.cc/7PgyMG9S/image.jpg']},
        {
            title: '软件介绍',
            imageUrls: ['https://i.postimg.cc/VvsJRh6q/IMG-20250713-162647.jpg', 'https://i.postimg.cc/8P5FfxxD/IMG-20250713-162702.jpg', 'https://i.postimg.cc/3r94R3Sn/IMG-20250713-162712.jpg']
        },
        {
            title: '404',
            imageUrls: ['https://i.postimg.cc/x8scFPJW/IMG-20250713-162756.jpg', 'https://i.postimg.cc/pX6mfqtj/IMG-20250713-162809.jpg', 'https://i.postimg.cc/YScjV00q/IMG-20250713-162819.jpg', 'https://i.postimg.cc/13VfJw9j/IMG-20250713-162828.jpg']
        },
        {title: '404-群聊', imageUrls: ['https://i.postimg.cc/X7LSmRTJ/404.jpg']}
    ];
    tutorialContentArea.innerHTML = '';
    tutorials.forEach(tutorial => {
        const item = document.createElement('div');
        item.className = 'tutorial-item';
        const imagesHtml = tutorial.imageUrls.map(url => `<img src="${url}" alt="${tutorial.title}教程图片">`).join('');
        item.innerHTML = `<div class="tutorial-header">${tutorial.title}</div><div class="tutorial-content">${imagesHtml}</div>`;
        tutorialContentArea.appendChild(item);
    });

    const backupDataBtn = document.createElement('button');
    backupDataBtn.className = 'btn btn-primary';
    backupDataBtn.textContent = '备份数据';
    backupDataBtn.disabled = loadingTutorialBackup;

    backupDataBtn.addEventListener('click', async () => {
        if (loadingTutorialBackup) return;
        loadingTutorialBackup = true;
        try {
            const localStorageData = {};
            const presetKeys = ['fontPresets', 'apiPresets', 'bubblePresets', 'myPersonaPresets', 'soul_bond_roster'];
            presetKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    localStorageData[key] = data;
                }
            });

            if (window.AppDB_Moments && window.AppDB_Moments.moments) {
                db.momentsData = await window.AppDB_Moments.moments.toArray();
            }

            const backupObject = {
                dbData: db,
                localStorageData: localStorageData
            };

            const jsonString = JSON.stringify(backupObject);
            const dataBlob = new Blob([jsonString]);
            const compressionStream = new CompressionStream('gzip');
            const compressedStream = dataBlob.stream().pipeThrough(compressionStream);
            const compressedBlob = await new Response(compressedStream).blob();
            const url = URL.createObjectURL(compressedBlob);
            const a = document.createElement('a');
            const now = new Date();
            a.href = url;
            a.download = `章鱼喷墨_备份数据_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '')}.ee`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (db.momentsData) {
                delete db.momentsData;
            }

            loadingTutorialBackup = false;
            showToast('完整数据备份成功！');
        } catch (e) {
            showToast(`导出失败, 发生错误: ${e.message}`);
        }
    });

    const importDataBtn = document.createElement('label');
    importDataBtn.className = 'btn btn-neutral';
    importDataBtn.textContent = '导入数据';
    importDataBtn.style.marginTop = '15px';
    importDataBtn.style.display = 'block';
    importDataBtn.disabled = loadingTutorialBackup;
    importDataBtn.setAttribute('for', 'import-data-input');

    document.querySelector('#import-data-input').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (confirm('此操作将覆盖当前所有数据（包括聊天、设置和预设）。此操作不可撤销。确定要继续吗？')) {
            try {
                const decompressionStream = new DecompressionStream('gzip');
                const decompressedStream = file.stream().pipeThrough(decompressionStream);
                const jsonString = await new Response(decompressedStream).text();
                const importedObject = JSON.parse(jsonString);

                let dbDataToSave;

                if (importedObject.dbData) {
                    if (importedObject.localStorageData) {
                        Object.entries(importedObject.localStorageData).forEach(([key, value]) => {
                            localStorage.setItem(key, value);
                        });
                        if (importedObject.localStorageData['soul_bond_roster']) {
                            localStorage.setItem('soul_bond_roster', importedObject.localStorageData['soul_bond_roster']);
                        }
                    }
                    dbDataToSave = importedObject.dbData;
                } else {
                    dbDataToSave = importedObject;
                    showToast('提示：正在导入旧版备份，部分设置（如预设）可能不会被恢复。');
                }

                await dataStorage.clearAll();
                if (window.AppDB_Moments && window.AppDB_Moments.moments) {
                    await window.AppDB_Moments.moments.clear();
                }

                if (dbDataToSave.momentsData && Array.isArray(dbDataToSave.momentsData)) {
                    if (window.AppDB_Moments && window.AppDB_Moments.moments) {
                        await window.AppDB_Moments.moments.bulkPut(dbDataToSave.momentsData);
                    }
                    delete dbDataToSave.momentsData;
                }

                await saveData(dbDataToSave);
                showToast(`数据已成功恢复。应用即将刷新。`);
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                console.error("导入失败:", error);
                showToast(`导入或解析文件时发生错误: ${error.message}`);
            } finally {
                event.target.value = null;
            }
        } else {
            event.target.value = null;
        }
    });

    tutorialContentArea.appendChild(backupDataBtn);
    tutorialContentArea.appendChild(importDataBtn);
}

function applyLayoutPreference() {
    const phoneScreen = document.querySelector('.phone-screen');
    if (db.useWechatLayout) {
        phoneScreen.classList.add('wechat-layout-active');
    } else {
        phoneScreen.classList.remove('wechat-layout-active');
    }
}

function renderCustomizeForm() {
    const form = document.getElementById('customize-form');
    form.innerHTML = '';

    const mainGridTitleHtml = `
        <div style="padding: 0 15px;">
            <p style="font-weight: 600; font-size: 16px; color: var(--secondary-color); margin-bottom: 5px;">主屏幕及组件图标</p>
        </div>
    `;
    form.insertAdjacentHTML('beforeend', mainGridTitleHtml);

    const mainGridContainer = document.createElement('div');
    mainGridContainer.className = 'app-grid';
    mainGridContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
    mainGridContainer.style.padding = '20px';
    mainGridContainer.style.gap = '15px';
    mainGridContainer.style.marginTop = '10px';
    
    Object.entries(defaultIcons).forEach(([id, { name, url }]) => {
        if (id.startsWith('ai-space-')) return;
        const currentIcon = db.customIcons[id] || url;
        const iconHTML = `
            <a href="#" class="app-icon" data-icon-id="${id}">
                <img src="${currentIcon}" alt="${name}" class="icon-img">
                <span class="app-name">${name || '模式切换'}</span>
            </a>`;
        mainGridContainer.innerHTML += iconHTML;
    });
    form.appendChild(mainGridContainer);

    const aiSpaceGridTitleHtml = `
        <hr style="border:none; border-top:1px solid #f0f0f0; margin: 25px 0;">
        <div style="padding: 0 15px;">
            <p style="font-weight: 600; font-size: 16px; color: var(--secondary-color); margin-bottom: 5px;">AI手机图标</p>
        </div>
    `;
    form.insertAdjacentHTML('beforeend', aiSpaceGridTitleHtml);

    const aiSpaceGridContainer = document.createElement('div');
    aiSpaceGridContainer.className = 'app-grid';
    aiSpaceGridContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
    aiSpaceGridContainer.style.padding = '20px';
    aiSpaceGridContainer.style.gap = '15px';
    aiSpaceGridContainer.style.marginTop = '10px';

    Object.entries(defaultIcons).forEach(([id, { name, icon }]) => {
        if (!id.startsWith('ai-space-')) return;
        const currentIcon = db.customIcons[id] || icon;
        const iconHTML = `
            <a href="#" class="app-icon" data-icon-id="${id}">
                <img src="${currentIcon}" alt="${name}" class="icon-img">
                <span class="app-name">${name}</span>
            </a>`;
        aiSpaceGridContainer.innerHTML += iconHTML;
    });
    form.appendChild(aiSpaceGridContainer);

    const globalCssHtml = `
        <hr style="border:none; border-top:1px solid #f0f0f0; margin: 25px 0;">
        <div class="global-css-section" style="padding: 0 15px;">
             <div style="display:flex;align-items:center;justify-content:flex-start;gap:4px;margin-bottom:8px;">
               <p style="font-weight: 600; font-size: 16px; color: var(--secondary-color); margin:0; white-space:nowrap;">全局样式 (CSS) 自定义</p>
               <button type="button" id="clear-global-css-btn" class="btn btn-neutral" style="width:50px !important; height:26px !important; border-radius:13px !important; background:rgba(0,0,0,0.6) !important; color:#ffffff !important; font-weight:bold; font-size:12px; line-height:26px !important; padding:0 !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; white-space:nowrap;">清除</button>
             </div>
             <p style="font-size: 13px; color: #888; margin-top: 0; margin-bottom: 15px;">这里的代码会覆盖整个应用的默认样式，请谨慎使用。</p>
            <textarea id="global-custom-css" rows="12" placeholder="/* 示例：修改聊天气泡颜色 */\n\n.message-bubble.sent {\n  background: linear-gradient(to right, #6a11cb 0%, #2575fc 100%);\n}" style="width: 100%; border-radius: 10px; padding: 10px; border: 2px solid #fce4ec; font-family: monospace; font-size: 13px;"></textarea>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button type="button" class="btn btn-primary" id="apply-global-css-btn" style="flex: 1; font-weight: bold; border-radius: 12px; height:38px !important; display:flex; align-items:center; justify-content:center; padding:0 14px; line-height:1; box-shadow:0 2px 4px rgba(0,0,0,0.05);">应用</button>
                <label for="import-css-input" class="btn btn-neutral" style="flex: 1; font-weight: bold; border-radius: 12px; margin-bottom: 0; height:38px !important; display:flex; align-items:center; justify-content:center; padding:0 14px; line-height:1; box-shadow:0 2px 4px rgba(0,0,0,0.05);">导入</label>
                <button type="button" class="btn btn-secondary" id="export-global-css-btn" style="flex: 1; font-weight: bold; border-radius: 12px; margin-bottom: 0; height:38px !important; display:flex; align-items:center; justify-content:center; padding:0 14px; line-height:1; box-shadow:0 2px 4px rgba(0,0,0,0.05);">导出</button>
                <button type="button" class="btn" id="save-global-css-preset-btn" style="flex: 1; font-weight: bold; border-radius: 12px; background:#f2f2f5; color:#333; height:38px !important; display:flex; align-items:center; justify-content:center; padding:0 14px; line-height:1; box-shadow:0 2px 4px rgba(0,0,0,0.05);">保存</button>
                <button type="button" class="btn" id="manage-global-css-presets-btn" style="width: 38px !important; height: 38px !important; padding:0; font-weight: bold; border-radius: 12px; background:#f2f2f5; color:#333; display:flex; align-items:center; justify-content:center; line-height:1; box-shadow:0 2px 4px rgba(0,0,0,0.05);">⚙</button>
            </div>
        </div>
        <input type="file" id="import-css-input" accept=".yu, .css, .txt" style="display: none;">
        <div id="global-css-presets-modal" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);justify-content:center;align-items:center;z-index:9999;">
          <div class="modal-window" style="max-width:340px;width:90%;background:var(--panel-bg,#fff);padding:20px;border-radius:18px;border:1px solid rgba(0,0,0,0.05);box-shadow:0 18px 46px rgba(10,10,20,0.18);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);">
            <h3 style="margin:0 0 8px 0;font-size:18px;font-weight:bold;color:#222;">管理全局CSS预设</h3>
            <div id="global-css-presets-list" style="max-height:300px; overflow:auto; margin-bottom:12px;"></div>
            <div style="display:flex;gap:6px;justify-content:center;">
              <button type="button" id="close-global-css-presets-modal" class="btn btn-primary" style="padding:8px 14px;border-radius:10px;width:110px;font-size:14px;font-weight:bold;">关闭</button>
            </div>
          </div>
        </div>`;
    form.insertAdjacentHTML('beforeend', globalCssHtml);

    const layoutToggleHtml = `
        <hr style="border:none; border-top:1px solid #f0f0f0; margin: 25px 0;">
        <div class="icon-custom-item" style="padding: 0 15px;">
            <div class="icon-details">
                <p>切换为微信输入栏布局</p>
                <p style="font-size:12px; color:#888; font-weight:normal;">启用后，聊天输入栏将变为左侧“+”号，右侧发送的样式。</p>
            </div>
            <input type="checkbox" id="toggle-wechat-layout" style="width: auto; height: 24px;">
        </div>`;
    form.insertAdjacentHTML('beforeend', layoutToggleHtml);

    const modal = document.getElementById('customize-icon-modal');
    const fileInput = document.getElementById('customize-icon-upload');
    const modalTitle = document.getElementById('customize-icon-modal-title');
    let currentEditingIconId = null;

    form.addEventListener('click', (e) => {
        const iconLink = e.target.closest('.app-icon[data-icon-id]');
        if (iconLink) {
            e.preventDefault();
            currentEditingIconId = iconLink.dataset.iconId;
            const iconName = iconLink.querySelector('.app-name').textContent;
            modalTitle.textContent = `自定义 "${iconName}"`;
            modal.classList.add('visible');
        }
    });
    
    document.getElementById('icon-edit-from-url-btn').onclick = async () => {
        const newUrl = prompt('请输入新的图标URL:');
        if (newUrl && newUrl.trim()) {
            db.customIcons[currentEditingIconId] = newUrl.trim();
            await saveData();
            renderCustomizeForm();
            setupHomeScreen();
            renderAiSpaceHomeScreen();
            showToast('图标已更新');
        }
        modal.classList.remove('visible');
    };
    document.getElementById('icon-edit-from-local-btn').onclick = () => {
        fileInput.click();
        modal.classList.remove('visible');
    };
    document.getElementById('icon-edit-reset-btn').onclick = async () => {
        delete db.customIcons[currentEditingIconId];
        await saveData();
        renderCustomizeForm();
        setupHomeScreen();
        renderAiSpaceHomeScreen();
        showToast('图标已恢复默认');
        modal.classList.remove('visible');
    };
    document.getElementById('icon-edit-cancel-btn').onclick = () => modal.classList.remove('visible');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('visible'); };
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file && currentEditingIconId) {
            try {
                const compressedUrl = await compressImage(file, { quality: 0.8, maxWidth: 200, maxHeight: 200 });
                db.customIcons[currentEditingIconId] = compressedUrl;
                await saveData();
                renderCustomizeForm();
                setupHomeScreen();
                renderAiSpaceHomeScreen();
                showToast('图标已更新');
            } catch (error) { showToast('图片处理失败'); }
        }
        e.target.value = null;
    };

    const cssTextarea = document.getElementById('global-custom-css');
    if (!db.globalCssPresets) db.globalCssPresets = [];
    if (cssTextarea && db.globalCustomCss) {
        cssTextarea.value = db.globalCustomCss;
    }
    document.getElementById('apply-global-css-btn').addEventListener('click', async () => {
        const cssCode = cssTextarea.value;
        db.globalCustomCss = cssCode;
        applyGlobalCss(cssCode);
        await saveData();
        showToast('全局样式已应用并保存！');
    });
    document.getElementById('export-global-css-btn').addEventListener('click', () => {
        const cssCode = cssTextarea.value;
        if (!cssCode.trim()) { showToast('没有内容可导出。'); return; }
        const blob = new Blob([cssCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `饭版小手机_美化样式.yu`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    });
    document.getElementById('import-css-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            cssTextarea.value = e.target.result;
            showToast('样式已导入，请点击“应用”来保存并查看效果。');
        };
        reader.readAsText(file);
        event.target.value = null;
    });

    const clearBtn = document.getElementById('clear-global-css-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cssTextarea.value = '';
            showToast('已清空CSS输入框');
        });
    }

    const savePresetBtn = document.getElementById('save-global-css-preset-btn');
    const managePresetBtn = document.getElementById('manage-global-css-presets-btn');
    const closePresetsModal = document.getElementById('close-global-css-presets-modal');
    if (closePresetsModal) closePresetsModal.addEventListener('click', () => {
        const modal = document.getElementById('global-css-presets-modal');
        if (modal) modal.style.display = 'none';
    });
    if (managePresetBtn) managePresetBtn.addEventListener('click', openGlobalCssPresetsModal);
    if (savePresetBtn) savePresetBtn.addEventListener('click', saveGlobalCssPreset);

    const layoutToggle = document.getElementById('toggle-wechat-layout');
    layoutToggle.checked = db.useWechatLayout || false;
    layoutToggle.addEventListener('change', async (e) => {
        db.useWechatLayout = e.target.checked;
        await saveData();
        applyLayoutPreference();
        showToast('布局已切换，重新进入聊天室生效');
    });
}

function setupWallpaperApp() {
    document.getElementById('wallpaper-screen').innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-container">‹</button><div class="title-container"><h1 class="title">更换壁纸</h1></div><div class="placeholder"></div></header><main class="content">
                <div class="wallpaper-preview" id="wallpaper-preview"><span>主页壁纸预览</span></div>
                <input type="file" id="wallpaper-upload" accept="image/*" style="display: none;">
                <label for="wallpaper-upload" class="btn btn-primary">更换主页壁纸</label>
                <hr style="border:none; border-top:1px solid #eee; margin: 25px 0;">
                <div class="wallpaper-preview" id="wallpaper-preview-2"><span>第二页壁纸预览</span></div>
                <input type="file" id="wallpaper-upload-2" accept="image/*" style="display: none;">
                <label for="wallpaper-upload-2" class="btn btn-secondary">更换第二页壁纸</label>
                
                <hr style="border:none; border-top:1px solid #eee; margin: 25px 0;">
                <div class="wallpaper-preview" id="wallpaper-preview-ai"><span>AI手机壁纸预览</span></div>
                <input type="file" id="wallpaper-upload-ai" accept="image/*" style="display: none;">
                <label for="wallpaper-upload-ai" class="btn btn-neutral">更换AI手机壁纸</label>
            </main>`;
    
    const wallpaperUpload = document.getElementById('wallpaper-upload');
    const wallpaperPreview = document.getElementById('wallpaper-preview');
    const wallpaperUpload2 = document.getElementById('wallpaper-upload-2');
    const wallpaperPreview2 = document.getElementById('wallpaper-preview-2');
    const wallpaperUploadAi = document.getElementById('wallpaper-upload-ai');
    const wallpaperPreviewAi = document.getElementById('wallpaper-preview-ai');

    wallpaperPreview.style.backgroundImage = `url(${db.wallpaper})`;
    wallpaperPreview.textContent = '';
    wallpaperPreview2.style.backgroundImage = `url(${db.wallpaper2})`;
    wallpaperPreview2.textContent = '';
    if (db.aiSpaceWallpaper) {
        wallpaperPreviewAi.style.backgroundImage = `url(${db.aiSpaceWallpaper})`;
        wallpaperPreviewAi.textContent = '';
    }

    wallpaperUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await compressImage(file, {quality: 0.85, maxWidth: 1080, maxHeight: 1920});
                db.wallpaper = compressedUrl;
                applyWallpaper(compressedUrl, document.getElementById('home-screen'));
                wallpaperPreview.style.backgroundImage = `url(${compressedUrl})`;
                await saveData();
                showToast('主页壁纸更换成功！');
            } catch (s) {
                showToast('壁纸压缩失败，请重试');
            }
        }
    });

    wallpaperUpload2.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await compressImage(file, {quality: 0.85, maxWidth: 1080, maxHeight: 1920});
                db.wallpaper2 = compressedUrl;
                applyWallpaper(compressedUrl, document.getElementById('home-screen-2'));
                wallpaperPreview2.style.backgroundImage = `url(${compressedUrl})`;
                await saveData();
                showToast('第二页壁纸更换成功！');
            } catch (s) {
                showToast('壁纸压缩失败，请重试');
            }
        }
    });

    wallpaperUploadAi.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await compressImage(file, {quality: 0.85, maxWidth: 1080, maxHeight: 1920});
                db.aiSpaceWallpaper = compressedUrl;
                applyAiSpaceWallpaper(compressedUrl);
                wallpaperPreviewAi.style.backgroundImage = `url(${compressedUrl})`;
                wallpaperPreviewAi.textContent = '';
                await saveData();
                showToast('AI手机壁纸更换成功！');
            } catch (s) {
                showToast('壁纸压缩失败，请重试');
            }
        }
    });
}

(function(){
    if (window._fontPresetsScriptLoaded) return;
    window._fontPresetsScriptLoaded = true;

    const PRES_KEY = 'fontPresets';

    function _getFontPresets() {
        try { return JSON.parse(localStorage.getItem(PRES_KEY) || '[]'); }
        catch(e){ return []; }
    }
    function _saveFontPresets(arr) {
        localStorage.setItem(PRES_KEY, JSON.stringify(arr || []));
    }

    function populateFontPresetSelect() {
        const sel = document.getElementById('font-preset-select');
        if (!sel) return;
        const presets = _getFontPresets();
        sel.innerHTML = '<option value="">— 选择一个预设 —</option>';
        presets.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            sel.appendChild(opt);
        });
    }

    function saveCurrentFontAsPreset() {
        const fontUrlEl = document.getElementById('font-url');
        if (!fontUrlEl) return showToast('找不到字体链接输入框');
        const url = fontUrlEl.value.trim();
        if (!url) return showToast('当前字体链接为空，无法保存');
        
        let name = prompt('请输入预设名称（将覆盖同名预设）:');
        if (!name) return;

        const presets = _getFontPresets();
        const existingPreset = presets.find(p => p.name === name);

        if (existingPreset) {
            existingPreset.url = url;
        } else {
            presets.push({ name, url });
        }
        
        _saveFontPresets(presets);
        populateFontPresetSelect();
        showToast('字体预设已保存');
    }

    function applyFontPreset(presetName) {
        const presets = _getFontPresets();
        const preset = presets.find(p => p.name === presetName);
        if (!preset) {
            showToast('未找到该预设');
            return;
        }

        const fontUrlEl = document.getElementById('font-url');
        if (fontUrlEl) {
            fontUrlEl.value = preset.url;
            const applyBtn = document.querySelector('#font-settings-form button[type="submit"]');
            if (applyBtn) {
                applyBtn.click();
            } else {
                db.fontUrl = preset.url;
                saveData();
                applyGlobalFont(preset.url);
                showToast('字体预设已应用！');
            }
        }
    }

    function openManageFontPresetsModal() {
        const modal = document.getElementById('font-presets-modal');
        const list = document.getElementById('font-presets-list');
        if (!modal || !list) return;

        list.innerHTML = '';
        const presets = _getFontPresets();
        if (!presets.length) {
            list.innerHTML = '<p style="color:#888;margin:6px 0;">暂无预设</p>';
        }

        presets.forEach((p, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0;';
            
            const nameDiv = document.createElement('div');
            nameDiv.textContent = p.name;
            row.appendChild(nameDiv);

            const btnWrap = document.createElement('div');
            btnWrap.style.cssText = 'display: flex; gap: 6px;';

            const renameBtn = document.createElement('button');
            renameBtn.className = 'btn btn-secondary btn-small';
            renameBtn.textContent = '重命名';
            renameBtn.onclick = function(){
                const newName = prompt('输入新名称：', p.name);
                if (newName && newName.trim()) {
                    const all = _getFontPresets();
                    all[idx].name = newName.trim();
                    _saveFontPresets(all);
                    openManageFontPresetsModal();
                    populateFontPresetSelect();
                }
            };

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger btn-small';
            delBtn.textContent = '删除';
            delBtn.onclick = function(){
                if (!confirm(`确定删除预设 "${p.name}" ?`)) return;
                const all = _getFontPresets();
                all.splice(idx, 1);
                _saveFontPresets(all);
                openManageFontPresetsModal();
                populateFontPresetSelect();
            };

            btnWrap.appendChild(renameBtn);
            btnWrap.appendChild(delBtn);
            row.appendChild(btnWrap);
            list.appendChild(row);
        });
        modal.style.display = 'flex';
    }

    window.bindFontPresetUI = function() {
        populateFontPresetSelect();
        document.getElementById('font-apply-preset').addEventListener('click', () => {
            const val = document.getElementById('font-preset-select').value;
            if (!val) return showToast('请选择要应用的预设');
            applyFontPreset(val);
        });
        document.getElementById('font-save-preset').addEventListener('click', saveCurrentFontAsPreset);
        document.getElementById('font-manage-presets').addEventListener('click', openManageFontPresetsModal);
        document.getElementById('font-close-modal').addEventListener('click', () => {
            document.getElementById('font-presets-modal').style.display = 'none';
        });

        document.querySelector('.app-icon[data-target="font-settings-screen"]').addEventListener('click', populateFontPresetSelect);
    }
})();

function setupFontSettingsApp() {
    const fontSettingsForm = document.getElementById('font-settings-form');
    const fontUrlInput = document.getElementById('font-url');
    const restoreDefaultFontBtn = document.getElementById('restore-default-font-btn');
    if (!fontSettingsForm || !fontUrlInput || !restoreDefaultFontBtn) return;
    fontUrlInput.value = db.fontUrl;
    fontSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newFontUrl = fontUrlInput.value.trim();
        db.fontUrl = newFontUrl;
        await saveData();
        applyGlobalFont(newFontUrl);
        showToast('新字体已应用！');
    });
    restoreDefaultFontBtn.addEventListener('click', async () => {
        fontUrlInput.value = '';
        db.fontUrl = '';
        await saveData();
        applyGlobalFont('');
        showToast('已恢复默认字体！');
    });
}

function applyGlobalFont(fontUrl) {
    const styleId = 'global-font-style';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    if (fontUrl) {
        const fontName = 'CustomGlobalFont';
        styleElement.innerHTML = `@font-face { font-family: '${fontName}'; src: url('${fontUrl}'); } :root { --font-family: '${fontName}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`;
    } else {
        styleElement.innerHTML = `:root { --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`;
    }
}

function setupCustomWidgetSystem() {
    const modal = document.getElementById('customize-widget-modal');
    const form = document.getElementById('customize-widget-form');
    const fileUpload = document.getElementById('widget-image-upload');
    const imageUrlInput = document.getElementById('widget-image-url-input');
    const editingWidgetIdInput = document.getElementById('editing-widget-id');
    const widgetTextInput = document.getElementById('widget-text-input');
    const homeContainerEl = document.getElementById('home-container');

    const openWidgetEditor = (widgetId) => {
        const widgetData = db.customWidgets.find(w => w.id === widgetId);
        if (!widgetData) {
            const defaultWidgetData = { id: widgetId, text: '自定义', imageUrl: 'https://i.ibb.co/6r11fGg/avatar1.png' };
            db.customWidgets.push(defaultWidgetData);
            saveData();
            widgetData = defaultWidgetData;
        }

        form.reset();
        editingWidgetIdInput.value = widgetId;
        widgetTextInput.value = widgetData.text;
        imageUrlInput.value = widgetData.imageUrl;

        modal.classList.add('visible');
    };

    if(homeContainerEl) {
        homeContainerEl.addEventListener('click', (e) => {
            const widget = e.target.closest('.contact-widget[data-widget-id]');
            if (widget) {
                openWidgetEditor(widget.dataset.widgetId);
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const widgetId = editingWidgetIdInput.value;
        const newText = widgetTextInput.value.trim();
        const newImageUrl = imageUrlInput.value.trim();

        const widgetIndex = db.customWidgets.findIndex(w => w.id === widgetId);
        if (widgetIndex > -1) {
            db.customWidgets[widgetIndex].text = newText;
            db.customWidgets[widgetIndex].imageUrl = newImageUrl;
        }

        await saveData();
        modal.classList.remove('visible');
        showToast('组件已更新！');
        
        const widgetEl = document.getElementById(`custom-widget-${widgetId === 'widget1' ? '1' : '2'}`);
        if(widgetEl){
            widgetEl.querySelector('img').src = newImageUrl;
            widgetEl.querySelector('span').textContent = newText;
        }
    });

    fileUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedUrl = await compressImage(file, { quality: 0.8, maxWidth: 200, maxHeight: 200 });
                imageUrlInput.value = compressedUrl;
            } catch (error) {
                showToast('图片处理失败，请重试');
            } finally {
                e.target.value = null;
            }
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('visible');
        }
    });
}

function setupHomeScreenProfileEditor() {
    const header = document.querySelector('.home-profile-header');
    if (!header) return;

    const heroEl = header.querySelector('.home-hero');
    const avatarImg = header.querySelector('#home-profile-avatar');
    const nameEl = header.querySelector('.home-profile-name');
    const signatureEl = header.querySelector('.home-profile-signature');

    const editModal = document.getElementById('home-profile-edit-modal'); 
    const editFromUrlBtn = document.getElementById('edit-profile-from-url-btn');
    const editFromLocalBtn = document.getElementById('edit-profile-from-local-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-profile-btn');
    const fileUploadInput = document.getElementById('home-profile-image-upload');
    let currentProfileEditTarget = null; 

    function renderProfile() {
        const profile = db.homeProfile;
        heroEl.style.backgroundImage = `url('${profile.heroBg}')`;
        avatarImg.src = profile.avatar;
        nameEl.textContent = profile.name;
        signatureEl.textContent = profile.signature;
    
        const mallAvatarImg = document.getElementById('profile-avatar');
        const mallUsernameEl = document.getElementById('profile-username');
        if (mallAvatarImg) {
            mallAvatarImg.src = profile.avatar;
        }
        if (mallUsernameEl) {
            mallUsernameEl.textContent = profile.name;
        }
    }
    async function saveProfile() {
        await saveData();
        showToast('主页信息已更新');
    }
    
    const openEditMenu = (target) => {
        currentProfileEditTarget = target;
        editModal.classList.add('visible'); 
    };

    heroEl.addEventListener('click', () => {
        openEditMenu('heroBg');
    });

    avatarImg.parentElement.addEventListener('click', () => {
        openEditMenu('avatar');
    });
    
    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.remove('visible'); 
    });
    
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.remove('visible');
        }
    });

    editFromUrlBtn.addEventListener('click', async () => {
        const target = currentProfileEditTarget;
        const promptMessage = target === 'heroBg' ? '请输入新的背景图URL：' : '请输入新的头像URL：';
        const currentValue = db.homeProfile[target];
        
        const newUrl = prompt(promptMessage, currentValue);
        if (newUrl && newUrl.trim()) {
            db.homeProfile[target] = newUrl.trim();
            renderProfile();
            await saveProfile();
        }
        editModal.classList.remove('visible'); 
    });

    editFromLocalBtn.addEventListener('click', () => {
        fileUploadInput.click();
        editModal.classList.remove('visible'); 
    });

    fileUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && currentProfileEditTarget) {
            try {
                const compressedUrl = await compressImage(file, { quality: 0.85, maxWidth: 1080, maxHeight: 1920 });
                db.homeProfile[currentProfileEditTarget] = compressedUrl;
                renderProfile();
                await saveProfile();
            } catch (error) {
                showToast('图片处理失败，请重试');
            }
        }
        e.target.value = null; 
    });

    nameEl.addEventListener('click', async () => {
        const newName = prompt('请输入新的昵称：', db.homeProfile.name);
        if (newName && newName.trim()) {
            db.homeProfile.name = newName.trim();
            renderProfile();
            await saveProfile();
        }
    });

    signatureEl.addEventListener('click', async () => {
        const newSignature = prompt('请输入新的个性签名：', db.homeProfile.signature);
        if (newSignature && newSignature.trim()) {
            db.homeProfile.signature = newSignature.trim();
            renderProfile();
            await saveProfile();
        }
    });

    renderProfile();
}

window.SystemAppearance = {
    init: () => {
        applyLayoutPreference();
        ensureGlobalCssPresets();
        applyGlobalCss(db.globalCustomCss);
        applyGlobalFont(db.fontUrl);
        setupCustomWidgetSystem();
        setupHomeScreen();
        updateClock();
        setInterval(updateClock, 30000);
        setupWallpaperApp();
        setupFontSettingsApp();
        if (window.bindFontPresetUI) window.bindFontPresetUI();
        setupCustomizeApp();
        setupTutorialApp();
        setupHomeScreenPaging();
        applyAiSpaceWallpaper(db.aiSpaceWallpaper);
    },
    applyGlobalCss,
    applyGlobalFont,
    saveGlobalCssPreset,
    openGlobalCssPresetsModal,
    applyWallpaper,
    applyAiSpaceWallpaper,
    applyHomeScreenMode,
    applyLayoutPreference,
    setupHomeScreen,
    setupHomeScreenPaging,
    setupWallpaperApp,
    setupFontSettingsApp,
    setupCustomWidgetSystem,
    renderCustomizeForm,
    setupCustomizeApp,
    setupTutorialApp,
    updateClock
};
