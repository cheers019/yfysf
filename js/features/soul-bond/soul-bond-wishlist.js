function setupWishlistApp() {
    const wishEditorModal = document.getElementById('bond-wish-editor-modal');
    const wishForm = document.getElementById('bond-wish-form');
    const wishTextInput = document.getElementById('wish-text-input');
    const editingWishIdInput = document.getElementById('editing-wish-id');
    const editorTitle = document.getElementById('wish-editor-title');
    const addWishFab = document.getElementById('add-wish-fab');

    document.querySelector('.bond-nav-btn[data-feature="wishlist"]').addEventListener('click', () => {
        const character = db.characters.find(c => c.id === document.getElementById('soul-bond-screen').dataset.characterId);
        if (!character) return;
        
        if (character.soulBondData && character.soulBondData.wishlist) {
            renderWishlist(character.soulBondData.wishlist);
        } else {
            document.getElementById('bond-wishlist-container').innerHTML = `<p class="placeholder-text">点击右下角“+”添加第一个愿望，或点击右上角“刷新”让AI为你们推荐。</p>`;
        }
        switchScreen('bond-wishlist-screen');
    });

    document.getElementById('refresh-wishlist-btn').addEventListener('click', async () => {
        const character = db.characters.find(c => c.id === document.getElementById('soul-bond-screen').dataset.characterId);
        if (!character) return;
        if (!confirm('这会用AI生成的建议覆盖当前的愿望清单，确定吗？')) return;

        const container = document.getElementById('bond-wishlist-container');
        container.innerHTML = `<p class="placeholder-text">正在生成愿望清单...</p>`;

        try {
            const prompt = generateAiWishlistPrompt(character);
            const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                       db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                       ? db.functionalApiSettings 
                                       : db.apiSettings;
            const aiResponseText = await callAiApi([{ role: 'user', content: prompt }], functionalSettings);
            const wishlistData = JSON.parse(aiResponseText.match(/\[[\s\S]*\]/)[0]);
            
            const wishes = wishlistData.map(wish => ({ id: `wish_${Date.now()}_${Math.random()}`, text: wish, completed: false }));

            character.soulBondData = character.soulBondData || { photos: [], wishlist: [] };
            character.soulBondData.wishlist = wishes;
            await saveData();

            renderWishlist(wishes);
        } catch (error) {
            console.error("生成愿望清单失败:", error);
            showToast(`生成失败: ${error.message}`);
            container.innerHTML = `<p class="placeholder-text" style="color:red;">生成失败</p>`;
        }
    });

    if(addWishFab) {
        addWishFab.addEventListener('click', () => openWishEditor());
    }
    
    wishForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const character = db.characters.find(c => c.id === document.getElementById('soul-bond-screen').dataset.characterId);
        if (!character) return;
        
        const wishText = wishTextInput.value.trim();
        const editingId = editingWishIdInput.value;

        character.soulBondData = character.soulBondData || { photos: [], wishlist: [] };
        
        if (editingId) {
            const wish = character.soulBondData.wishlist.find(w => w.id === editingId);
            if (wish) wish.text = wishText;
        } else {
            character.soulBondData.wishlist.unshift({
                id: `wish_${Date.now()}`,
                text: wishText,
                completed: false
            });
        }

        await saveData();
        renderWishlist(character.soulBondData.wishlist);
        wishEditorModal.classList.remove('visible');
    });

    const wishlistContainer = document.getElementById('bond-wishlist-container');

    wishlistContainer.addEventListener('click', async (e) => {
        const wishItem = e.target.closest('.wish-item');
        if (!wishItem) return;
        
        const wishCheckbox = e.target.closest('.wish-checkbox');
        if (wishCheckbox) {
            const character = db.characters.find(c => c.id === document.getElementById('soul-bond-screen').dataset.characterId);
            if (!character || !character.soulBondData || !character.soulBondData.wishlist) return;

            const wishId = wishCheckbox.dataset.id;
            const wish = character.soulBondData.wishlist.find(w => w.id === wishId);
            if (!wish) return;

            wish.completed = wishCheckbox.checked;
            await saveData();
            wishItem.classList.toggle('completed', wish.completed);
            showToast(wish.completed ? '一个愿望已达成！' : '愿望已重新开启');

            if (wish.completed) {
                const content = `[system: 你和 ${character.myName} 共同完成了愿望清单中的一项：“${wish.text}”。请在聊天中对此发表感想。]`;
                const contextMessage = { id: `msg_wish_done_${Date.now()}`, role: 'user', content: content, parts: [{ type: 'text', text: content }], timestamp: Date.now() };
                character.history.push(contextMessage);
                await saveData();
            }
        }
    });

    let longPressTimer;
    const handleLongPress = async (targetElement) => {
        const wishItem = targetElement.closest('.wish-item');
        if (!wishItem) return;
        
        const character = db.characters.find(c => c.id === document.getElementById('soul-bond-screen').dataset.characterId);
        if (!character || !character.soulBondData) return;

        const wishId = wishItem.querySelector('.wish-checkbox').dataset.id;
        const wish = character.soulBondData.wishlist.find(w => w.id === wishId);
        
        if (wish && confirm(`确定要删除这个愿望吗？\n“${wish.text}”`)) {
            character.soulBondData.wishlist = character.soulBondData.wishlist.filter(w => w.id !== wishId);
            await saveData();
            renderWishlist(character.soulBondData.wishlist);
            showToast('愿望已删除');
        }
    };

    wishlistContainer.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => handleLongPress(e.target), 500);
    });
    wishlistContainer.addEventListener('touchend', () => clearTimeout(longPressTimer));
    wishlistContainer.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    wishlistContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleLongPress(e.target);
    });

    function openWishEditor(wish = null) {
        wishForm.reset();
        if (wish) {
            editorTitle.textContent = '编辑愿望';
            editingWishIdInput.value = wish.id;
            wishTextInput.value = wish.text;
        } else {
            editorTitle.textContent = '添加一个新愿望';
            editingWishIdInput.value = '';
        }
        wishEditorModal.classList.add('visible');
    }
}

function renderWishlist(wishes) {
    const container = document.getElementById('bond-wishlist-container');
    container.innerHTML = '';
    wishes.forEach(wish => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
            <div class="wish-item ${wish.completed ? 'completed' : ''}">
                <input type="checkbox" class="wish-checkbox" data-id="${wish.id}" ${wish.completed ? 'checked' : ''}>
                <div class="item-details">
                    <div class="item-name">${wish.text}</div>
                </div>
            </div>
        `;
        container.appendChild(li);
    });
}

function generateAiWishlistPrompt(character) {
    let prompt = `你正在扮演角色“${character.realName}”，人设是：${character.persona}。
请根据你的人设和与“我”（${character.myName}）的关系，虚构一个包含5-8条你们“最想一起完成的事”的愿望清单。
规则:
1. 愿望要非常贴合你的人设和我们的关系，可以浪漫、有趣、或富有冒险精神。
2. 每条愿望都是一个简短的句子。
3. 你的输出必须是严格的JSON数组格式，数组中只包含字符串，不要包含任何其他文字。

JSON格式示例:
[
  "一起去海边看一次日出",
  "养一只属于我们两个人的小猫",
  "不看攻略，来一场说走就走的旅行",
  "为你做一顿丰盛的晚餐"
]`;
    return prompt;
}

window.SoulBondWishlist = { setup: setupWishlistApp };
