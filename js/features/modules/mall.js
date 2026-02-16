// START: 完整的商城功能JavaScript代码 (V5 - 最终版)
// ===============================================================

// --- 商城及购物流程的全局变量 (确保只声明一次) ---
let isGeneratingProducts = false;
let selectedCartItemIds = new Set(); // 存储被选中的购物车项ID
let purchaseState = { productId: null, recipientId: null, quantity: 1, style: '默认款式', multiItems: [] };
let globalCountdownInterval = null;
let isLikesSelectionMode = false;
let selectedLikedProductIds = [];
// === 新增/修改的代码：修复代付功能、重构购买流程并添加付款记录 ===

/**
 * 新增：处理“找人代付”请求的函数
 * @param {string} productId - 请求代付的商品ID
 */
async function handlePayForMeRequest(productId) {
    const product = findProductById(productId);
    if (!product) return;

    // 弹出选择代付人的模态框
    const modal = document.getElementById('purchase-modal');
    purchaseState = { productId, isPayForMe: true }; // 标记当前是代付流程

    // 更新弹窗标题和按钮文字，使其更符合“代付”场景
    modal.querySelector('h5').textContent = '选择谁来帮你付款？';
    document.getElementById('confirm-recipient-btn').textContent = '发送代付请求';
    
    document.getElementById('purchase-product-image').src = product.imageUrl;
    document.getElementById('purchase-product-price').textContent = `¥${product.price.toFixed(2)}`;
    document.getElementById('purchase-product-name').textContent = product.name;
    
    renderRecipientList();
    modal.classList.add('visible');
}


// 替换旧的 handleFinalPurchaseConfirmation 函数
async function handleFinalPurchaseConfirmation() {
    // 1. 获取用户选择的数量和样式，并保存到全局状态中
    purchaseState.quantity = parseInt(document.getElementById('purchase-quantity-input').value, 10);
    const activeStyleBtn = document.querySelector('.style-option-btn.active');
    purchaseState.style = activeStyleBtn ? activeStyleBtn.textContent : '默认款式';

    // 2. 关闭当前（样式/数量选择）的弹窗
    document.getElementById('product-options-modal').classList.remove('visible');
    
    // 3. 打开“设置送达时间”的弹窗
    document.getElementById('delivery-countdown-modal').classList.add('visible');
}
// ▼▼▼ 请用这个完整的、修正后的新函数，替换掉文件中旧的 renderPaymentHistory 函数 ▼▼▼
/**
 * 新增：渲染付款记录列表的函数
 */
function renderPaymentHistory() {
    const container = document.getElementById('payment-history-list');
    if (!container) return;

    container.innerHTML = '';
    const history = db.mallData.paymentHistory || [];

    if (history.length === 0) {
        container.innerHTML = '<p class="placeholder-text" style="padding: 15px 0;">暂无付款记录</p>';
        return;
    }

    // 按时间倒序显示
    history.sort((a, b) => b.timestamp - a.timestamp);

    history.forEach(item => {
        const date = new Date(item.timestamp);
        const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        const itemEl = document.createElement('div');
        itemEl.className = 'transaction-item'; // 复用钱包明细的样式
        
        // 【核心修改】为每条记录添加一个 data-id 属性
        itemEl.dataset.id = item.id;

        itemEl.innerHTML = `
            <div class="transaction-details">
                <span class="transaction-description">${item.description}</span>
                <span class="transaction-timestamp">${dateString}</span>
            </div>
            <span class="transaction-amount expense">- ${item.total.toFixed(2)}</span>
        `;
        container.appendChild(itemEl);
    });
}

/**
 * 切换购物车商品的选中状态
 */
function toggleCartItemSelection(cartId) {
    if (selectedCartItemIds.has(cartId)) {
        selectedCartItemIds.delete(cartId);
    } else {
        selectedCartItemIds.add(cartId);
    }
    document.querySelector(`.cart-item[data-cart-id="${cartId}"]`)?.classList.toggle('selected');
    updateCartCheckoutBar();
}

/**
 * 更新底部结算栏的显示和数据
 */
function updateCartCheckoutBar() {
    const bar = document.getElementById('cart-checkout-bar');
    const totalPriceEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    const selectAllContainer = document.querySelector('.select-all-container');
    
    const totalItems = db.mallData.cart.length;
    const selectedCount = selectedCartItemIds.size;

    if (totalItems > 0) {
        bar.style.display = 'flex';
    } else {
        bar.style.display = 'none';
    }

    let totalPrice = 0;
    selectedCartItemIds.forEach(cartId => {
        const cartItem = db.mallData.cart.find(item => item.cartId === cartId);
        const product = cartItem ? db.mallData.products.find(p => p.id === cartItem.productId) : null;
        if (product) totalPrice += product.price;
    });

    totalPriceEl.textContent = `合计: ¥${totalPrice.toFixed(2)}`;
    checkoutBtn.textContent = `去结算 (${selectedCount})`;
    checkoutBtn.disabled = selectedCount === 0;

    selectAllContainer.classList.toggle('selected', selectedCount > 0 && selectedCount === totalItems);
}

/**
 * 处理购物车结算
 */
// ▼▼▼ 1. 使用这个新函数，完整替换旧的 handleCartCheckout 函数 ▼▼▼
async function handleCartCheckout() {
    if (selectedCartItemIds.size === 0) {
        showToast("请至少选择一件商品");
        return;
    }
    // --- 核心修改：从所有商品中查找 ---
    const allProducts = [...(db.mallData.products || []), ...(db.mallData.customProducts || [])];
    const itemsToPurchase = Array.from(selectedCartItemIds).map(cartId => {
        const cartItem = db.mallData.cart.find(item => item.cartId === cartId);
        return cartItem ? allProducts.find(p => p.id === cartItem.productId) : null;
    }).filter(Boolean);
    // --- 修改结束 ---

    if (itemsToPurchase.length === 0) return;
    renderPaymentConfirmationScreen(itemsToPurchase);
}

// ▼▼▼ 在您的JS代码中添加这个【完整】的缺失函数 ▼▼▼
function renderPaymentConfirmationScreen(items) {
    const recipientSelect = document.getElementById('payment-recipient-select');
    const itemListEl = document.getElementById('payment-items-list');
    const totalPriceEl = document.getElementById('payment-total-price');
    
    // 添加“我自己”作为收货人选项
    recipientSelect.innerHTML = '<option value="user_me">我自己</option>';
    db.characters.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = char.remarkName;
        recipientSelect.appendChild(option);
    });

    itemListEl.innerHTML = '';
    let totalPrice = 0;
    items.forEach(item => {
        totalPrice += item.price;
        const itemCard = document.createElement('div');
        itemCard.className = 'payment-item-card';
        itemCard.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}">
            <div class="item-info">
                <p class="item-name">${item.name}</p>
                <p class="item-price">¥${item.price.toFixed(2)}</p>
            </div>
        `;
        itemListEl.appendChild(itemCard);
    });
    totalPriceEl.textContent = `¥${totalPrice.toFixed(2)}`;
    
    window.currentPurchaseItems = items;
    window.currentPurchaseTotal = totalPrice;

    switchScreen('payment-confirmation-screen');
}
// ▲▲▲ 添加结束 ▲▲▲
// ▼▼▼ 1. 使用这个新函数，完整替换旧的 
/**
 * 新增：为付款记录列表设置长按删除等交互事件
 */
function setupPaymentHistoryActions() {
    const historyList = document.getElementById('payment-history-list');
    if (!historyList) return;

    const handleLongPress = (event) => {
        const item = event.target.closest('.transaction-item');
        if (!item) return;

        event.preventDefault(); // 阻止默认的右键菜单
        const transactionId = item.dataset.id;
        
        // 使用 createContextMenu 函数创建菜单
        createContextMenu(
            [{
                label: '删除此条记录',
                danger: true,
                action: async () => {
                    if (confirm('确定要删除这条付款记录吗？此操作不可撤销。')) {
                        // 从数据库中过滤掉被删除的记录
                        db.mallData.paymentHistory = db.mallData.paymentHistory.filter(
                            tx => tx.id !== transactionId
                        );
                        await saveData(); // 保存更改
                        renderPaymentHistory(); // 重新渲染列表
                        showToast('记录已删除');
                    }
                }
            }],
            event.clientX, // 鼠标X坐标
            event.clientY  // 鼠标Y坐标
        );
    };

    // 监听电脑上的右键点击
    historyList.addEventListener('contextmenu', handleLongPress);

    // 监听手机上的长按
    let longPressTimer;
    historyList.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
            const touch = e.touches[0];
            const mockEvent = { clientX: touch.clientX, clientY: touch.clientY, target: e.target, preventDefault: () => e.preventDefault() };
            handleLongPress(mockEvent);
        }, 500); // 长按超过500毫秒触发
    });
    historyList.addEventListener('touchend', () => clearTimeout(longPressTimer));
    historyList.addEventListener('touchmove', () => clearTimeout(longPressTimer));
}
async function sendPaymentRequestCard(charId, items, total) {
    const character = db.characters.find(c => c.id === charId);
    if (!character) return;

    const message = {
        id: `msg_pay_req_${Date.now()}`,
        role: 'user',
        content: `[我向 ${character.remarkName} 发起代付请求]`,
        parts: [],
        timestamp: Date.now(),
        paymentRequestData: {
            status: 'pending', // 'pending', 'paid', 'declined'
            amount: total,
            items: items.map(item => ({ id: item.id, name: item.name, imageUrl: item.imageUrl })),
            requesterName: character.myName // 我的名字
        }
    };

    character.history.push(message);
    await saveData();
    window.renderChatList();
}

/**
 * 处理商城的搜索逻辑
 * @param {string} query - 用户输入的搜索关键词
 */
async function handleMallSearch(query) {
    if (!query) {
        renderMallProducts(); // 如果搜索为空，则显示所有商品
        return;
    }

    showToast(`正在搜索“${query}”...`);
    const lowerCaseQuery = query.toLowerCase();
    
    // 1. 在现有商品中进行本地模糊搜索
    const localResults = db.mallData.products.filter(p => 
        p.name.toLowerCase().includes(lowerCaseQuery) || 
        p.description.toLowerCase().includes(lowerCaseQuery)
    );

    if (localResults.length > 0) {
        // 2. 如果找到结果，则直接渲染
        renderMallProducts(localResults);
        showToast(`找到了 ${localResults.length} 件相关商品`);
    } else {
        // 3. 如果本地没有找到，则请求AI创造多个新商品
        try {
            // 调用新的复数版本函数
            const fictionalProducts = await generateFictionalProducts(query);
            
            // 将所有新创造的商品添加到总商品列表的顶部
            db.mallData.products.unshift(...fictionalProducts);
            await saveData();

            // 只显示这些新创造的商品作为本次的搜索结果
            renderMallProducts(fictionalProducts);
            showToast(`为您创造了 ${fictionalProducts.length} 件新商品！`);
        } catch (error) {
            console.error("创造虚构商品失败:", error);
            showToast(`创造失败: ${error.message}`);
            document.getElementById('product-grid').innerHTML = `<p class="placeholder-text" style="color:red;">哎呀，创造力枯竭了...</p>`;
        }
    }
}
// === [V3] 替换旧的 generateFictionalProducts 函数 ===
async function generateFictionalProducts(query) {
    
    let prompt;
    const isSpecialMode = db.mallData.api.specialItemsEnabled;

    if (isSpecialMode) {
        // --- 核心修改在此 ---
        prompt = `你是一个售卖奇幻特殊物品的创意店主。一个顾客搜索了关键词“${query}”。
重要前提：这些商品都将由用户(“我”)购买，并对聊天中的AI角色(“收件人”)使用。因此，所有商品的'功能'都必须是能够在**文字对话中被明确观察和扮演出来**的效果。

请你立即创造并上架 3到5件 与“${query}”相关的商品。
规则:
1.  **描述必须清晰**: 商品的 "description" 必须明确包含 "功能：" (描述一个能**直接改变收件人聊天行为**的效果)、"效果持续：" (单位为“轮对话”)、"副作用：" 和 "副作用持续：" (单位为“轮对话”) 这四个部分。
2.  **价格与副作用**: 价格越高的物品，副作用应该越小或持续时间越短。价格范围在10到5000之间。
3.  **创意示例 (必须参考)**:
    - **改变行为**: '害羞喷雾 (功能：让收件人变得非常害羞和内向，说话小心翼翼。效果持续：10轮对话。副作用：无。)'
    - **改变说话方式**: '诚实豆沙包 (功能：让收件人在接下来的对话中只能说真话。效果持续：3轮对话。副作用：效果结束后会头痛，并在对话中抱怨。副作用持续：5轮对话。)'
    - **改变认知**: '失忆橡皮擦 (功能：让收件人暂时忘记“我”是谁。效果持续：5轮对话。副作用：恢复记忆后会对之前的对话感到困惑。副作用持续：2轮对话。)'
4.  **严格格式**: 你的输出必须是严格的JSON数组格式 [ {商品1}, {商品2}, ... ]，不要有任何额外文字。

每个商品对象的JSON格式如下:
{
  "name": "一个极具创意的、能影响聊天对象的物品名称",
  "description": "一段包含'功能'、'效果持续'、'副作用'和'副作用持续'的描述",
  "price": [一个10到5000之间的随机数字],
  "storeName": "万能杂货铺・奇物部",
  "imagePrompt": "一个用于AI绘画的、描述该奇物的英文关键词短语"
}`;
        // --- 修改结束 ---
    } else {
         // 这是用于生成普通物品的原始指令 (保持不变)
        prompt = `你是一个万能杂货铺的创意店主，你的店里什么都卖，无论是现实存在的还是天马行空的。
一个顾客搜索了关键词“${query}”，但我们的库存里没有这个东西。
请你根据这个关键词，立即创造并上架 3到5件 独一无二但主题相似的商品。
你的任务是为每一件商品生成详细信息。
你的输出必须是严格的 JSON数组 格式，像这样 [ {商品1}, {商品2}, ... ]，不要包含任何额外的解释或文字。

每个商品对象的JSON格式如下:
{
  "name": "一个极具创意的商品名称",
  "description": "一段50字左右，引人入胜的商品描述",
  "price": [一个10到1000之间的随机数字],
  "storeName": "万能杂货铺・创意部",
  "imagePrompt": "一个用于AI绘画的、描述该商品的英文关键词短语"
}`;
    }
    
    const aiResponseText = await callMallApi([{ role: 'user', content: prompt }]);
    const productsData = JSON.parse(aiResponseText.match(/\[[\s\S]*\]/)[0]);

    const newProducts = productsData.map(productData => ({
        ...productData,
        id: `prod_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(productData.imagePrompt)}`,
        likes: 0, saves: 0, comments: []
    }));

    return newProducts;
}

/**
 * 新增：在所有商品（AI生成+自定义）中查找商品
 */
function findProductById(productId) {
    const allProducts = [...(db.mallData.products || []), ...(db.mallData.customProducts || [])];
    return allProducts.find(p => p.id === productId);
}
// ▼▼▼ 使用这个新版本，完整替换文件中旧的 setupMallApp 函数 ▼▼▼
function setupMallApp() {
    // 初始化数据结构 (保持不变)
    if (!db.mallData) {
        db.mallData = { api: {}, products: [], cart: [], likedProducts: [], logistics: [], 
specialItemsEnabled: false // <-- 添加这一行 };
}
    } else {
        if (!db.mallData.cart) db.mallData.cart = [];
        if (!db.mallData.likedProducts) db.mallData.likedProducts = [];
        if (!db.mallData.logistics) db.mallData.logistics = [];
    }
    startGlobalCountdownTimer();
    
    // --- 新增：自定义商品创建逻辑 ---
    const addCustomProductBtn = document.getElementById('add-custom-product-btn');
    const createProductModal = document.getElementById('create-product-modal');
    const createProductForm = document.getElementById('create-product-form');
    const isSpecialToggle = document.getElementById('is-special-product-toggle');
    const specialFields = document.getElementById('special-product-fields');

    addCustomProductBtn.addEventListener('click', () => {
        createProductForm.reset();
        specialFields.classList.remove('visible');
        createProductModal.classList.add('visible');
    });

    isSpecialToggle.addEventListener('change', (e) => {
        specialFields.classList.toggle('visible', e.target.checked);
        // 如果是特殊商品，普通描述变为可选
        document.getElementById('custom-product-description').required = !e.target.checked;
    });

    createProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isSpecial = isSpecialToggle.checked;
        let description = document.getElementById('custom-product-description').value.trim();

        // 如果是特殊商品，则根据专用字段构建描述字符串
        if (isSpecial) {
            const func = document.getElementById('special-product-function').value.trim();
            const duration = document.getElementById('special-product-duration').value;
            const sideEffect = document.getElementById('special-product-side-effect').value.trim();
            const sideEffectDuration = document.getElementById('special-product-side-effect-duration').value;

            if (!func || !duration) {
                showToast('特殊商品的功能和效果持续时间为必填项！');
                return;
            }
            description = `功能：${func} 效果持续：${duration}轮对话`;
            if (sideEffect && sideEffectDuration) {
                description += ` 副作用：${sideEffect} 副作用持续：${sideEffectDuration}轮对话`;
            } else if (sideEffect) {
                description += ` 副作用：${sideEffect}`;
            }
        }
        
        const newProduct = {
            id: `prod_custom_${Date.now()}`,
            name: document.getElementById('custom-product-name').value.trim(),
            price: parseFloat(document.getElementById('custom-product-price').value),
            storeName: document.getElementById('custom-product-store').value.trim(),
            description: description,
            imageUrl: document.getElementById('custom-product-image-url').value.trim() || 'https://i.postimg.cc/PqYkx23B/shop-icon.png',
            likes: 0,
            saves: 0,
            comments: []
        };

        if (!newProduct.name || isNaN(newProduct.price)) {
            showToast('商品名称和价格为必填项！');
            return;
        }
if (!db.mallData.customProducts) {
        db.mallData.customProducts = [];
    }
        db.mallData.customProducts.unshift(newProduct);
        await saveData();

        createProductModal.classList.remove('visible');
        showToast(`商品“${newProduct.name}”已成功创建！`);
        renderMallProducts(); // 刷新商城主页
    });
    // --- 自定义商品逻辑结束 ---

// --- 新增：商城搜索功能事件绑定 ---
    const searchInput = document.getElementById('mall-search-input');
    const searchBtn = document.getElementById('mall-search-btn');
    
    const performSearch = () => {
        const query = searchInput.value.trim();
        handleMallSearch(query);
    };

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    // --- 新增结束 ---
    // --- 个人中心页面的事件委托 ---
    const profileScreen = document.getElementById('mall-profile-screen');
    if (profileScreen) {
        const likedGrid = document.getElementById('liked-products-grid');
        // 为点赞商品网格添加点击事件
        likedGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            if (card && card.dataset.productId) {
                openProductDetail(card.dataset.productId);
            }
        });
        // 为物流入口绑定事件
        document.querySelector('.wallet-action-item[data-target="logistics-screen"]').addEventListener('click', () => {
            renderLogistics();
            switchScreen('logistics-screen');
        });
    }
    // --- 新增事件绑定 ---
    const refreshBtn = document.getElementById('refresh-mall-btn');
    if(refreshBtn) {
        refreshBtn.addEventListener('click', () => generateAndRenderProducts(false));
    }
    const loadMoreIndicator = document.getElementById('load-more-indicator');
    if(loadMoreIndicator) {
        loadMoreIndicator.addEventListener('click', () => generateAndRenderProducts(true));
    }
    // --- 新增结束 ---
    // --- 购物车相关事件绑定 ---
    const cartContainer = document.getElementById('cart-item-list-container');
    const cartCheckoutBtn = document.getElementById('cart-checkout-btn');
    const cartSelectAllBtn = document.getElementById('cart-select-all-btn');
    const cartManageBtn = document.getElementById('cart-manage-btn');
    const cartDeleteSelectedBtn = document.getElementById('cart-delete-selected-btn');
    const cartScreen = document.getElementById('mall-cart-screen');

    if (cartContainer) {
        cartContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.cart-item');
            if (item) {
                toggleCartItemSelection(item.dataset.cartId);
            }
        });
    }
    if (cartCheckoutBtn) cartCheckoutBtn.addEventListener('click', handleCartCheckout);
    if (cartSelectAllBtn) {
        cartSelectAllBtn.addEventListener('click', () => {
            const allCartItems = db.mallData.cart || [];
            const shouldSelectAll = selectedCartItemIds.size < allCartItems.length;
            if (shouldSelectAll) {
                allCartItems.forEach(item => selectedCartItemIds.add(item.cartId));
            } else {
                selectedCartItemIds.clear();
            }
            renderCart();
        });
    }
    if (cartManageBtn) {
        cartManageBtn.addEventListener('click', () => {
            cartScreen.classList.toggle('manage-mode');
            const isInManageMode = cartScreen.classList.contains('manage-mode');
            cartManageBtn.textContent = isInManageMode ? '完成' : '管理';
            if (!isInManageMode) {
                selectedCartItemIds.clear();
                renderCart();
            }
        });
    }
    // 【重要修正】移除删除按钮上的行内 style="display: none;" 后，此逻辑才能生效
    if (cartDeleteSelectedBtn) {
        cartDeleteSelectedBtn.addEventListener('click', async () => {
            if (selectedCartItemIds.size === 0) return showToast('请选择要删除的商品');
            if (confirm(`确定要删除选中的 ${selectedCartItemIds.size} 件商品吗？`)) {
                db.mallData.cart = db.mallData.cart.filter(item => !selectedCartItemIds.has(item.cartId));
                selectedCartItemIds.clear();
                await saveData();
                renderCart();
                showToast('商品已删除');
            }
        });
    }
    
    // --- 新的支付确认页面事件绑定 ---
    document.getElementById('confirm-final-payment-btn').addEventListener('click', async () => {
        const isPayForMe = document.querySelector('.method-item#pay-for-me-btn').classList.contains('selected');

        if (isPayForMe) {
            // 打开代付好友选择列表
            const listEl = document.getElementById('pay-for-me-selection-list');
            listEl.innerHTML = '';
            db.characters.forEach(char => {
                const li = document.createElement('li');
                li.className = 'list-item';
                li.style.cursor = 'pointer';
                li.dataset.charId = char.id;
                li.innerHTML = `<img src="${char.avatar}" class="chat-avatar"><span>${char.remarkName}</span>`;
                listEl.appendChild(li);
            });
            document.getElementById('pay-for-me-select-modal').classList.add('visible');
        } else {
            // 执行自己支付的逻辑
            try {
                await handlePayment(window.currentPurchaseTotal, `购物消费`);
                // --- 核心新增：支付成功后，为每个商品创建送货消息 ---
const recipientId = document.getElementById('payment-recipient-select').value;
const deliveryMinutes = parseInt(document.getElementById('payment-delivery-duration').value, 10);
const recipient = db.characters.find(c => c.id === recipientId);

if (recipient) {
    window.currentPurchaseItems.forEach(item => {
        const deliveryMessage = {
            id: `msg_delivery_${Date.now()}_${item.id}`,
            role: 'user',
            content: `[我为${recipient.remarkName}购买了${item.name}]`,
            parts: [],
            timestamp: Date.now(),
            senderId: 'user_me',
            deliveryData: {
                productId: item.id,
                productName: item.name,
                productImage: item.imageUrl,
                price: item.price,
                quantity: 1, // 购物车商品默认为1
                style: '默认款式',
                eta: Date.now() + deliveryMinutes * 60 * 1000,
                delivered: false
            }
        };
        recipient.history.push(deliveryMessage);
    });
}
// --- 新增结束 ---
                // 支付成功，将商品添加到物流
                addItemsToLogistics(window.currentPurchaseItems, null); // null 表示是用户自己买的
                
                // 添加到商城付款记录
                if (!db.mallData.paymentHistory) db.mallData.paymentHistory = [];
                db.mallData.paymentHistory.unshift({
                    id: `pay_${Date.now()}`,
                    timestamp: Date.now(),
                    description: `购物车结算 (${window.currentPurchaseItems.length}件)`,
                    total: window.currentPurchaseTotal
                });

                // 从购物车移除已购商品
                const purchasedIds = new Set(window.currentPurchaseItems.map(item => item.id));
                db.mallData.cart = db.mallData.cart.filter(item => !purchasedIds.has(item.productId));
                selectedCartItemIds.clear();

                await saveData();
                showToast('支付成功！可在“我的物流”中查看');
                switchScreen('mall-cart-screen');
                renderCart();

            } catch (error) {
                showToast(error.message);
            }
        }
    });
    
    // 支付方式选择
    document.querySelector('.payment-methods').addEventListener('click', (e) => {
        const methodItem = e.target.closest('.method-item');
        if (methodItem) {
            document.querySelectorAll('.payment-methods .method-item').forEach(el => el.classList.remove('selected'));
            methodItem.classList.add('selected');
            document.getElementById('confirm-final-payment-btn').textContent = methodItem.id === 'pay-for-me-btn' ? '选择好友' : '确认支付';
        }
    });

    // 代付好友选择列表点击事件
    document.getElementById('pay-for-me-selection-list').addEventListener('click', async (e) => {
        const item = e.target.closest('.list-item');
        if (item && item.dataset.charId) {
            const charId = item.dataset.charId;
            await sendPaymentRequestCard(charId, window.currentPurchaseItems, window.currentPurchaseTotal);
            document.getElementById('pay-for-me-select-modal').classList.remove('visible');
            showToast(`已向 ${db.characters.find(c=>c.id === charId).remarkName} 发送代付请求`);
            switchScreen('chat-list-screen'); // 直接跳转到聊天列表，让用户看到卡片
        }
    });

    document.getElementById('cancel-pay-for-me-btn').addEventListener('click', () => {
        document.getElementById('pay-for-me-select-modal').classList.remove('visible');
    });

        // --- 商品详情页底部按钮的事件委托 ---
    const detailFooterNav = document.getElementById('detail-footer-nav');
    if (detailFooterNav) {
        detailFooterNav.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;
            
            const detailScreen = document.getElementById('product-detail-screen');
            const currentProductId = detailScreen.dataset.productId;
            if (!currentProductId) return;

            const btnText = btn.textContent;
            if (btnText.includes('购买')) {
                openPurchaseModal(currentProductId);
            } else if (btnText.includes('购物车')) {
                addToCart(currentProductId);
            } else if (btnText.includes('收藏')) {
                toggleProductLike(currentProductId);
            } else if (btnText.includes('代付')) {
                handlePayForMeRequest(currentProductId);
            }
        });
    }
        // --- 购买流程中各个弹窗按钮的事件绑定 ---
    const confirmRecipientBtn = document.getElementById('confirm-recipient-btn');
    if (confirmRecipientBtn) confirmRecipientBtn.addEventListener('click', handleRecipientConfirmation);

    const increaseQuantityBtn = document.getElementById('increase-quantity-btn');
    if (increaseQuantityBtn) increaseQuantityBtn.addEventListener('click', () => updateQuantity(1));
    
    const decreaseQuantityBtn = document.getElementById('decrease-quantity-btn');
    if (decreaseQuantityBtn) decreaseQuantityBtn.addEventListener('click', () => updateQuantity(-1));

    const styleOptionsContainer = document.getElementById('style-options-container');
    if (styleOptionsContainer) {
        styleOptionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('style-option-btn')) {
                document.querySelectorAll('.style-option-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }
    
    const confirmPurchaseBtn = document.getElementById('confirm-purchase-btn');
    if (confirmPurchaseBtn) confirmPurchaseBtn.addEventListener('click', handleFinalPurchaseConfirmation);
    
    const confirmDeliveryTimeBtn = document.getElementById('confirm-delivery-time-btn');
    if (confirmDeliveryTimeBtn) confirmDeliveryTimeBtn.addEventListener('click', completePurchase);

    document.querySelectorAll('.close-purchase-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal.id === 'purchase-modal') {
                const productId = modal.dataset.productId;
                if (productId && confirm('要将这个宝贝加入购物车吗？')) {
                    addToCart(productId, true);
                }
            }
            modal.classList.remove('visible');
        });
    });

    const cartItemList = document.getElementById('cart-item-list');
    if(cartItemList) {
        cartItemList.addEventListener('click', e => {
            if(e.target.classList.contains('to-pay-btn')) {
                openPurchaseModal(e.target.dataset.productId);
            }
        });
    }
    document.querySelectorAll('.mall-bottom-nav').forEach(nav => {
    nav.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item[data-target]');
        if (navItem) {
            const targetScreenId = navItem.dataset.target;
            // 如果是点击购物车或个人中心，先渲染对应内容
            if (targetScreenId === "mall-cart-screen") renderCart();
            if (targetScreenId === "mall-profile-screen") renderLikedProducts();
            renderPaymentHistory();
            // ...
        }
    });
});
    // --- 其他通用事件绑定 (保持不变) ---
    document.querySelectorAll('.mall-bottom-nav').forEach(nav => {
        nav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item[data-target]');
            if (navItem) {
                const targetScreenId = navItem.dataset.target;
                // 如果是点击购物车或个人中心，先渲染对应内容
                if (targetScreenId === "mall-cart-screen") renderCart();
                if (targetScreenId === "mall-profile-screen") renderLikedProducts();
                renderPaymentHistory(); 
                switchScreen(targetScreenId);
                nav.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                navItem.classList.add('active');
            }
        });
    });

    const mallAppIcon = document.querySelector('.app-icon[data-target="mall-screen"]');
    if (mallAppIcon) {
        mallAppIcon.addEventListener('click', () => {
            if (db.mallData.products.length === 0) {
                generateAndRenderProducts(false);
            } else {
                renderMallProducts();
            }
        });
    }

    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            if (card && card.dataset.productId) {
                document.getElementById('product-detail-screen').dataset.productId = card.dataset.productId;
                openProductDetail(card.dataset.productId);
            }
        });
    }
    
    
    // --- 商城API设置逻辑 ---
    const mallApiForm = document.getElementById('mall-api-form');
    if(mallApiForm) {
        const mallFetchBtn = document.getElementById('mall-fetch-models-btn');
        const mallApiUrl = document.getElementById('mall-api-url');
        const mallApiKey = document.getElementById('mall-api-key');
        const mallApiModel = document.getElementById('mall-api-model');
const specialItemsToggle = document.getElementById('special-items-toggle');
        mallApiUrl.value = db.mallData.api.url || '';
        specialItemsToggle.checked = db.mallData.api.specialItemsEnabled || false;
        mallApiKey.value = db.mallData.api.key || '';
        if (db.mallData.api.model) {
            mallApiModel.innerHTML = `<option value="${db.mallData.api.model}">${db.mallData.api.model}</option>`;
        }
        
        mallFetchBtn.addEventListener('click', async () => {
            const url = mallApiUrl.value.trim();
            const key = mallApiKey.value.trim();
            if (!url || !key) return showToast('请填写API地址和密钥');
            const endpoint = `${url.replace(/\/$/, '')}/v1/models`;
            mallFetchBtn.classList.add('loading');
            try {
                const response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${key}` } });
                if (!response.ok) throw new Error(`网络错误: ${response.status}`);
                const data = await response.json();
                mallApiModel.innerHTML = data.data.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
                showToast('模型列表拉取成功');
            } catch (error) {
                showToast(`拉取失败: ${error.message}`);
            } finally {
                mallFetchBtn.classList.remove('loading');
            }
        });

        mallApiForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // *** FIX: Save all settings into the api object correctly ***
    db.mallData.api = {
        url: mallApiUrl.value,
        key: mallApiKey.value,
        model: mallApiModel.value,
        specialItemsEnabled: specialItemsToggle.checked
    };
    await saveData();
    showToast('商城API设置已保存！');
});
}
}

// 在 setupMallApp 函数的末尾添加
// 物流页面渲染
function renderLogistics() {
    const container = document.getElementById('logistics-list-container');
    const placeholder = document.getElementById('no-logistics-placeholder');
    const logistics = db.mallData.logistics || [];

    if (logistics.length === 0) {
        container.innerHTML = '';
        placeholder.style.display = 'block';
        return;
    }
    placeholder.style.display = 'none';
    container.innerHTML = '';

    logistics.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'logistics-item';
        itemEl.innerHTML = `
            <div class="logistics-header">
                <span>订单号: ${item.orderId.slice(-8)}</span>
                <span class="logistics-status">${item.status}</span>
            </div>
            <div class="logistics-body">
                <img src="${item.productImage}" alt="${item.productName}">
                <div class="logistics-info">
                    <p class="item-name">${item.productName}</p>
                    <p class="eta" data-countdown-type="delivery" data-eta="${item.eta}">正在计算送达时间...</p>
                    <p class="recipient-info" style="font-size: 12px; color: #888;">收件人: ${item.recipientName}</p>
                </div>
            </div>
        `;
        container.appendChild(itemEl);
    });
}

// 物流页面导航
document.querySelector('.wallet-action-item[data-target="logistics-screen"]').addEventListener('click', () => {
    renderLogistics();
    switchScreen('logistics-screen');
});
// ▼▼▼ 将这个新函数添加到 setupMallApp 函数内部 ▼▼▼
// ▼▼▼ 将以下所有新函数，添加到 setupMallApp 函数的内部 ▼▼▼

/**
 * [已修复] 将商品添加到物流列表的函数，增加了送达时间参数
 * @param {Array} items - 商品对象数组
 * @param {string|null} purchasedByAiId - 如果是AI代付，则传入AI的ID
 * @param {number} deliveryMinutes - 自定义的送达分钟数
 */
function addItemsToLogistics(items, purchasedByAiId = null, deliveryMinutes = 5) {
    if (!db.mallData.logistics) db.mallData.logistics = [];

    // 确定收件人信息
    let recipientId, recipientName;
    if (purchasedByAiId) {
        // 如果是AI代付，收件人是“我”
        const anyCharacter = db.characters[0];
        recipientName = anyCharacter ? anyCharacter.myName : '我';
    } else {
        // 如果是用户自己购买，根据选择确定收件人
        recipientId = purchaseState.recipientId;
        const recipientChar = db.characters.find(c => c.id === recipientId);
        recipientName = recipientChar ? recipientChar.remarkName : '未知收件人';
    }

    items.forEach(item => {
        db.mallData.logistics.unshift({
            orderId: `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            productId: item.id,
            productName: item.name,
            productImage: item.imageUrl,
            purchasedByAiId: purchasedByAiId, // 记录是谁付的款
            recipientName: recipientName,
            // --- 核心修复 3：使用传入的 deliveryMinutes 参数计算送达时间 ---
            eta: Date.now() + deliveryMinutes * 60 * 1000,
            status: '待发货'
        });
    });
}
/**
 * 向AI发送代付请求卡片
 */
async function sendPaymentRequestCard(charId, items, total) {
    const character = db.characters.find(c => c.id === charId);
    if (!character) return;

    const message = {
        id: `msg_pay_req_${Date.now()}`,
        role: 'user',
        content: `[我向 ${character.remarkName} 发起代付请求]`,
        parts: [],
        timestamp: Date.now(),
        paymentRequestData: {
            status: 'pending',
            amount: total,
            items: items.map(item => ({ id: item.id, name: item.name, imageUrl: item.imageUrl })),
            requesterName: character.myName
        }
    };
    character.history.push(message);
    await saveData();
}

/**
 * 处理AI的代付决定（同意或拒绝）
 */
/**
 * 唯一的代付决策处理函数
 * @param {string} messageId - 消息ID
 * @param {string} decision - 'paid' 或 'declined'
 * @param {boolean} hasContent - AI是否已经在当前回复中包含了文字内容
 */
async function handleAiPaymentDecision(messageId, decision, hasContent = false) {
    const character = db.characters.find(c => c.id === window.currentChatId);
    if (!character) return;
    
    const message = character.history.find(m => m.id === messageId);
    if (!message || !message.paymentRequestData) return;

    // 1. 在数据中更新卡片状态
    if (message.paymentRequestData.status === decision) return; // 如果状态没变，直接跳过，防止重复触发
    message.paymentRequestData.status = decision;

    // 立即保存并刷新界面，让卡片变色
    await saveData();
    window.renderMessages(false, true); 

    // --- 核心去重逻辑 ---
    // 如果 hasContent 为 true，说明 AI 是在回复过程中“顺便”触发了支付（即 AI 正在说话）
    // 这时我们只需要更新卡片状态，【绝对不能】再次向历史记录塞指令，否则会无限循环
    if (hasContent) {
        if (decision === 'paid') {
            window.addItemsToLogistics(message.paymentRequestData.items, character.id);
        }
        return; // 直接结束，不执行下面的 AI 触发逻辑
    }

    // --- 如果是手动点击按钮触发，或者是 AI 只发了指令没说话，才执行下面的逻辑 ---
    let contextMessageContent = '';
    if (decision === 'paid') {
        window.addItemsToLogistics(message.paymentRequestData.items, character.id);
        const notifText = `<strong>${character.remarkName}</strong> 已为你支付了商品。`;
        window.addNotificationToQueue({
            avatar: character.avatar,
            text: notifText,
            chatId: character.id,
            type: 'private'
        });
        contextMessageContent = `[system: 你刚刚同意并支付了代付请求。请在聊天中告知对方你已经付款了，并根据你的人设说些什么。]`;
    } else {
        contextMessageContent = `[system: 你刚刚拒绝了代付请求。请告知对方你拒绝的原因。]`;
    }

    // 将系统指令存入历史
    const contextMessage = {
        id: `msg_pay_resp_${Date.now()}`,
        role: 'user',
        content: contextMessageContent,
        parts: [{ type: 'text', text: contextMessageContent }],
        timestamp: Date.now()
    };
    character.history.push(contextMessage);
    
    await saveData();

    // 只有在确定没在生成中时，才触发回复
    if (!window.isGenerating) {
        window.getAiReply();
    }
}
/**
 * 渲染物流列表页面
 */
function renderLogistics() {
    const container = document.getElementById('logistics-list-container');
    const placeholder = document.getElementById('no-logistics-placeholder');
    const logistics = db.mallData.logistics || [];

    if (logistics.length === 0) {
        container.innerHTML = '';
        placeholder.style.display = 'block';
        return;
    }
    placeholder.style.display = 'none';
    container.innerHTML = '';

    logistics.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'logistics-item';
        itemEl.innerHTML = `
            <div class="logistics-header">
                <span>订单号: ${item.orderId.slice(-8)}</span>
                <span class="logistics-status">${item.status}</span>
            </div>
            <div class="logistics-body">
                <img src="${item.productImage}" alt="${item.productName}">
                <div class="logistics-info">
                    <p class="item-name">${item.productName}</p>
                    <p class="eta" data-countdown-type="delivery" data-eta="${item.eta}">正在计算送达时间...</p>
                    <p class="recipient-info">收件人: ${item.recipientName}</p>
                </div>
            </div>
        `;
        container.appendChild(itemEl);
    });
}
async function callMallApi(messages) {
    const mallApi = db.mallData.api;
    const mainApi = db.apiSettings;
    let apiToUse = (mallApi && mallApi.url && mallApi.key && mallApi.model) ? mallApi : mainApi;
    if (!apiToUse || !apiToUse.url || !apiToUse.key || !apiToUse.model) {
        throw new Error('商城功能未找到有效的API配置。');
    }
    return callAiApi(messages, apiToUse);
}

// === [V2] 替换旧的 generateAndRenderProducts 函数 ===
async function generateAndRenderProducts(append = false) {
    if (isGeneratingProducts) return;
    isGeneratingProducts = true;
    const grid = document.getElementById('product-grid');
    const loadIndicator = document.getElementById('load-more-indicator');
    const refreshBtnIcon = document.querySelector('#refresh-mall-btn svg');
    
    if (append) {
        if(loadIndicator) loadIndicator.classList.add('loading');
    } else {
        if(grid) grid.innerHTML = `<p class="placeholder-text">正在为您发现好物...</p>`;
        if (refreshBtnIcon) refreshBtnIcon.classList.add('rotating');
    }

    try {
        let prompt;
        const isSpecialMode = db.mallData.api.specialItemsEnabled;

        if (isSpecialMode) {
            // --- 核心修改在此 ---
            prompt = `你是一个售卖奇幻特殊物品的创意店主。
重要前提：这些商品都将由用户(“我”)购买，并对聊天中的AI角色(“收件人”)使用。因此，所有商品的'功能'都必须是能够在**文字对话中被明确观察和扮演出来**的效果。

请你立即创造并上架 10件 独一无二的特殊商品。
规则:
1.  **描述必须清晰**: 商品的 "description" 必须明确包含 "功能：" (描述一个能**直接改变收件人聊天行为**的效果)、"效果持续：" (单位为“轮对话”)、"副作用：" 和 "副作用持续：" (单位为“轮对话”) 这四个部分。
2.  **价格与副作用**: 价格越高的物品，副作用应该越小或持续时间越短。价格范围在10到5000之间。
3.  **创意示例 (必须参考)**:
    - **改变行为**: '害羞喷雾 (功能：让收件人变得非常害羞和内向，说话小心翼翼。效果持续：10轮对话。副作用：无。)'
    - **改变说话方式**: '诚实豆沙包 (功能：让收件人在接下来的对话中只能说真话。效果持续：3轮对话。副作用：效果结束后会头痛，并在对话中抱怨。副作用持续：5轮对话。)'
    - **改变认知**: '失忆橡皮擦 (功能：让收件人暂时忘记“我”是谁。效果持续：5轮对话。副作用：恢复记忆后会对之前的对话感到困惑。副作用持续：2轮对话。)'
4.  **严格格式**: 你的输出必须是严格的JSON数组格式 [ {商品1}, {商品2}, ... ]，不要有任何额外文字。

每个商品对象的JSON格式如下:
{
  "name": "一个极具创意的、能影响聊天对象的物品名称",
  "description": "一段包含'功能'、'效果持续'、'副作用'和'副作用持续'的描述",
  "price": [一个10到5000之间的随机数字],
  "storeName": "万能杂货铺・奇物部",
  "imagePrompt": "一个用于AI绘画的、描述该奇物的英文关键词短语"
}`;
            // --- 修改结束 ---
        } else {
            // 这是原来的普通商品指令 (保持不变)
            prompt = `你是一个创意电商策划。请模仿拼多多或淘宝的风格，生成10个虚构的、新潮有趣的商品列表。商品类型要多样化，必须包含现代时尚物品（如衣服、包包、首饰）和来自不同幻想世界观的特殊物品。例如：ABO世界观的顶级抑制剂、无限流副本的保命道具、修仙世界的丹药法宝、赛博朋克义体等。每个商品需包含：一个吸引人的'name'，一段50字左右的'description'，一个随机的'price' (10-1000之间)，一个'storeName'，以及一个用于AI生图的英文'imagePrompt'。请严格以JSON数组格式返回。`;
        }

        const aiResponseText = await callMallApi([{ role: 'user', content: prompt }]);
        const productsData = JSON.parse(aiResponseText.match(/\[[\s\S]*\]/)[0]);
        const newProducts = productsData.map(p => ({ ...p, id: `prod_${Date.now()}_${Math.random()}`, imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(p.imagePrompt)}`, likes: Math.floor(Math.random() * 5000), saves: Math.floor(Math.random() * 8000), comments: [] }));
        
        if (append) {
            db.mallData.products.push(...newProducts);
            renderNewProducts(newProducts);
        } else {
            db.mallData.products = newProducts;
            renderMallProducts();
        }
        await saveData();
    } catch (error) {
        console.error("生成商品失败:", error);
        if (!append && grid) {
            grid.innerHTML = `<p class="placeholder-text" style="color:red;">商品加载失败: ${error.message}</p>`;
        }
        showToast('商品加载失败');
    } finally {
        isGeneratingProducts = false;
        if (loadIndicator) loadIndicator.classList.remove('loading');
        if (refreshBtnIcon) refreshBtnIcon.classList.remove('rotating');
    }
}

function renderMallProducts(productsToRender) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    // 1. 优先渲染用户自定义的商品
    const customProducts = db.mallData.customProducts || [];
    if (customProducts.length > 0 && !productsToRender) { // 仅在非搜索模式下显示分类
        const title = document.createElement('h3');
        title.textContent = '个性商品';
        title.style.cssText = "grid-column: 1 / -1; margin: 10px 0; color: #555;";
        grid.appendChild(title);
        customProducts.forEach(product => grid.appendChild(createProductCardElement(product)));
    }

    // 2. 渲染AI生成的商品
    const aiProducts = productsToRender || db.mallData.products;
    if (aiProducts.length > 0 && !productsToRender) {
        const title = document.createElement('h3');
        title.textContent = '万能杂货铺';
        title.style.cssText = "grid-column: 1 / -1; margin: 20px 0 10px; color: #555;";
        grid.appendChild(title);
    }
    
    if (aiProducts.length > 0) {
        aiProducts.forEach(product => grid.appendChild(createProductCardElement(product)));
    }

    if (grid.innerHTML === '') {
        grid.innerHTML = `<p class="placeholder-text">空空如也...</p>`;
    }
}

function renderNewProducts(newProducts) {
    const grid = document.getElementById('product-grid');
    if(grid) {
        newProducts.forEach(product => grid.appendChild(createProductCardElement(product)));
    }
}

function createProductCardElement(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    card.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
        <div class="product-info">
            <p class="product-title">${product.name}</p>
            <div class="product-price-row">
                <span class="product-price">${product.price.toFixed(2)}</span>
                <span class="product-sales">已售${product.sales || Math.floor(Math.random()*1000)+'+'}</span>
            </div>
        </div>`;
    return card;
}

function openProductDetail(productId) {
    const product = findProductById(productId);
    if (!product) return;
    document.getElementById('detail-product-image').src = product.imageUrl;
    document.getElementById('detail-product-price').textContent = `¥${product.price.toFixed(2)}`;
    document.getElementById('detail-product-likes').textContent = `❤️ ${product.likes}`;
    document.getElementById('detail-product-saves').textContent = `⭐ ${product.saves}`;
    document.getElementById('detail-product-title').textContent = product.name;
    document.getElementById('detail-product-description').textContent = product.description;
    document.getElementById('detail-store-name').textContent = product.storeName;
    updateLikeButtonState(productId);
    renderComments(productId);
    const loadMoreBtn = document.getElementById('load-more-comments-btn');
    if (loadMoreBtn) loadMoreBtn.onclick = () => generateAndRenderComments(productId);
    switchScreen('product-detail-screen');
}

function renderComments(productId) {
    const product = findProductById(productId);
    const list = document.getElementById('comment-list');
    if(!list) return;
    list.innerHTML = '';
    if (!product || !product.comments || product.comments.length === 0) {
        list.innerHTML = `<li class="placeholder-text" style="padding: 20px 0;">暂无评价，点击下方按钮生成吧！</li>`;
        return;
    }
    product.comments.forEach(comment => {
        const item = document.createElement('li');
        item.className = 'comment-item';
        item.innerHTML = `<div class="comment-header"><img src="${comment.avatar}" class="comment-avatar"><span class="comment-author">${comment.author}</span></div><p class="comment-text">${comment.text}</p>${comment.sellerReply ? `<div class="seller-reply">${comment.sellerReply}</div>` : ''}`;
        list.appendChild(item);
    });
}

async function generateAndRenderComments(productId) {
    const product = findProductById(productId);
    if (!product) return;
    const loadMoreBtn = document.getElementById('load-more-comments-btn');
    loadMoreBtn.textContent = '生成中...';
    loadMoreBtn.disabled = true;
    try {
        const prompt = `你是一个社交媒体评论专家。请为以下商品生成5条新潮、真实的买家评论。评论要使用网络热梗、潮流用语和emoji，风格要多样化。同时，为每条评论生成一句商家的回复。商品信息：\n名称: ${product.name}\n描述: ${product.description}\n请严格以JSON数组格式返回，每个对象包含 'author', 'avatar'(使用 https://i.postimg.cc/ VL1g9G5V/store-avatar.png), 'text', 'sellerReply' 四个字段。`;
        const aiResponseText = await callMallApi([{ role: 'user', content: prompt }]);
        const newComments = JSON.parse(aiResponseText.match(/\[[\s\S]*\]/)[0]);
        product.comments.push(...newComments);
        await saveData();
        renderComments(productId);
        showToast('已加载新的评论！');
    } catch (error) {
        showToast(`生成评论失败: ${error.message}`);
    } finally {
        loadMoreBtn.textContent = '加载更多评价';
        loadMoreBtn.disabled = false;
    }
}

async function toggleProductLike(productId) {
    const likedIndex = db.mallData.likedProducts.indexOf(productId);
    if (likedIndex > -1) {
        db.mallData.likedProducts.splice(likedIndex, 1);
        showToast('已取消点赞');
    } else {
        db.mallData.likedProducts.push(productId);
        showToast('点赞成功！');
    }
    await saveData();
    updateLikeButtonState(productId);
}

function updateLikeButtonState(productId) {
    const likeBtn = document.getElementById('like-product-btn');
    if (likeBtn) {
        likeBtn.classList.toggle('liked', db.mallData.likedProducts.includes(productId));
    }
}

function renderLikedProducts() {
    const grid = document.getElementById('liked-products-grid');
    const placeholder = document.getElementById('no-liked-products');
    if(!grid || !placeholder) return;
    grid.innerHTML = '';
    if (db.mallData.likedProducts.length === 0) {
        placeholder.style.display = 'block';
        return;
    }
    placeholder.style.display = 'none';
    [...db.mallData.likedProducts].reverse().forEach(productId => {
        const product = findProductById(productId);
        if (product) grid.appendChild(createProductCardElement(product));
    });
}

function enterLikesSelectionMode() {
    isLikesSelectionMode = true;
    document.getElementById('mall-profile-screen').classList.add('selection-mode-active');
    updateCheckoutBar();
}

function exitLikesSelectionMode() {
    isLikesSelectionMode = false;
    document.getElementById('mall-profile-screen').classList.remove('selection-mode-active');
    selectedLikedProductIds = [];
    document.querySelectorAll('#liked-products-grid .product-card.selected').forEach(el => el.classList.remove('selected'));
}

function toggleLikedProductSelection(productId) {
    const index = selectedLikedProductIds.indexOf(productId);
    if (index > -1) {
        selectedLikedProductIds.splice(index, 1);
    } else {
        selectedLikedProductIds.push(productId);
    }
    document.querySelector(`#liked-products-grid .product-card[data-product-id="${productId}"]`).classList.toggle('selected');
    updateCheckoutBar();
}

function updateCheckoutBar() {
    let totalPrice = 0;
    selectedLikedProductIds.forEach(id => {
        const product = db.mallData.products.find(p => p.id === id);
        if (product) totalPrice += product.price;
    });
    document.getElementById('likes-total-price').textContent = `总计: ¥${totalPrice.toFixed(2)}`;
    document.getElementById('checkout-likes-btn').disabled = selectedLikedProductIds.length === 0;
}

function handleLikesCheckout() {
    purchaseState.multiItems = selectedLikedProductIds.map(id => db.mallData.products.find(p => p.id === id)).filter(Boolean);
    if (purchaseState.multiItems.length === 0) return showToast("请至少选择一件商品");
    
    const modal = document.getElementById('purchase-modal');
    document.getElementById('purchase-product-image').src = 'https://i.postimg.cc/PqYkx23B/shop-icon.png';
    const totalPrice = purchaseState.multiItems.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('purchase-product-price').textContent = `¥${totalPrice.toFixed(2)}`;
    document.getElementById('purchase-product-name').textContent = `${purchaseState.multiItems.length}件商品`;
    renderRecipientList();
    modal.classList.add('visible');
}

async function addToCart(productId, silent = false) {
    if (!productId) return;

    // --- 核心修改：同时检查AI商品和自定义商品 ---
    const allProducts = [...(db.mallData.products || []), ...(db.mallData.customProducts || [])];
    const productExists = allProducts.some(p => p.id === productId);
    
    if (!productExists) {
        if (!silent) showToast('错误：找不到该商品');
        return;
    }
    // --- 修改结束 ---

    const existingItem = db.mallData.cart.find(item => item.productId === productId);
    if (existingItem) {
        if (!silent) showToast('宝贝已在购物车中');
        return;
    }
    db.mallData.cart.push({
        cartId: `cart_${Date.now()}`,
        productId: productId,
        paymentDeadline: Date.now() + 30 * 60 * 1000
    });
    await saveData();
    if (!silent) {
        showToast('宝贝已加入购物车，请在30分钟内支付哦');
        renderCart();
        switchScreen('mall-cart-screen');
    }
}
function openPurchaseModal(productId) {
    const product = findProductById(productId); // 使用这个辅助函数
    if (!product) {
        // 如果找不到商品，给出明确提示并中止
        showToast('错误：找不到该商品信息。');
        return;
    }
    purchaseState = { productId, recipientId: null, quantity: 1, style: '默认款式', multiItems: [] };
    const modal = document.getElementById('purchase-modal');
    modal.dataset.productId = productId;
    modal.querySelector('h5').textContent = '选择收货人';
    document.getElementById('confirm-recipient-btn').textContent = '确定';
    document.getElementById('purchase-product-image').src = product.imageUrl;
    document.getElementById('purchase-product-price').textContent = `¥${product.price.toFixed(2)}`;
    document.getElementById('purchase-product-name').textContent = product.name;
    renderRecipientList();
    modal.classList.add('visible');
}

function renderRecipientList() {
    const container = document.getElementById('recipient-selection-list');
    if(!container) return;
    container.innerHTML = '';
    db.characters.forEach(char => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `<input type="radio" name="recipient" value="${char.id}" id="recipient-${char.id}"><label for="recipient-${char.id}" style="display:flex; align-items:center; width:100%; gap:10px;"><img src="${char.avatar}" class="chat-avatar"><div class="item-details"><div class="item-name">${char.remarkName}</div></div></label>`;
        container.appendChild(li);
    });
}

/**
 * [已修复] 处理收货人确认，并根据流程分发到“找人代付”或“自己购买”
 */
async function handleRecipientConfirmation() {
    const selectedRecipient = document.querySelector('input[name="recipient"]:checked');
    if (!selectedRecipient) {
        showToast('请选择一个收货人');
        return;
    }
    purchaseState.recipientId = selectedRecipient.value;
    const recipientChar = db.characters.find(c => c.id === purchaseState.recipientId);

    // 关闭选择弹窗
    document.getElementById('purchase-modal').classList.remove('visible');

    // --- 核心修复逻辑 ---
    // 判断是否为“找人代付”流程
    if (purchaseState.isPayForMe) {
        // *** 核心修改：使用 findProductById 查找商品 ***
        const product = findProductById(purchaseState.productId);
        if (!product || !recipientChar) {
            showToast('错误：找不到商品或代付人');
            return;
        }

        // 调用函数，向AI发送代付请求卡片
        await sendPaymentRequestCard(recipientChar.id, [product], product.price);

        showToast(`已向 ${recipientChar.remarkName} 发送代付请求`);
        
        // (可选, 但建议保留) 自动跳转到与该AI的聊天界面
        window.currentChatId = recipientChar.id;
        currentChatType = 'private';
        window.openChatRoom(window.currentChatId, currentChatType);

    } else if (purchaseState.multiItems.length > 0) {
        // 这是原有的逻辑：处理从收藏夹或购物车发起的“多商品结算”
        document.getElementById('delivery-countdown-modal').classList.add('visible');
    } else {
        // 这是原有的逻辑：处理正常的“单品自己购买”流程
        openOptionsModal();
    }
}
function openOptionsModal() {
	   const product = findProductById(purchaseState.productId);
    if (!product) { // 增加安全检查
        showToast("打开商品选项失败：找不到商品。");
        return;
    }
    const modal = document.getElementById('product-options-modal');
    modal.dataset.productId = purchaseState.productId;
    document.getElementById('options-product-image').src = product.imageUrl;
    document.getElementById('options-product-price').textContent = `¥${product.price.toFixed(2)}`;
    document.getElementById('options-product-name').textContent = product.name;
    document.getElementById('purchase-quantity-input').value = 1;
    modal.classList.add('visible');
}

function updateQuantity(amount) {
    const input = document.getElementById('purchase-quantity-input');
    let currentValue = parseInt(input.value, 10);
    currentValue += amount;
    if (currentValue < 1) currentValue = 1;
    input.value = currentValue;
}



// ▼▼▼ 用这个新版本，完整替换文件中旧的 renderCart 函数 ▼▼▼
function renderCart() {
    const container = document.getElementById('cart-item-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (!db.mallData.cart || db.mallData.cart.length === 0) {
        container.innerHTML = '<p class="placeholder-text">购物车是空的哦，快去逛逛吧~</p>';
        updateCartCheckoutBar();
        return;
    }

    // 将AI商品和自定义商品合并，以便查找
    const allProducts = [...(db.mallData.products || []), ...(db.mallData.customProducts || [])];

    // 按店铺对商品进行分组
    const groupedByStore = db.mallData.cart.reduce((acc, cartItem) => {
        const product = allProducts.find(p => p.id === cartItem.productId);
        if (product) {
            const storeName = product.storeName || '官方旗舰店';
            if (!acc[storeName]) {
                acc[storeName] = [];
            }
            acc[storeName].push({ ...cartItem, product });
        }
        return acc;
    }, {});

    // 渲染每个店铺的商品
    for (const storeName in groupedByStore) {
        const storeGroupEl = document.createElement('div');
        storeGroupEl.className = 'cart-store-group';

        const storeHeaderEl = document.createElement('div');
        storeHeaderEl.className = 'cart-store-header';
        storeHeaderEl.innerHTML = `<span>${storeName}</span>`;
        storeGroupEl.appendChild(storeHeaderEl);

        groupedByStore[storeName].forEach(item => {
            const isSelected = selectedCartItemIds.has(item.cartId);
            const itemEl = document.createElement('div');
            itemEl.className = `cart-item ${isSelected ? 'selected' : ''}`;
            itemEl.dataset.cartId = item.cartId;
            itemEl.innerHTML = `
                <div class="cart-item-selector"></div>
                <img src="${item.product.imageUrl}" class="cart-item-image">
                <div class="cart-item-details">
                    <p class="cart-item-title">${item.product.name}</p>
                    <p class="cart-item-price">¥${item.product.price.toFixed(2)}</p>
                </div>
            `;
            storeGroupEl.appendChild(itemEl);
        });
        container.appendChild(storeGroupEl);
    }
    
    updateCartCheckoutBar();
}
/**
 * [已修复] 启动一个全局定时器来管理所有倒计时显示
 */
function startGlobalCountdownTimer() {
    if (globalCountdownInterval) clearInterval(globalCountdownInterval);

    globalCountdownInterval = setInterval(() => {
        document.querySelectorAll('[data-countdown-type]').forEach(async (el) => {
            const eta = parseInt(el.dataset.eta, 10);
            const remaining = eta - Date.now();
            
            if (remaining > 0) {
                const minutes = Math.floor((remaining / 1000 / 60) % 60).toString().padStart(2, '0');
                const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                
                if (el.dataset.countdownType === 'cart') {
                    el.textContent = `支付剩余 ${minutes}:${seconds}`;
                } else if (el.dataset.countdownType === 'delivery') {
                    el.textContent = `预计送达: ${hours > 0 ? hours + '小时' : ''}${minutes}分${seconds}秒`;
                }
            } else {
                if (el.dataset.countdownType === 'cart') {
                    el.textContent = '已失效';
                } else if (el.dataset.countdownType === 'delivery') {
                    el.textContent = '已送达';
                    
                    // --- 核心修复逻辑开始 ---
                    // 查找当前倒计时元素所在的整个物流项目卡片
                    const logisticsItem = el.closest('.logistics-item');
                    if (logisticsItem) {
                        // 在卡片内找到顶部的状态标签
                        const statusHeader = logisticsItem.querySelector('.logistics-status');
                        if (statusHeader) {
                            // 将“待发货”更新为“已送达”
                            statusHeader.textContent = '已送达';
                        }
                    }
                    // --- 核心修复逻辑结束 ---
                    
                    const messageWrapper = el.closest('.message-wrapper');
                    if (messageWrapper) {
                        await notifyAiOfDelivery(messageWrapper.dataset.id);
                        el.removeAttribute('data-countdown-type');
                    }
                }
            }
        });
    }, 1000);
}
/**
 * [V3.1 | 已修复自定义商品] 当倒计时结束后，通知AI收货，并激活特殊物品效果
 */
async function notifyAiOfDelivery(messageId) {
    for (const char of db.characters) {
        const message = char.history.find(m => m.id === messageId);
        if (message && message.deliveryData && !message.deliveryData.delivered) {
            
            message.deliveryData.delivered = true;

            // --- 核心修改：使用 findProductById 查找所有商品 ---
            const product = findProductById(message.deliveryData.productId);
            // --- 修改结束 ---

            let effectDescriptionForAI = `你收到了 ${char.myName} 购买的 “${message.deliveryData.productName}”。`;

            if (product && product.description) {
                if (!char.activeEffects) char.activeEffects = [];

                if (product.description.includes('解除') || product.description.includes('恢复')) {
                    if (product.description.includes('口吃')) {
                        char.activeEffects = char.activeEffects.filter(eff => eff.type !== 'stutter');
                        showToast(`${char.remarkName} 的口吃被治好了！`);
                        effectDescriptionForAI += ` 这个物品解除了你身上的“口吃”效果。`;
                    }
                } else {
                    const funcMatch = product.description.match(/功能：(.*?)(?:效果持续|副作用|$)/);
                    const durationMatch = product.description.match(/效果持续：(\d+)轮对话/);
                    const sideEffectMatch = product.description.match(/副作用：(.*?)(?:副作用持续|$)/);
                    const sideEffectDurationMatch = product.description.match(/副作用持续：(\d+)轮对话/);

                    if (funcMatch && durationMatch) {
                        const effect = {
                            duration: parseInt(durationMatch[1], 10),
                            isSideEffect: false
                        };
                        const funcText = funcMatch[1].trim();
                        
                        effectDescriptionForAI += ` 这个物品的效果是：“${funcText}”，效果将持续 ${effect.duration} 轮对话。`;
                        if (sideEffectMatch) {
                             effectDescriptionForAI += ` 副作用是：“${sideEffectMatch[1].trim()}”。`;
                        }

                        if (funcText.includes('交换人设') || funcText.includes('角色互换')) effect.type = 'role_swap';
                        else if (funcText.includes('只能说真话')) effect.type = 'truth_only';
                        else if (funcText.includes('害羞') || funcText.includes('内向')) effect.type = 'shy';
                        else if (funcText.includes('失忆')) effect.type = 'amnesia';
                        else if (funcText.includes('动物化')) {
                            effect.type = 'animalization';
                            effect.animal = funcText.replace('动物化', '').trim() || '猫';
                        }
                        
                        if (sideEffectMatch && sideEffectDurationMatch) {
                            const sideEffect = { duration: parseInt(sideEffectDurationMatch[1], 10) };
                            const sideEffectText = sideEffectMatch[1].trim();
                            if (sideEffectText.includes('口吃')) sideEffect.type = 'stutter';
                            if (sideEffect.type) effect.sideEffect = sideEffect;
                        }
                        
                        if (effect.type) {
                            char.activeEffects.push(effect);
                            showToast(`${char.remarkName} 使用了特殊物品！`);
                        }
                    }
                }
            }
            
            const contextMessageContent = `[system: ${effectDescriptionForAI} 请根据你的人设对此作出回应，你的回应要体现出你已经开始受到影响。]`;
            
            const contextMessage = {
                id: `msg_delivery_receipt_${Date.now()}`,
                role: 'user',
                content: contextMessageContent,
                parts: [{ type: 'text', text: contextMessageContent }],
                timestamp: Date.now()
            };
            char.history.push(contextMessage);
            
            await saveData();
            
            if (window.currentChatId === char.id) {
                window.getAiReply();
            }
            
            break;
        }
    }
}

// START: 商城购物流程核心JS函数
// ===============================================================

// 新增一个函数，用于渲染物流列表
function renderLogistics() {
    const container = document.getElementById('logistics-list-container');
    const placeholder = document.getElementById('no-logistics-placeholder');
    const logistics = db.mallData.logistics || [];

    if (logistics.length === 0) {
        container.innerHTML = '';
        placeholder.style.display = 'block';
        return;
    }
    placeholder.style.display = 'none';
    container.innerHTML = '';

    logistics.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'logistics-item';
        itemEl.innerHTML = `
            <div class="logistics-header">
                <span>订单号: ${item.orderId.slice(-8)}</span>
                <span class="logistics-status">${item.status}</span>
            </div>
            <div class="logistics-body">
                <img src="${item.productImage}" alt="${item.productName}">
                <div class="logistics-info">
                    <p class="item-name">${item.productName}</p>
                    <p class="eta" data-countdown-type="delivery" data-eta="${item.eta}">正在计算送达时间...</p>
                    <p class="recipient-info" style="font-size: 12px; color: #888;">收件人: ${item.recipientName}</p>
                </div>
            </div>
        `;
        container.appendChild(itemEl);
    });
}

// 在 setupMallApp 中为新的物流入口绑定事件
document.querySelector('.wallet-action-item[data-target="logistics-screen"]').addEventListener('click', () => {
    renderLogistics();
    switchScreen('logistics-screen');
});
/**
 * 打开购买流程的第一个弹窗（选择收货人）
 */
function openPurchaseModal(productId) {
    const product = findProductById(productId); // 使用这个辅助函数
    if (!product) {
        // 如果找不到商品，给出明确提示并中止
        showToast('错误：找不到该商品信息。');
        return;
    }
    purchaseState = { productId, recipientId: null, quantity: 1, style: '默认款式' , multiItems: []};
    
    const modal = document.getElementById('purchase-modal');
    modal.dataset.productId = productId; // 将产品ID暂存到弹窗上，用于取消时加入购物车

    document.getElementById('purchase-product-image').src = product.imageUrl;
    document.getElementById('purchase-product-price').textContent = `¥${product.price.toFixed(2)}`;
    document.getElementById('purchase-product-name').textContent = product.name;
    
    renderRecipientList();
    modal.classList.add('visible');
}

/**
 * 渲染收货人（聊天对象）列表
 */
function renderRecipientList() {
    const container = document.getElementById('recipient-selection-list');
    container.innerHTML = '';
    db.characters.forEach(char => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
            <input type="radio" name="recipient" value="${char.id}" id="recipient-${char.id}">
            <label for="recipient-${char.id}" style="display:flex; align-items:center; width:100%; gap:10px;">
                <img src="${char.avatar}" class="chat-avatar">
                <div class="item-details">
                    <div class="item-name">${char.remarkName}</div>
                </div>
            </label>
        `;
        container.appendChild(li);
    });
}

/**
 * [已修复] 处理收货人确认，并根据流程分发到“找人代付”或“自己购买”
 */
async function handleRecipientConfirmation() {
    const selectedRecipient = document.querySelector('input[name="recipient"]:checked');
    if (!selectedRecipient) {
        showToast('请选择一个收货人');
        return;
    }
    purchaseState.recipientId = selectedRecipient.value;
    const recipientChar = db.characters.find(c => c.id === purchaseState.recipientId);

    // 关闭选择弹窗
    document.getElementById('purchase-modal').classList.remove('visible');

    // --- 核心修复逻辑 ---
    // 判断是否为“找人代付”流程
    if (purchaseState.isPayForMe) {
        // *** 核心修改：使用 findProductById 查找商品 ***
        const product = findProductById(purchaseState.productId);
        if (!product || !recipientChar) {
            showToast('错误：找不到商品或代付人');
            return;
        }

        // 调用函数，向AI发送代付请求卡片
        await sendPaymentRequestCard(recipientChar.id, [product], product.price);

        showToast(`已向 ${recipientChar.remarkName} 发送代付请求`);
        
        // (可选, 但建议保留) 自动跳转到与该AI的聊天界面
        window.currentChatId = recipientChar.id;
        currentChatType = 'private';
        window.openChatRoom(window.currentChatId, currentChatType);

    } else if (purchaseState.multiItems.length > 0) {
        // 这是原有的逻辑：处理从收藏夹或购物车发起的“多商品结算”
        document.getElementById('delivery-countdown-modal').classList.add('visible');
    } else {
        // 这是原有的逻辑：处理正常的“单品自己购买”流程
        openOptionsModal();
    }
}

/**
 * 打开商品样式和数量选择弹窗
 */
function openOptionsModal() {
	   const product = findProductById(purchaseState.productId);
    if (!product) { // 增加安全检查
        showToast("打开商品选项失败：找不到商品。");
        return;
    }
    
    const modal = document.getElementById('product-options-modal');
    modal.dataset.productId = purchaseState.productId;

    document.getElementById('options-product-image').src = product.imageUrl;
    document.getElementById('options-product-price').textContent = `¥${product.price.toFixed(2)}`;
    document.getElementById('options-product-name').textContent = product.name;
    document.getElementById('purchase-quantity-input').value = 1;

    modal.classList.add('visible');
}

/**
 * 更新购买数量
 */
function updateQuantity(amount) {
    const input = document.getElementById('purchase-quantity-input');
    let currentValue = parseInt(input.value, 10);
    currentValue += amount;
    if (currentValue < 1) currentValue = 1;
    input.value = currentValue;
}



/**
 * [已修复] 完成购买，处理支付、物流、付款记录并发送商品卡片消息
 */
async function completePurchase() {
    const countdownMinutes = parseInt(document.getElementById('delivery-duration-input').value, 10);
    if (isNaN(countdownMinutes) || countdownMinutes <= 0) {
        showToast('请输入有效的倒计时分钟数');
        return;
    }

    // --- 核心修复 1：使用 findProductById 查找所有商品 ---
    // 旧代码只在 db.mallData.products 中查找，导致找不到个性化商品
    const product = findProductById(purchaseState.productId);
    const recipient = db.characters.find(c => c.id === purchaseState.recipientId);

    // 如果找不到商品或收件人，则中止操作
    if (!product || !recipient) {
        showToast('发生错误：找不到商品或收件人信息。');
        return;
    }

    const totalPrice = product.price * purchaseState.quantity;
    const purchaseDescription = `购买 ${product.name}`;

    try {
        // 等待支付流程完成
        await handlePayment(totalPrice, purchaseDescription);
    } catch (error) {
        showToast(error.message); // 如果支付失败或取消，则终止流程
        return;
    }

    // --- 核心修复 2：在支付成功后，补全物流和付款记录的逻辑 ---

    // 1. 将商品添加到物流列表，并传入用户设置的送达时间
    addItemsToLogistics([product], null, countdownMinutes);

    // 2. 将本次交易添加到付款记录
    if (!db.mallData.paymentHistory) {
        db.mallData.paymentHistory = [];
    }
    db.mallData.paymentHistory.unshift({
        id: `pay_${Date.now()}`,
        timestamp: Date.now(),
        description: purchaseDescription,
        total: totalPrice
    });

    // --- 记录逻辑结束 ---

    // 创建并发送包含所有配送信息的消息对象
    const deliveryMessage = {
        id: `msg_delivery_${Date.now()}`,
        role: 'user',
        content: `[我为${recipient.remarkName}购买了${product.name}]`,
        parts: [],
        timestamp: Date.now(),
        senderId: 'user_me',
        deliveryData: {
            productId: product.id,
            productName: product.name,
            productImage: product.imageUrl,
            price: product.price,
            quantity: purchaseState.quantity,
            style: purchaseState.style,
            eta: Date.now() + countdownMinutes * 60 * 1000,
            delivered: false
        }
    };

    recipient.history.push(deliveryMessage);
    await saveData(); // 保存所有更改

    document.getElementById('delivery-countdown-modal').classList.remove('visible');
    showToast('购买成功！已通知对方。');

    // 如果当前就在与收货人的聊天界面，则立即刷新
    if (window.currentChatId === recipient.id) {
        window.renderMessages(false, true);
    }
}


async function addToCart(productId, silent = false) {
    if (!productId) return;

    // --- 核心修改：同时检查AI商品和自定义商品 ---
    const allProducts = [...(db.mallData.products || []), ...(db.mallData.customProducts || [])];
    const productExists = allProducts.some(p => p.id === productId);
    
    if (!productExists) {
        if (!silent) showToast('错误：找不到该商品');
        return;
    }
    // --- 修改结束 ---

    const existingItem = db.mallData.cart.find(item => item.productId === productId);
    if (existingItem) {
        if (!silent) showToast('宝贝已在购物车中');
        return;
    }
    db.mallData.cart.push({
        cartId: `cart_${Date.now()}`,
        productId: productId,
        paymentDeadline: Date.now() + 30 * 60 * 1000
    });
    await saveData();
    if (!silent) {
        showToast('宝贝已加入购物车，请在30分钟内支付哦');
        renderCart();
        switchScreen('mall-cart-screen');
    }
}


/**
 * [已修复] 启动一个全局定时器来管理所有倒计时显示
 */
function startGlobalCountdownTimer() {
    if (globalCountdownInterval) clearInterval(globalCountdownInterval);

    globalCountdownInterval = setInterval(() => {
        document.querySelectorAll('[data-countdown-type]').forEach(async (el) => {
            const eta = parseInt(el.dataset.eta, 10);
            const remaining = eta - Date.now();
            
            if (remaining > 0) {
                const minutes = Math.floor((remaining / 1000 / 60) % 60).toString().padStart(2, '0');
                const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                
                if (el.dataset.countdownType === 'cart') {
                    el.textContent = `支付剩余 ${minutes}:${seconds}`;
                } else if (el.dataset.countdownType === 'delivery') {
                    el.textContent = `预计送达: ${hours > 0 ? hours + '小时' : ''}${minutes}分${seconds}秒`;
                }
            } else {
                if (el.dataset.countdownType === 'cart') {
                    el.textContent = '已失效';
                } else if (el.dataset.countdownType === 'delivery') {
                    el.textContent = '已送达';
                    
                    // --- 核心修复逻辑开始 ---
                    // 查找当前倒计时元素所在的整个物流项目卡片
                    const logisticsItem = el.closest('.logistics-item');
                    if (logisticsItem) {
                        // 在卡片内找到顶部的状态标签
                        const statusHeader = logisticsItem.querySelector('.logistics-status');
                        if (statusHeader) {
                            // 将“待发货”更新为“已送达”
                            statusHeader.textContent = '已送达';
                        }
                    }
                    // --- 核心修复逻辑结束 ---
                    
                    const messageWrapper = el.closest('.message-wrapper');
                    if (messageWrapper) {
                        await notifyAiOfDelivery(messageWrapper.dataset.id);
                        el.removeAttribute('data-countdown-type');
                    }
                }
            }
        });
    }, 1000);
}
/**
 * [V3.1 | 已修复自定义商品] 当倒计时结束后，通知AI收货，并激活特殊物品效果
 */
async function notifyAiOfDelivery(messageId) {
    for (const char of db.characters) {
        const message = char.history.find(m => m.id === messageId);
        if (message && message.deliveryData && !message.deliveryData.delivered) {
            
            message.deliveryData.delivered = true;

            // --- 核心修改：使用 findProductById 查找所有商品 ---
            const product = findProductById(message.deliveryData.productId);
            // --- 修改结束 ---

            let effectDescriptionForAI = `你收到了 ${char.myName} 购买的 “${message.deliveryData.productName}”。`;

            if (product && product.description) {
                if (!char.activeEffects) char.activeEffects = [];

                if (product.description.includes('解除') || product.description.includes('恢复')) {
                    if (product.description.includes('口吃')) {
                        char.activeEffects = char.activeEffects.filter(eff => eff.type !== 'stutter');
                        showToast(`${char.remarkName} 的口吃被治好了！`);
                        effectDescriptionForAI += ` 这个物品解除了你身上的“口吃”效果。`;
                    }
                } else {
                    const funcMatch = product.description.match(/功能：(.*?)(?:效果持续|副作用|$)/);
                    const durationMatch = product.description.match(/效果持续：(\d+)轮对话/);
                    const sideEffectMatch = product.description.match(/副作用：(.*?)(?:副作用持续|$)/);
                    const sideEffectDurationMatch = product.description.match(/副作用持续：(\d+)轮对话/);

                    if (funcMatch && durationMatch) {
                        const effect = {
                            duration: parseInt(durationMatch[1], 10),
                            isSideEffect: false
                        };
                        const funcText = funcMatch[1].trim();
                        
                        effectDescriptionForAI += ` 这个物品的效果是：“${funcText}”，效果将持续 ${effect.duration} 轮对话。`;
                        if (sideEffectMatch) {
                             effectDescriptionForAI += ` 副作用是：“${sideEffectMatch[1].trim()}”。`;
                        }

                        if (funcText.includes('交换人设') || funcText.includes('角色互换')) effect.type = 'role_swap';
                        else if (funcText.includes('只能说真话')) effect.type = 'truth_only';
                        else if (funcText.includes('害羞') || funcText.includes('内向')) effect.type = 'shy';
                        else if (funcText.includes('失忆')) effect.type = 'amnesia';
                        else if (funcText.includes('动物化')) {
                            effect.type = 'animalization';
                            effect.animal = funcText.replace('动物化', '').trim() || '猫';
                        }
                        
                        if (sideEffectMatch && sideEffectDurationMatch) {
                            const sideEffect = { duration: parseInt(sideEffectDurationMatch[1], 10) };
                            const sideEffectText = sideEffectMatch[1].trim();
                            if (sideEffectText.includes('口吃')) sideEffect.type = 'stutter';
                            if (sideEffect.type) effect.sideEffect = sideEffect;
                        }
                        
                        if (effect.type) {
                            char.activeEffects.push(effect);
                            showToast(`${char.remarkName} 使用了特殊物品！`);
                        }
                    }
                }
            }
            
            const contextMessageContent = `[system: ${effectDescriptionForAI} 请根据你的人设对此作出回应，你的回应要体现出你已经开始受到影响。]`;
            
            const contextMessage = {
                id: `msg_delivery_receipt_${Date.now()}`,
                role: 'user',
                content: contextMessageContent,
                parts: [{ type: 'text', text: contextMessageContent }],
                timestamp: Date.now()
            };
            char.history.push(contextMessage);
            
            await saveData();
            
            if (window.currentChatId === char.id) {
                window.getAiReply();
            }
            
            break;
        }
    }
}
// ===============================================================
// END: 商城购物流程核心JS函数

function registerDeliveryRenderer() {
    if (!window.displayDispatcher || typeof window.displayDispatcher.register !== 'function') return false;
    window.displayDispatcher.register('delivery', function (data) {
        if (!data) return '';
        return `<div class="product-delivery-card"><img src="${data.productImage}" alt="商品" class="product-delivery-card-icon"><div class="product-delivery-card-info"><p class="product-delivery-card-title">${data.productName}</p><p class="delivery-countdown-display" data-countdown-type="delivery" data-eta="${data.eta}"></p></div></div>`;
    });
    return true;
}

if (!registerDeliveryRenderer()) {
    window.displayDispatcherPending = window.displayDispatcherPending || [];
    window.displayDispatcherPending.push(registerDeliveryRenderer);
}

function registerPaymentRequestRenderer() {
    if (!window.displayDispatcher || typeof window.displayDispatcher.register !== 'function') return false;
    window.displayDispatcher.register('payment-request', function (data) {
        if (!data) return '';
        const isSent = data._isSent === true;
        let actionsHTML = '';
        let statusText = '';
        if (data.status === 'pending' && isSent) { statusText = `<p class="payment-request-status">等待对方付款...</p>`; }
        else if (data.status === 'pending' && !isSent) {
            actionsHTML = `<div class="payment-request-actions"><button class="btn btn-neutral btn-small payment-request-decline">残忍拒绝</button><button class="btn btn-primary btn-small payment-request-accept">为Ta付款</button></div>`;
        } else if (data.status === 'paid') { statusText = `<p class="payment-request-status" style="color: #4CAF50;">✓ 已支付</p>`; }
        else if (data.status === 'declined') { statusText = `<p class="payment-request-status" style="color: #F44336;">✗ 已拒绝</p>`; }
        return `<div class="payment-request-card" data-display-type="payment-request"><p class="payment-request-title">${data.requesterName} 发起的代付</p><p class="payment-request-amount">¥${data.amount.toFixed(2)}</p><p class="payment-request-desc">${data.items.map(i => i.name).join(', ')}</p>${actionsHTML}${statusText}</div>`;
    }, function (element) {
        if (!element) return;
        element.addEventListener('click', async (e) => {
            const acceptBtn = e.target.closest('.payment-request-accept');
            const declineBtn = e.target.closest('.payment-request-decline');
            if (!acceptBtn && !declineBtn) return;
            const messageWrapper = element.closest('.message-wrapper');
            if (!messageWrapper) return;
            const messageId = messageWrapper.dataset.id;
            const decision = acceptBtn ? 'paid' : 'declined';
            if (typeof handleAiPaymentDecision === 'function') {
                await handleAiPaymentDecision(messageId, decision);
            }
        });
    });
    return true;
}

if (!registerPaymentRequestRenderer()) {
    window.displayDispatcherPending = window.displayDispatcherPending || [];
    window.displayDispatcherPending.push(registerPaymentRequestRenderer);
}
