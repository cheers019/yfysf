// ===============================================================
// 钱包/支付系统业务逻辑
// ===============================================================

/**
 * 添加交易记录
 * @param {string} type - 交易类型：'income' 或 'expense'
 * @param {number} amount - 交易金额
 * @param {string} description - 交易描述
 */
function addTransaction(type, amount, description) {
    if (!db.wallet) return;
    
    // 1. 更新余额
    const numericAmount = parseFloat(amount);
    if (type === 'income') {
        db.wallet.balance += numericAmount;
    } else if (type === 'expense') {
        db.wallet.balance -= numericAmount;
    }
    db.wallet.balance = parseFloat(db.wallet.balance.toFixed(2)); // 避免精度问题

    // 2. 添加交易记录
    const transaction = {
        id: `tx_${Date.now()}`,
        type, // 'income' or 'expense'
        amount: numericAmount,
        description,
        timestamp: Date.now()
    };
    db.wallet.transactions.unshift(transaction); // unshift使最新记录在最前

    // 3. 限制交易记录数量，防止无限增长
    if (db.wallet.transactions.length > 200) {
        db.wallet.transactions.pop();
    }
    
    // 4. 更新UI显示
    const balanceDisplay = document.getElementById('wallet-balance-display');
    if (balanceDisplay) {
        balanceDisplay.textContent = db.wallet.balance.toFixed(2);
    }
}

/**
 * 处理支付流程
 * @param {number} amount - 支付金额
 * @param {string} description - 支付描述
 * @returns {Promise} - 支付成功或失败的Promise
 */
function handlePayment(amount, description) {
    return new Promise((resolve, reject) => {
        if (db.wallet.passwordEnabled === false) {
            if (db.wallet.balance < amount) {
                reject(new Error('零花钱余额不足'));
                return;
            }
            addTransaction('expense', amount, description);
            resolve(); 
            return;
        }

        if (!db.wallet.password) {
            reject(new Error('请先前往"我"-"支付设置"设置支付密码！'));
            return;
        }
        if (db.wallet.balance < amount) {
            reject(new Error('零花钱余额不足'));
            return;
        }

        const modal = document.getElementById('payment-password-modal');
        const title = document.getElementById('payment-prompt-title');
        const desc = document.getElementById('payment-prompt-description');
        const passwordInput = document.getElementById('payment-password-input');
        const confirmBtn = document.getElementById('confirm-payment-btn');
        const cancelBtn = document.getElementById('cancel-payment-btn');

        // --- 核心修改：克隆并替换按钮以清除所有旧的事件监听器 ---
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        // --- 修改结束 ---

        title.textContent = description;
        desc.innerHTML = `<p style="font-size: 24px; font-weight: bold; margin: 10px 0;">¥ ${amount.toFixed(2)}</p>`;
        passwordInput.value = '';
        
        const cleanupAndResolve = () => {
            modal.classList.remove('visible');
            passwordInput.removeEventListener('keypress', keypressHandler);
            resolve();
        };

        const cleanupAndReject = (err) => {
            modal.classList.remove('visible');
            passwordInput.removeEventListener('keypress', keypressHandler);
            reject(err);
        };

        const confirmHandler = () => {
            if (passwordInput.value === db.wallet.password) {
                addTransaction('expense', amount, description);
                cleanupAndResolve();
            } else {
                showToast('支付密码错误');
                passwordInput.value = '';
            }
        };
        
        const keypressHandler = (e) => {
            if(e.key === 'Enter') {
                confirmHandler();
            }
        };

        newConfirmBtn.addEventListener('click', confirmHandler);
        newCancelBtn.addEventListener('click', () => cleanupAndReject(new Error('支付已取消')));
        passwordInput.addEventListener('keypress', keypressHandler);

        modal.classList.add('visible');
        setTimeout(() => passwordInput.focus(), 100);
    });
}

/**
 * 渲染交易明细
 */
function renderTransactionDetails() {
    const container = document.getElementById('transaction-list-container');
    container.innerHTML = '';

    if (!db.wallet.transactions || db.wallet.transactions.length === 0) {
        container.innerHTML = '<li class="placeholder-text" style="padding: 20px 0;">暂无明细</li>';
        return;
    }

    db.wallet.transactions.forEach(tx => {
        const li = document.createElement('li');
        li.className = 'transaction-item';

        const date = new Date(tx.timestamp);
        const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        
        const amountSign = tx.type === 'income' ? '+' : '-';
        
        li.innerHTML = `
            <div class="transaction-details">
                <span class="transaction-description">${tx.description}</span>
                <span class="transaction-timestamp">${dateString}</span>
            </div>
            <span class="transaction-amount ${tx.type}">
                ${amountSign}${tx.amount.toFixed(2)}
            </span>
        `;
        container.appendChild(li);
    });
}

/**
 * 设置钱包所有功能的事件监听
 */
function setupWalletApp() {
    // 缓存DOM元素
    const walletScreen = document.getElementById('wallet-screen');
    const balanceDisplay = document.getElementById('wallet-balance-display');
    const settingsBtn = document.getElementById('wallet-settings-btn');
    const settingsScreen = document.getElementById('wallet-settings-screen');
    const settingsForm = document.getElementById('wallet-settings-form');
    const balanceInput = document.getElementById('wallet-balance-input');
    const passwordInput = document.getElementById('wallet-password-input');
    const transactionsBtn = document.getElementById('show-transactions-btn');
    const transactionsModal = document.getElementById('transaction-details-modal');
    const closeTransactionsBtn = document.getElementById('close-transactions-btn');

    // 监听导航到底部"我"按钮的点击事件
    document.querySelector('.nav-btn[data-target="wallet-screen"]').addEventListener('click', () => {
        balanceDisplay.textContent = db.wallet.balance.toFixed(2);
    });
    
// 从钱包主页跳转到设置页
settingsBtn.addEventListener('click', () => {
    const passwordEnabledToggle = document.getElementById('wallet-password-enabled-toggle');
    
    balanceInput.value = db.wallet.balance;
    passwordInput.value = db.wallet.password || '';
    passwordEnabledToggle.checked = db.wallet.passwordEnabled;
    passwordInput.disabled = !db.wallet.passwordEnabled; // 根据开关状态禁用/启用输入框
    
    // 监听开关的实时变化
    passwordEnabledToggle.onchange = (event) => {
        passwordInput.disabled = !event.target.checked;
        if (!event.target.checked) {
            passwordInput.value = ''; // 如果禁用，清空密码框
        }
    };
    
    switchScreen('wallet-settings-screen');
});

// 保存设置
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newBalance = parseFloat(balanceInput.value);
    const newPassword = passwordInput.value;
    const passwordEnabled = document.getElementById('wallet-password-enabled-toggle').checked;

    if (passwordEnabled && newPassword && (newPassword.length !== 6 || !/^\d+$/.test(newPassword))) {
        showToast('支付密码必须为6位数字！');
        return;
    }

    db.wallet.balance = isNaN(newBalance) ? 0 : parseFloat(newBalance.toFixed(2));
    db.wallet.passwordEnabled = passwordEnabled;

    if (passwordEnabled) {
        db.wallet.password = newPassword || null;
    } else {
        db.wallet.password = null; // 禁用密码时，自动清除已保存的密码
    }

    await saveData();
    showToast('支付设置已保存！');
    switchScreen('wallet-screen');
    balanceDisplay.textContent = db.wallet.balance.toFixed(2);
});
    
    // 打开交易明细
    transactionsBtn.addEventListener('click', () => {
        renderTransactionDetails();
        transactionsModal.classList.add('visible');
    });

    // 关闭交易明细
    closeTransactionsBtn.addEventListener('click', () => {
        transactionsModal.classList.remove('visible');
    });
}

