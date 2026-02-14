/**
 * js/features/toolbox/tb-finance.js
 * 财务与礼物功能模块 (Phase 1: UI Trigger & Modal Logic)
 */

(function() {
    window.TB_Finance = {};

    // 内部变量，用于缓存 DOM 元素
    let walletBtn, giftBtn;
    let sendTransferForm, sendTransferModal;
    let sendGiftForm, sendGiftModal;
    let groupRecipientSelectionModal, groupRecipientSelectionList, confirmGroupRecipientBtn, groupRecipientSelectionTitle;
    let receiveTransferActionSheet, acceptTransferBtn, returnTransferBtn;
    let messageArea;

    /**
     * 渲染群聊选人列表
     * (从 script.js 搬运而来)
     * @param {string} actionText - 标题文本 (e.g. "转账给", "送礼物给")
     */
    function renderGroupRecipientSelectionList(actionText) {
        // 使用全局 db 和 currentChatId
        const group = window.db.groups.find(g => g.id === window.currentChatId);
        if (!group) return;

        if (groupRecipientSelectionTitle) {
            groupRecipientSelectionTitle.textContent = actionText;
        }
        
        if (groupRecipientSelectionList) {
            groupRecipientSelectionList.innerHTML = '';
            group.members.forEach(member => {
                const li = document.createElement('li');
                li.className = 'group-recipient-select-item';
                li.innerHTML = `
                        <input type="checkbox" id="recipient-select-${member.id}" value="${member.id}">
                        <label for="recipient-select-${member.id}">
                            <img src="${member.avatar}" alt="${member.groupNickname}">
                            <span>${member.groupNickname}</span>
                        </label>`;
                groupRecipientSelectionList.appendChild(li);
            });
        }
    }

    /**
     * 发起转账
     * @param {number|string} amount 金额
     * @param {string} remark 备注
     */
    TB_Finance.sendMyTransfer = async (amount, remark) => {
        const currentChatType = window.currentChatType;
        const currentChatId = window.currentChatId;

        if (currentChatType === 'private') {
            const character = window.db.characters.find(c => c.id === currentChatId);
            if (character && character.isBlockedByAi) {
                if (window.showToast) window.showToast('你已被对方拉黑');
                return;
            }
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            if (window.showToast) window.showToast('请输入有效的金额');
            return;
        }

        // 1. 支付扣款
        try {
            if (window.handlePayment) {
                await window.handlePayment(numericAmount, `转账`);
            } else {
                console.error("handlePayment is not defined");
                return;
            }
        } catch (error) {
            if (window.showToast) window.showToast(error.message);
            return;
        }

        // 2. 构造消息
        const chat = (currentChatType === 'private') 
            ? window.db.characters.find(c => c.id === currentChatId) 
            : window.db.groups.find(g => g.id === currentChatId);

        let messages = [];

        if (currentChatType === 'private') {
            const content = `[${chat.myName}给你转账：${numericAmount.toFixed(2)}元；备注：${remark}]`;
            messages.push({
                id: `msg_${Date.now()}`,
                role: 'user',
                content: content,
                parts: [{type: 'text', text: content}],
                timestamp: Date.now(),
                transferStatus: 'pending'
            });
        } else { // Group chat
            if (window.currentGroupAction && window.currentGroupAction.recipients) {
                window.currentGroupAction.recipients.forEach(recipientId => {
                    const recipient = chat.members.find(m => m.id === recipientId);
                    if (recipient) {
                        const content = `[${chat.me.nickname} 向 ${recipient.realName} 转账：${numericAmount.toFixed(2)}元；备注：${remark}]`;
                        messages.push({
                            id: `msg_${Date.now()}_${recipientId}`,
                            role: 'user',
                            content: content,
                            parts: [{type: 'text', text: content}],
                            timestamp: Date.now(),
                            senderId: 'user_me',
                            transferStatus: 'pending' // 修复：添加 transferStatus 确保群聊可收款
                        });
                    }
                });
            }
        }

        // 3. 发送消息
        await window.TB_Messenger.sendActionMessage({
            chat: chat,
            messages: messages
        });

        // 4. 清理 UI
        if (sendTransferModal) sendTransferModal.classList.remove('visible');
    };

    /**
     * 发送礼物
     * @param {string} description 礼物描述
     * @param {number|string} amount 礼物价格
     */
    TB_Finance.sendMyGift = async (description, amount) => {
        const currentChatType = window.currentChatType;
        const currentChatId = window.currentChatId;

        if (!description) return;

        const giftPrice = parseFloat(amount);
        if (isNaN(giftPrice) || giftPrice <= 0) {
            if (window.showToast) window.showToast("请输入有效的礼物价格");
            return;
        }

        const recipientName = (currentChatType === 'private') 
            ? window.db.characters.find(c => c.id === currentChatId).remarkName 
            : '群成员';

        // 1. 支付扣款
        try {
            if (window.handlePayment) {
                await window.handlePayment(giftPrice, `送礼物给 ${recipientName}`);
            } else {
                console.error("handlePayment is not defined");
                return;
            }
        } catch (error) {
            if (window.showToast) window.showToast(error.message);
            return;
        }

        // 2. 构造消息
        const chat = (currentChatType === 'private') 
            ? window.db.characters.find(c => c.id === currentChatId) 
            : window.db.groups.find(g => g.id === currentChatId);

        let messages = [];

        if (currentChatType === 'private') {
            const content = `[${chat.myName}送来的礼物：${description}]`;
            const contextContent = `[system-context-only: 这份礼物“${description}”的价格是${giftPrice.toFixed(2)}元]`;
            messages.push({
                id: `msg_${Date.now()}`,
                role: 'user',
                content: content,
                parts: [{type: 'text', text: content}],
                timestamp: Date.now(),
                giftStatus: 'sent'
            });
            messages.push({
                id: `msg_gift_price_${Date.now()}`,
                role: 'user',
                content: contextContent,
                parts: [{type: 'text', text: contextContent}],
                timestamp: Date.now()
            });
        } else { // Group chat
            if (window.currentGroupAction && window.currentGroupAction.recipients) {
                window.currentGroupAction.recipients.forEach(recipientId => {
                    const recipient = chat.members.find(m => m.id === recipientId);
                    if (recipient) {
                        const content = `[${chat.me.nickname} 向 ${recipient.realName} 送来了礼物：${description}]`;
                        const contextContent = `[system-context-only: 送给 ${recipient.realName} 的礼物“${description}”价格是${giftPrice.toFixed(2)}元]`;
                        messages.push({
                            id: `msg_${Date.now()}_${recipientId}`,
                            role: 'user',
                            content: content,
                            parts: [{type: 'text', text: content}],
                            timestamp: Date.now(),
                            senderId: 'user_me',
                            giftStatus: 'sent' // 保持一致性，虽然群聊可能暂未用到
                        });
                        messages.push({
                            id: `msg_gift_price_${Date.now()}_${recipientId}`,
                            role: 'user',
                            content: contextContent,
                            parts: [{type: 'text', text: contextContent}],
                            timestamp: Date.now(),
                            senderId: 'user_me'
                        });
                    }
                });
            }
        }

        // 3. 发送消息
        await window.TB_Messenger.sendActionMessage({
            chat: chat,
            messages: messages
        });

        // 4. 清理 UI
        if (sendGiftModal) sendGiftModal.classList.remove('visible');
    };

    /**
     * 处理转账点击 (打开收款菜单)
     * @param {string} messageId 
     */
    TB_Finance.handleReceivedTransferClick = (messageId) => {
        window.currentTransferMessageId = messageId;
        if (receiveTransferActionSheet) receiveTransferActionSheet.classList.add('visible');
    };

    /**
     * 响应转账 (收款或退回)
     * @param {string} action 'received' | 'returned'
     */
    TB_Finance.respondToTransfer = async (action) => {
        if (!window.currentTransferMessageId) return;
        
        const currentChatId = window.currentChatId;
        const character = window.db.characters.find(c => c.id === currentChatId);
        if (!character) return; // 仅支持私聊收款? 原逻辑看似只在 characters 里找
        
        const message = character.history.find(m => m.id === window.currentTransferMessageId);

        if (message) {
            message.transferStatus = action;
            
            // 更新 UI 卡片状态
            if (messageArea) {
                const cardOnScreen = messageArea.querySelector(`.message-wrapper[data-id="${window.currentTransferMessageId}"] .transfer-card`);
                if (cardOnScreen) {
                    cardOnScreen.classList.remove('received', 'returned');
                    cardOnScreen.classList.add(action);
                    cardOnScreen.querySelector('.transfer-status').textContent = action === 'received' ? '已收款' : '已退回';
                    cardOnScreen.style.cursor = 'default';
                }
            }

            if (action === 'received') {
                const amountMatch = message.content.match(/转账：([\d.]+)元/);
                if (amountMatch) {
                    const amount = parseFloat(amountMatch[1]);
                    if (window.addTransaction) {
                        window.addTransaction('income', amount, `收到 ${character.remarkName} 的转账`);
                    }
                }
            }

            let contextMessageContent = (action === 'received') 
                ? `[${character.myName}接收${character.realName}的转账]` 
                : `[${character.myName}退回${character.realName}的转账]`;
            
            const contextMessage = {
                id: `msg_${Date.now()}`,
                role: 'user',
                content: contextMessageContent,
                parts: [{type: 'text', text: contextMessageContent}],
                timestamp: Date.now()
            };

            await window.TB_Messenger.sendActionMessage({
                chat: character,
                message: contextMessage
            });
        }

        if (receiveTransferActionSheet) receiveTransferActionSheet.classList.remove('visible');
        window.currentTransferMessageId = null;
    };

    TB_Finance.init = () => {
        console.log("TB_Finance module initializing...");

        // 1. 获取 DOM 元素
        walletBtn = document.getElementById('wallet-btn');
        sendTransferModal = document.getElementById('send-transfer-modal');
        sendTransferForm = document.getElementById('send-transfer-form');
        
        giftBtn = document.getElementById('gift-btn');
        sendGiftModal = document.getElementById('send-gift-modal');
        sendGiftForm = document.getElementById('send-gift-form');

        groupRecipientSelectionModal = document.getElementById('group-recipient-selection-modal');
        groupRecipientSelectionList = document.getElementById('group-recipient-selection-list');
        confirmGroupRecipientBtn = document.getElementById('confirm-group-recipient-btn');
        groupRecipientSelectionTitle = document.getElementById('group-recipient-selection-title');

        receiveTransferActionSheet = document.getElementById('receive-transfer-actionsheet');
        acceptTransferBtn = document.getElementById('accept-transfer-btn');
        returnTransferBtn = document.getElementById('return-transfer-btn');
        messageArea = document.getElementById('message-area');

        // 2. 绑定转账按钮点击事件
        if (walletBtn) {
            walletBtn.addEventListener('click', () => {
                const currentChatType = window.currentChatType;
                
                if (currentChatType === 'private') {
                    if (sendTransferForm) sendTransferForm.reset();
                    if (sendTransferModal) sendTransferModal.classList.add('visible');
                } else if (currentChatType === 'group') {
                    // 确保 window.currentGroupAction 存在
                    if (window.currentGroupAction) {
                        window.currentGroupAction.type = 'transfer';
                        renderGroupRecipientSelectionList('转账给');
                        if (groupRecipientSelectionModal) groupRecipientSelectionModal.classList.add('visible');
                    } else {
                        console.error("currentGroupAction is undefined");
                    }
                }
            });
        }

        // 绑定转账表单提交
        if (sendTransferForm) {
            sendTransferForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const amountInput = document.getElementById('transfer-amount-input');
                const remarkInput = document.getElementById('transfer-remark-input');
                const amount = amountInput ? amountInput.value : 0;
                const remark = remarkInput ? remarkInput.value.trim() : '';
                
                TB_Finance.sendMyTransfer(amount, remark);
            });
        }

        // 3. 绑定礼物按钮点击事件
        if (giftBtn) {
            giftBtn.addEventListener('click', () => {
                const currentChatType = window.currentChatType;

                if (currentChatType === 'private') {
                    if (sendGiftForm) sendGiftForm.reset();
                    if (sendGiftModal) sendGiftModal.classList.add('visible');
                } else if (currentChatType === 'group') {
                    if (window.currentGroupAction) {
                        window.currentGroupAction.type = 'gift';
                        renderGroupRecipientSelectionList('送礼物给');
                        if (groupRecipientSelectionModal) groupRecipientSelectionModal.classList.add('visible');
                    } else {
                        console.error("currentGroupAction is undefined");
                    }
                }
            });
        }

        // 绑定礼物表单提交
        if (sendGiftForm) {
            sendGiftForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const descInput = document.getElementById('gift-description-input');
                const amountInput = document.getElementById('gift-amount-input');
                const description = descInput ? descInput.value.trim() : '';
                const amount = amountInput ? amountInput.value : 0;

                TB_Finance.sendMyGift(description, amount);
            });
        }

        // 4. 绑定群聊选人确认按钮事件
        if (confirmGroupRecipientBtn) {
            confirmGroupRecipientBtn.addEventListener('click', () => {
                if (!groupRecipientSelectionList) return;
                
                const selectedRecipientIds = Array.from(groupRecipientSelectionList.querySelectorAll('input:checked')).map(input => input.value);
                
                if (selectedRecipientIds.length === 0) {
                    if (window.showToast) window.showToast('请至少选择一个收件人。');
                    return;
                }

                if (window.currentGroupAction) {
                    window.currentGroupAction.recipients = selectedRecipientIds;
                    if (groupRecipientSelectionModal) groupRecipientSelectionModal.classList.remove('visible');

                    if (window.currentGroupAction.type === 'transfer') {
                        if (sendTransferForm) sendTransferForm.reset();
                        if (sendTransferModal) sendTransferModal.classList.add('visible');
                    } else if (window.currentGroupAction.type === 'gift') {
                        if (sendGiftForm) sendGiftForm.reset();
                        if (sendGiftModal) sendGiftModal.classList.add('visible');
                    }
                }
            });
        }

        // 5. 绑定收款/退回按钮
        if (acceptTransferBtn) {
            acceptTransferBtn.addEventListener('click', () => TB_Finance.respondToTransfer('received'));
        }
        if (returnTransferBtn) {
            returnTransferBtn.addEventListener('click', () => TB_Finance.respondToTransfer('returned'));
        }
    };

})();
