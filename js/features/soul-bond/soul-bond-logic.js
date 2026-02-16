window.soulBondLogic = window.soulBondLogic || {};
window.SoulBondLogic = {
    updateBondRoster(charId, action) {
        if (!window.db) return [];
        if (!Array.isArray(window.db.soul_bond_roster)) window.db.soul_bond_roster = [];
        try {
            let roster = window.db.soul_bond_roster;
            if (action === 'add') {
                if (!roster.includes(charId) && roster.length < 2) {
                    roster.push(charId);
                }
                window.db.soul_bond_roster = roster;
                if (typeof window.saveData === 'function') window.saveData();
                return roster;
            }
            if (action === 'remove') {
                roster = roster.filter(id => id !== charId);
                window.db.soul_bond_roster = roster;
                if (typeof window.saveData === 'function') window.saveData();
                return roster;
            }
            if (action === 'get') {
                return roster;
            }
            return roster;
        } catch (error) {
            console.error('更新伴侣名册时出错:', error);
            return [];
        }
    },
    getBondCharacter(index) {
        if (!window.db || !Array.isArray(window.db.characters)) return null;
        const roster = Array.isArray(window.db.soul_bond_roster) ? window.db.soul_bond_roster : [];
        if (roster.length === 0) return null;
        let resolvedIndex = Number.isInteger(index) ? index : null;
        if (resolvedIndex === null) {
            const screen = document.getElementById('soul-bond-screen');
            const screenCharacterId = screen && screen.dataset ? screen.dataset.characterId : null;
            if (screenCharacterId) {
                const screenIndex = roster.indexOf(screenCharacterId);
                if (screenIndex >= 0) resolvedIndex = screenIndex;
            }
        }
        if (resolvedIndex === null) {
            const activeCharacter = window.db.characters.find(c => c.isSoulBound === true) || null;
            if (activeCharacter) {
                const activeIndex = roster.indexOf(activeCharacter.id);
                if (activeIndex >= 0) resolvedIndex = activeIndex;
            }
        }
        if (resolvedIndex === null || resolvedIndex < 0 || resolvedIndex >= roster.length) {
            resolvedIndex = 0;
        }
        const characterId = roster[resolvedIndex];
        const character = window.db.characters.find(c => c.id === characterId) || null;
        if (!character) return null;
        const name = character.name || character.realName || character.remarkName || '';
        const avatar = character.avatar || character.myAvatar || character.icon || '';
        if (!character.name && name) character.name = name;
        if (!character.avatar && avatar) character.avatar = avatar;
        return character;
    },
    findBoundCharacter() {
        if (!window.db || !Array.isArray(window.db.characters)) return null;
        return window.db.characters.find(c => c.isSoulBound === true) || null;
    },
    processAIInstructions(messageText, characterId) {
        let fullResponse = messageText || '';
        const db = window.db;
        if (!db || !Array.isArray(db.characters)) return fullResponse;
        const appState = window.appState || {};
        const currentChatId = appState.currentChatId;
        const currentChatType = appState.currentChatType || 'private';
        const chat = currentChatType === 'group'
            ? (Array.isArray(db.groups) ? db.groups.find(g => g.id === currentChatId) : null)
            : db.characters.find(c => c.id === currentChatId);
        const targetId = characterId || currentChatId;
        const character = db.characters.find(c => c.id === targetId);
        if (!character) return fullResponse;

        if (fullResponse.includes('[accept-bond]')) {
            const pendingRequest = character.history.findLast(m => m.bondRequestData && m.bondRequestData.status === 'pending');
            if (pendingRequest) {
                pendingRequest.bondRequestData.status = 'accepted';
            }
            const roster = window.updateBondRoster(character.id, 'add');
            if (roster.length === 2) {
                const otherCharId = roster.find(id => id !== character.id);
                const otherCharacter = db.characters.find(c => c.id === otherCharId);
                if (otherCharacter) {
                    otherCharacter.isSoulBound = false;
                }
            } else {
                db.characters.forEach(c => {
                    if (c.id !== character.id) {
                        c.isSoulBound = false;
                        c.soulBondStatus = 'none';
                    }
                });
            }
            character.isSoulBound = true;
            character.soulBondStatus = 'active';
            const displayMsg = {
                id: `msg_bond_disp_${Date.now()}`,
                role: 'system',
                content: `[system-display:${character.remarkName} 同意了你的心动绑定请求！现在你们可以一起体验专属功能了。]`,
                parts: [],
                timestamp: Date.now()
            };
            const contextMsg = {
                id: `msg_bond_ctx_${Date.now()}`,
                role: 'user',
                content: `[system: 你刚刚同意了绑定请求。请说一句符合人设的、表达喜悦或确认关系的话。]`,
                parts: [{
                    type: 'text',
                    text: `[system: 你刚刚同意了绑定请求。请说一句符合人设的、表达喜悦或确认关系的话。]`
                }],
                timestamp: Date.now()
            };
            character.history.push(displayMsg, contextMsg);
            if (typeof window.saveData === 'function') window.saveData();
            if (typeof window.renderChatList === 'function') window.renderChatList();
            if (currentChatId === (chat && chat.id)) {
                if (window.chatUiCore && typeof window.chatUiCore.renderMessages === 'function') {
                    window.chatUiCore.renderMessages(false, true);
                } else if (typeof window.renderMessages === 'function') {
                    window.renderMessages(false, true);
                }
                if (typeof window.showToast === 'function') window.showToast('绑定成功！');
                if (typeof window.getAiReply === 'function') window.getAiReply();
                if (typeof window.hideTypingIndicator === 'function') window.hideTypingIndicator();
            }
            return '';
        }

        if (fullResponse.includes('[decline-bond]')) {
            const pendingRequest = character.history.findLast(m => m.bondRequestData && m.bondRequestData.status === 'pending');
            if (pendingRequest) {
                pendingRequest.bondRequestData.status = 'declined';
            }
            character.soulBondStatus = 'none';
            const displayMsg = {
                id: `msg_bond_disp_${Date.now()}`,
                role: 'system',
                content: `[system-display:${character.remarkName} 拒绝了你的绑定请求。]`,
                parts: [],
                timestamp: Date.now()
            };
            const contextMsg = {
                id: `msg_bond_ctx_${Date.now()}`,
                role: 'user',
                content: `[system: 你刚刚拒绝了绑定请求。请说一句符合人设的、委婉的拒绝理由。]`,
                parts: [{
                    type: 'text',
                    text: `[system: 你刚刚拒绝了绑定请求。请说一句符合人设的、委婉的拒绝理由。]`
                }],
                timestamp: Date.now()
            };
            character.history.push(displayMsg, contextMsg);
            if (typeof window.saveData === 'function') window.saveData();
            if (typeof window.renderChatList === 'function') window.renderChatList();
            if (currentChatId === (chat && chat.id)) {
                if (window.chatUiCore && typeof window.chatUiCore.renderMessages === 'function') {
                    window.chatUiCore.renderMessages(false, true);
                } else if (typeof window.renderMessages === 'function') {
                    window.renderMessages(false, true);
                }
                if (typeof window.showToast === 'function') window.showToast('对方拒绝了你的邀请');
                if (typeof window.getAiReply === 'function') window.getAiReply();
                if (typeof window.hideTypingIndicator === 'function') window.hideTypingIndicator();
            }
            return '';
        }

        if (fullResponse.includes('[request-bond]')) {
            character.soulBondStatus = 'pending_by_ai';
            const bondRequestMessage = {
                id: `msg_bond_req_card_${Date.now()}`,
                role: 'assistant',
                content: `[${character.realName}向你发起了心动绑定邀请]`,
                parts: [],
                timestamp: Date.now(),
                bondRequestData: {
                    status: 'pending'
                }
            };
            character.history.push(bondRequestMessage);
            if (typeof window.saveData === 'function') window.saveData();
            if (typeof window.renderChatList === 'function') window.renderChatList();
            if (currentChatId === (chat && chat.id)) {
                if (window.chatUiCore && typeof window.chatUiCore.renderMessages === 'function') {
                    window.chatUiCore.renderMessages(false, true);
                } else if (typeof window.renderMessages === 'function') {
                    window.renderMessages(false, true);
                }
                if (typeof window.showToast === 'function') window.showToast(`${character.remarkName} 向你发起了心动绑定！`);
                if (typeof window.hideTypingIndicator === 'function') window.hideTypingIndicator();
            } else if (typeof window.addNotificationToQueue === 'function') {
                window.addNotificationToQueue({
                    avatar: character.avatar,
                    text: `<strong>${character.remarkName}</strong><br>发起了心动绑定邀请`,
                    chatId: character.id,
                    type: 'private'
                });
            }
            return '';
        }

        return fullResponse;
    }
};
window.soulBondLogic = window.SoulBondLogic;
window.updateBondRoster = window.SoulBondLogic.updateBondRoster;
window.findBoundCharacter = window.SoulBondLogic.findBoundCharacter;
