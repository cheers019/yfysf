(function () {
    function getRuntime() {
        const appState = window.appState || {};
        return {
            appState,
            db: appState.db || window.db,
            currentChatId: appState.currentChatId,
            currentChatType: appState.currentChatType || 'private'
        };
    }

    function calculateVoiceDuration(text) {
        return Math.max(1, Math.min(60, Math.ceil(text.length / 3.5)));
    }

    function isolateHtmlIds(html, suffix) {
        if (!html || !suffix) return html;

        let result = html;
        const idMatches = [...html.matchAll(/id=["']([a-zA-Z][\w-]*)["']/g)];
        const ids = new Set(idMatches.map(m => m[1]));

        ids.forEach(oldId => {
            const newId = `${oldId}_${suffix}`;
            result = result.replace(new RegExp(`(id|for|aria-controls|list)=["']${oldId}["']`, 'g'), `$1="${newId}"`);
            result = result.replace(new RegExp(`#${oldId}(?![\\w-])`, 'g'), `#${newId}`);
            result = result.replace(new RegExp(`(['"])${oldId}\\1`, 'g'), `$1${newId}$1`);
            result = result.replace(new RegExp(`href=["']#${oldId}["']`, 'g'), `href="#${newId}"`);
        });

        const nameMatches = [...html.matchAll(/name=["']([^"']+)["']/g)];
        const names = new Set(nameMatches.map(m => m[1]));

        names.forEach(oldName => {
            const newName = `${oldName}_${suffix}`;
            result = result.replace(new RegExp(`name=["']${oldName}["']`, 'g'), `name="${newName}"`);
        });

        return result;
    }

    function resolveMusicCover(coverValue) {
        const normalized = typeof coverValue === 'string' ? coverValue.trim() : '';
        if (!normalized || (window.musicCoverPlaceholders && window.musicCoverPlaceholders.has(normalized))) {
            return window.defaultMusicCoverUrl;
        }
        return normalized;
    }

    function parseSongTitleArtist(rawSongText) {
        const cleaned = String(rawSongText || '').replace(/[《》“”"]/g, '').trim();
        if (!cleaned) return { title: '', artist: '' };
        const parts = cleaned.split(/[-–—]/);
        if (parts.length >= 2) {
            const title = parts.shift().trim();
            const artist = parts.join('-').trim();
            return { title, artist };
        }
        return { title: cleaned, artist: '' };
    }

    function createElementFromHTML(html) {
        if (!html) return null;
        const container = document.createElement('div');
        container.innerHTML = html;
        return container.firstElementChild;
    }

    function createBubbleShell(payload) {
        const { id, isSent, bubbleTheme, chat, currentChatType, senderId, senderNickname, titleBadgeHTML, timestamp, avatarUrl, finalContentHTML, isRenderedByRule } = payload;
        const wrapper = document.createElement('div');
        wrapper.dataset.id = id;
        wrapper.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;
        if (currentChatType === 'private') {
            if (isSent && chat.isBlockedByAi && chat.aiBlockTimestamp && timestamp >= chat.aiBlockTimestamp && (!chat.blockEndTime || timestamp < chat.blockEndTime)) { wrapper.classList.add('user-was-blocked'); }
            else if (!isSent && chat.isBlockedByUser && chat.userBlockTimestamp && timestamp >= chat.userBlockTimestamp) { wrapper.classList.add('ai-was-blocked'); }
        }
        if (currentChatType === 'group' && !isSent) { wrapper.classList.add('group-message'); }

        const bubbleRow = document.createElement('div');
        bubbleRow.className = 'message-bubble-row';

        if (currentChatType === 'private') {
            if (isSent) bubbleRow.innerHTML += `<span class="block-indicator sent">!</span>`;
            else bubbleRow.innerHTML += `<span class="block-indicator received">!</span>`;
        }

        const timeString = `${pad(new Date(timestamp).getHours())}:${pad(new Date(timestamp).getMinutes())}`;
        const infoDiv = document.createElement('div');
        infoDiv.className = 'message-info';

        let frameUrl = null;
        if (currentChatType === 'private') { frameUrl = isSent ? chat.myAvatarFrameUrl : chat.avatarFrameUrl; }
        else { const sender = isSent ? chat.me : chat.members.find(m => m.id === senderId); if (sender) frameUrl = sender.avatarFrameUrl; }

        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'avatar-container';
        avatarContainer.innerHTML = `<img src="${avatarUrl}" class="message-avatar">${frameUrl ? `<img src="${frameUrl}" class="avatar-frame">` : ''}`;
        infoDiv.innerHTML = `<span class="message-time">${timeString}</span>`;
        infoDiv.prepend(avatarContainer);

        if (isRenderedByRule) {
            const theaterNode = document.createElement('div');
            theaterNode.className = 'ai-generated-theater';
            theaterNode.innerHTML = finalContentHTML;
            bubbleRow.appendChild(infoDiv);
            bubbleRow.appendChild(theaterNode);
        } else {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = finalContentHTML;
            const specialBubble = tempContainer.firstElementChild;
            const specialClasses = ['image-bubble', 'pv-card', 'transfer-card', 'gift-card', 'file-card', 'location-card', 'music-card', 'voice-bubble'];
            const hasTranscript = tempContainer.querySelector('.voice-transcript');

            if (specialBubble && specialClasses.some(cls => specialBubble.classList.contains(cls)) && !hasTranscript) {
                bubbleRow.appendChild(infoDiv);
                bubbleRow.appendChild(specialBubble);

                if (specialBubble.classList.contains('gift-card')) {
                    const giftDesc = tempContainer.querySelector('.gift-card-description');
                    if (giftDesc) {
                        bubbleRow.appendChild(giftDesc);
                    }
                }

            } else {
                const bubbleElement = document.createElement('div');
                if (hasTranscript) {
                    bubbleElement.className = 'voice-message-container';
                    bubbleElement.style.background = 'none';
                    bubbleElement.style.padding = '0';
                } else {
                    bubbleElement.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
                    if (!chat.useCustomBubbleCss) {
                        bubbleElement.style.backgroundColor = bubbleTheme.bg;
                        bubbleElement.style.color = bubbleTheme.text;
                    }
                }
                bubbleElement.innerHTML = finalContentHTML;
                bubbleRow.appendChild(infoDiv);
                bubbleRow.appendChild(bubbleElement);
            }
        }

        if (currentChatType === 'group' && !isSent) {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'group-message-header';
            headerDiv.innerHTML = `${titleBadgeHTML}<span class="group-sender-name">${senderNickname}</span>`;
            wrapper.appendChild(headerDiv);
        }

        wrapper.appendChild(bubbleRow);
        return wrapper;
    }

    async function renderMusicCardForChat(chat, rawSongText) {
        if (!chat || !rawSongText) return;
        const { title, artist } = parseSongTitleArtist(rawSongText);
        if (!title) return;
        const placeholderMessage = {
            id: `msg_music_search_${Date.now()}_${Math.random()}`,
            role: 'assistant',
            content: '🎵 正在为你寻找音源...',
            parts: [{ type: 'text', text: '🎵 正在为你寻找音源...' }],
            timestamp: Date.now()
        };
        chat.history.push(placeholderMessage);
        const chatScreen = document.getElementById('chat-room-screen');
        const runtime = getRuntime();
        if (runtime.currentChatId === chat.id && chatScreen && chatScreen.classList.contains('active')) {
            if (typeof window.addMessageBubble === 'function') {
                window.addMessageBubble(placeholderMessage);
            }
        }
        let searchResult = null;
        if (typeof window.searchAndPlaySong === 'function') {
            try {
                searchResult = await window.searchAndPlaySong(title, artist, { autoplay: false, forceCloud: true });
            } catch (e) {
                searchResult = null;
            }
        }
        const placeholderIndex = chat.history.findIndex(m => m.id === placeholderMessage.id);
        const messageArea = document.getElementById('message-area');
        const wrapper = messageArea ? messageArea.querySelector(`.message-wrapper[data-id="${placeholderMessage.id}"]`) : null;
        if (!searchResult || !searchResult.song) {
            if (placeholderIndex !== -1) {
                chat.history.splice(placeholderIndex, 1);
            }
            if (wrapper) wrapper.remove();
            return;
        }
        const song = searchResult.song;
        const songData = {
            name: song.name || title,
            artist: song.artist || artist,
            url: song.url || '',
            cover: resolveMusicCover(song.albumArt || song.cover)
        };
        if (placeholderIndex !== -1) {
            const roleName = chat.realName || chat.remarkName || 'AI';
            const displayText = songData.artist ? `${songData.name} - ${songData.artist}` : songData.name;
            chat.history[placeholderIndex].content = `[${roleName}分享了音乐：${displayText}]`;
            chat.history[placeholderIndex].parts = [{ type: 'text', text: chat.history[placeholderIndex].content }];
            chat.history[placeholderIndex].musicCardData = songData;
        }
        if (wrapper) {
            const bubble = wrapper.querySelector('.message-bubble');
            if (bubble) {
                bubble.innerHTML = window.displayDispatcher.dispatchRender('music', songData);
            }
        }
    }

    function registerCoreRenderers() {
        if (!window.displayDispatcher || typeof window.displayDispatcher.register !== 'function') return false;
        window.displayDispatcher.register('system', function (data) {
            if (!data || !data.message) return '';
            const { message, inviteMatch, renameMatch } = data;
            let bubbleText = '';
            if (inviteMatch) bubbleText = `${inviteMatch[1]}邀请${inviteMatch[2]}加入了群聊`;
            if (renameMatch) bubbleText = `${renameMatch[1]}修改群名为“${renameMatch[2]}”`;
            if (!bubbleText) return '';
            return `<div class="message-wrapper system-notification" data-id="${message.id}" data-display-type="system"><div class="system-notification-bubble">${bubbleText}</div></div>`;
        });
        window.displayDispatcher.register('time-divider', function (data) {
            if (!data || !data.message || !data.timeSkipMatch) return '';
            const bubbleText = data.timeSkipMatch[1];
            if (!bubbleText) return '';
            return `<div class="message-wrapper system-notification" data-id="${data.message.id}" data-display-type="time-divider"><div class="system-notification-bubble">${bubbleText}</div></div>`;
        });
        window.displayDispatcher.register('recall', function (data) {
            if (!data || !data.message) return '';
            const { message, recaller } = data;
            const recallText = `${recaller}撤回了一条消息`;
            return `<div class="message-wrapper system-notification" data-id="${message.id}" data-display-type="recall"><div class="recalled-message-placeholder" data-recalled-message-id="${message.id}" style="cursor: pointer;">${recallText}</div></div>`;
        });
        window.displayDispatcher.register('text', function (data) {
            if (!data) return '';
            const urlRegex = /^(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)|data:image\/[a-z]+;base64,)/i;
            let innerText = '';
            if (data.textMatch && data.textMatch[1]) innerText = data.textMatch[1].trim();
            else innerText = String(data.content || '').trim();
            if (!innerText) return '';
            if (urlRegex.test(innerText)) return `<div class="image-bubble"><img src="${innerText}" alt="图片消息"></div>`;
            return escapeHTML(innerText).replace(/\n/g, '<br>');
        });
        window.displayDispatcher.register('quote', function (data) {
            if (!data || !data.message) return '';
            const { message, aiQuoteMatch, senderNickname, currentChatType, chat } = data;
            let quotedSender, quotedText, replyText;
            if (message.quote) {
                quotedSender = message.quote.sender;
                quotedText = message.quote.content;
                replyText = message.replyText;
            } else if (aiQuoteMatch) {
                quotedSender = senderNickname || (currentChatType === 'private' ? chat.remarkName : '群成员');
                quotedText = aiQuoteMatch[1].trim();
                replyText = aiQuoteMatch[2].trim();
            }
            if (!quotedText || !replyText) return '';
            return `<div class="quoted-content"><div class="quoted-sender">${quotedSender}</div><div class="quoted-text">${quotedText}</div></div><div class="reply-text">${replyText}</div>`;
        });
        return true;
    }

    function createMessageBubbleElement(message) {
        const updateStatusRegexForRender = /\[.*?更新状态为[:：].*?\]/;
        if (message.content.startsWith('[system:') || message.content.startsWith('[system-context-only:') || updateStatusRegexForRender.test(message.content)) {
            return null;
        }

        const dispatcher = window.displayDispatcher;
        const canDispatch = dispatcher && typeof dispatcher.dispatchRender === 'function';

        if (message.recalled) {
            const recaller = (message.recalledBy === 'user') ? '你' : '对方';
            const recallResult = canDispatch ? dispatcher.dispatchRender('recall', { message, recaller }) : '';
            const recallElement = recallResult instanceof HTMLElement ? recallResult : createElementFromHTML(recallResult);
            return recallElement || null;
        }

        const timeSkipRegex = /\[system-display:([\s\S]+?)\]/;
        const inviteRegex = /\[(.*?)邀请(.*?)加入了群聊\]/;
        const renameRegex = /\[(.*?)修改群名为：(.*?)\]/;
        const timeSkipMatch = message.content.match(timeSkipRegex);
        const inviteMatch = message.content.match(inviteRegex);
        const renameMatch = message.content.match(renameRegex);

        if (timeSkipMatch) {
            const timeDividerResult = canDispatch ? dispatcher.dispatchRender('time-divider', { message, timeSkipMatch }) : '';
            const timeDividerElement = timeDividerResult instanceof HTMLElement ? timeDividerResult : createElementFromHTML(timeDividerResult);
            if (timeDividerElement) return timeDividerElement;
            return null;
        }

        if (inviteMatch || renameMatch) {
            const systemResult = canDispatch ? dispatcher.dispatchRender('system', { message, inviteMatch, renameMatch }) : '';
            const systemElement = systemResult instanceof HTMLElement ? systemResult : createElementFromHTML(systemResult);
            if (systemElement) return systemElement;
            return null;
        }

        const runtime = getRuntime();
        const db = runtime.db;
        const currentChatId = runtime.currentChatId;
        const currentChatType = runtime.currentChatType;
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat) return null;

        const { role, content, timestamp, id, senderId, transferStatus, giftStatus, stickerData } = message;
        const isSent = (currentChatType === 'group') ? (senderId === 'user_me') : (role === 'user');
        let avatarUrl, bubbleTheme, senderNickname = '', titleBadgeHTML = '';

        const colorThemes = window.colorThemes || {};
        const themeKey = chat.theme || 'white_pink';
        const theme = colorThemes[themeKey] || colorThemes['white_pink'];
        bubbleTheme = isSent ? theme.sent : theme.received;

        if (currentChatType === 'group') {
            const sender = isSent ? chat.me : chat.members.find(m => m.id === senderId);
            if (sender) {
                avatarUrl = sender.avatar;
                senderNickname = sender.nickname || sender.groupNickname;
                if (sender.groupTitle) {
                    const badgeClass = getBadgeClassForTitle(sender.groupTitle);
                    titleBadgeHTML = `<span class="group-title-badge ${badgeClass}">${sender.groupTitle}</span>`;
                }
            } else {
                avatarUrl = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
                senderNickname = '未知成员';
            }
        } else {
            avatarUrl = isSent ? chat.myAvatar : chat.avatar;
        }

        let finalContentHTML;
        let isRenderedByRule = false;

        const rawTextOriginal = content;
        const renderResult = { isRendered: false, text: rawTextOriginal };
        if (!isSent && typeof window.applyAdvancedRenderingRules === 'function') {
            const renderedHtml = window.applyAdvancedRenderingRules(rawTextOriginal, currentChatId);
            if (renderedHtml && renderedHtml !== rawTextOriginal) {
                renderResult.isRendered = true;
                renderResult.html = renderedHtml;
            }
        }

        const universalStyle = `<style>.ai-generated-theater img, .ai-theater img { max-width: 100% !important; height: auto !important; border-radius: 8px; display: block; margin: 5px 0; } .ai-generated-theater, .ai-theater { width: 100%; overflow-x: hidden; word-wrap: break-word; pointer-events: auto !important; }</style>`;

        if (renderResult.isRendered) {
            const suffix = (id || Date.now()).toString().slice(-6);
            finalContentHTML = universalStyle + isolateHtmlIds(renderResult.html, suffix);
            isRenderedByRule = true;
        }
        else if (content.includes('<div class="ai-theater"') || content.includes('class="ai-generated-theater"')) {
            const suffix = (id || Date.now()).toString().slice(-6);
            finalContentHTML = universalStyle + isolateHtmlIds(content, suffix);
            isRenderedByRule = true;
        }
        else {
            const aiQuoteRegex = /\[(?:.*?)引用了“(?:.*?:)?\s?([\s\S]+?)”的消息?并回复：([\s\S]+?)\]/;
            const musicShareRegex = /\[(?:.*?)分享了音乐：([\s\S]+?) - ([\s\S]+?)\]/;
            const locationRegex = /\[(.*?)的位置共享：主位置 '(.*?)', 详细位置 '(.*?)'\]|\[(.*?)分享了位置：主位置 '(.*?)', 详细位置 '(.*?)'\]/i;
            const urlRegex = /^(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)|data:image\/[a-z]+;base64,)/i;
            const sentStickerRegex = /\[(?:.+?)的表情包：.+?\]/i;
            const receivedStickerRegex = /\[(?:.+?)发送的表情包：([\s\S]+?)\]/i;
            const bareImageLinkRegex = /^\[(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg))\]$/i;
            const voiceRegex = /\[(?:.+?)的语音：([\s\S]+?)\]/;
            const photoVideoRegex = /\[(?:.+?)发来的照片\/视频：([\s\S]+?)\]/;
            const privateSentTransferRegex = /\[.*?给你转账：([\d.]+)元；备注：(.*?)\]/;
            const privateReceivedTransferRegex = /\[.*?的转账：([\d.]+)元；备注：(.*?)\]/;
            const groupTransferRegex = /\[(.*?)\s*向\s*(.*?)\s*转账：([\d.]+)元；备注：(.*?)\]/;
            const privateGiftRegex = /\[(?:.+?)送来的礼物：([\s\S]+?)\]/;
            const groupGiftRegex = /\[(.*?)\s*向\s*(.*?)\s*送来了礼物：([\s\S]+?)\]/;
            const imageRecogRegex = /\[.*?发来了一张图片：\]/;
            const textRegex = /\[(?:.+?)的消息[:：]\s*([\s\S]+?)\]/;
            const fileRegex = /\[(?:.+?)发送了文件：(\{[\s\S]*?\})\]/;

            const aiQuoteMatch = content.match(aiQuoteRegex);
            const musicMatch = content.match(musicShareRegex);
            const locationMatch = content.match(locationRegex);
            const sentStickerMatch = content.match(sentStickerRegex);
            const receivedStickerMatch = content.match(receivedStickerRegex);
            const bareImageLinkMatch = content.match(bareImageLinkRegex);
            const voiceMatch = content.match(voiceRegex);
            const photoVideoMatch = content.match(photoVideoRegex);
            const privateSentTransferMatch = content.match(privateSentTransferRegex);
            const privateReceivedTransferMatch = content.match(privateReceivedTransferRegex);
            const groupTransferMatch = content.match(groupTransferRegex);
            const privateGiftMatch = content.match(privateGiftRegex);
            const groupGiftMatch = content.match(groupGiftRegex);
            const imageRecogMatch = content.match(imageRecogRegex);
            const textMatch = content.match(textRegex);
            const fileMatch = content.match(fileRegex);
            const musicCardData = message.musicCardData;
            const stickerHtml = window.displayDispatcher && typeof window.displayDispatcher.dispatchRender === 'function'
                ? window.displayDispatcher.dispatchRender('sticker', message)
                : '';

            if (message.bondRequestData) {
                finalContentHTML = window.displayDispatcher.dispatchRender('soul-bond-request', message);

            } else if (message.quote || aiQuoteMatch) {
                if (canDispatch) {
                    finalContentHTML = dispatcher.dispatchRender('quote', { message, aiQuoteMatch, senderNickname, currentChatType, chat });
                } else {
                    let quotedSender, quotedText, replyText;
                    if (message.quote) {
                        quotedSender = message.quote.sender;
                        quotedText = message.quote.content;
                        replyText = message.replyText;
                    } else {
                        quotedSender = senderNickname || (currentChatType === 'private' ? chat.remarkName : '群成员');
                        quotedText = aiQuoteMatch[1].trim();
                        replyText = aiQuoteMatch[2].trim();
                    }
                    finalContentHTML = `<div class="quoted-content"><div class="quoted-sender">${quotedSender}</div><div class="quoted-text">${quotedText}</div></div><div class="reply-text">${replyText}</div>`;
                }

            } else if (musicCardData) {
                finalContentHTML = window.displayDispatcher.dispatchRender('music', musicCardData);

            } else if (musicMatch) {
                finalContentHTML = window.displayDispatcher.dispatchRender('music', { name: musicMatch[1].trim(), artist: musicMatch[2].trim() });

            } else if (message.callRecordData) {
                finalContentHTML = window.displayDispatcher.dispatchRender('call', message.callRecordData);

            } else if (message.deliveryData) {
                finalContentHTML = window.displayDispatcher.dispatchRender('delivery', message.deliveryData);

            } else if (message.paymentRequestData) {
                const data = message.paymentRequestData;
                finalContentHTML = window.displayDispatcher.dispatchRender('payment-request', { ...data, _isSent: isSent });

            } else if (message.fileData && message.fileData.name) {
                finalContentHTML = window.displayDispatcher.dispatchRender('file', { fileData: message.fileData });

            } else if (fileMatch) {
                finalContentHTML = window.displayDispatcher.dispatchRender('file', { fileMatch });

            } else if (message.locationData || locationMatch) {
                finalContentHTML = window.displayDispatcher.dispatchRender('location', { locationData: message.locationData, locationMatch });

            } else if (stickerHtml) {
                finalContentHTML = stickerHtml;

            } else if (!isSent && bareImageLinkMatch) {
                finalContentHTML = `<div class="image-bubble"><img src="${bareImageLinkMatch[1]}" alt="表情包"></div>`;

            } else if (privateGiftMatch || groupGiftMatch) {
                finalContentHTML = window.displayDispatcher.dispatchRender('gift', { privateGiftMatch, groupGiftMatch, giftStatus, isSent });

            } else if (voiceMatch) {
                const duration = calculateVoiceDuration(voiceMatch[1].trim());
                finalContentHTML = window.displayDispatcher.dispatchRender('voice', { text: voiceMatch[1].trim(), duration, bubbleTheme });

            } else if (privateSentTransferMatch || privateReceivedTransferMatch || groupTransferMatch) {
                finalContentHTML = window.displayDispatcher.dispatchRender('transfer', { privateSentTransferMatch, privateReceivedTransferMatch, groupTransferMatch, transferStatus, isSent });

            } else if (photoVideoMatch) {
                finalContentHTML = window.displayDispatcher.dispatchRender('video', { text: photoVideoMatch[1].trim(), isSent });

            } else if (imageRecogMatch || (message.parts && message.parts.some(p => p.type === 'image'))) {
                const imageData = (message.parts && message.parts.find(p => p.type === 'image')) ? message.parts.find(p => p.type === 'image').data : content;
                finalContentHTML = window.displayDispatcher.dispatchRender('image', { imageData });

            } else if (message.parts && message.parts[0] && message.parts[0].type === 'html') {
                const suffix = (id || Date.now()).toString().slice(-6);
                finalContentHTML = universalStyle + isolateHtmlIds(message.parts[0].text, suffix);

            } else {
                if (canDispatch) {
                    finalContentHTML = dispatcher.dispatchRender('text', { content, textMatch });
                } else {
                    let innerText = textMatch ? textMatch[1].trim() : content.trim();
                    if (urlRegex.test(innerText)) { finalContentHTML = `<div class="image-bubble"><img src="${innerText}" alt="图片消息"></div>`; }
                    else { finalContentHTML = escapeHTML(innerText).replace(/\n/g, '<br>'); }
                }
            }
        }

        return createBubbleShell({ id, isSent, bubbleTheme, chat, currentChatType, senderId, senderNickname, titleBadgeHTML, timestamp, avatarUrl, finalContentHTML, isRenderedByRule });
    }

    function renderMessages(isLoadMore = false, forceScrollToBottom = false) {
        const runtime = getRuntime();
        const db = runtime.db;
        const currentChatId = runtime.currentChatId;
        const currentChatType = runtime.currentChatType;
        const messageArea = document.getElementById('message-area');
        if (!messageArea || !db) return;

        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat || !chat.history) return;

        const targetIdToHighlight = window.targetMessageIdForHighlight;
        window.targetMessageIdForHighlight = null;

        const state = window.chatUiCoreState || {};
        const currentPage = state.currentPage || 1;
        const messagesPerPage = state.messagesPerPage || 50;

        const oldScrollHeight = messageArea.scrollHeight;
        const totalMessages = chat.history.length;
        const end = totalMessages - (currentPage - 1) * messagesPerPage;
        const start = Math.max(0, end - messagesPerPage);
        const messagesToRender = chat.history.slice(start, end);

        if (!isLoadMore) messageArea.innerHTML = '';

        const fragment = document.createDocumentFragment();
        messagesToRender.forEach(msg => {
            const bubble = createMessageBubbleElement(msg);
            if (bubble) fragment.appendChild(bubble);
        });

        const existingLoadBtn = document.getElementById('load-more-btn');
        if (existingLoadBtn) existingLoadBtn.remove();

        messageArea.prepend(fragment);

        if (totalMessages > currentPage * messagesPerPage) {
            const loadMoreButton = document.createElement('button');
            loadMoreButton.id = 'load-more-btn';
            loadMoreButton.className = 'load-more-btn';
            loadMoreButton.textContent = '加载更早的消息';
            messageArea.prepend(loadMoreButton);
        }

        if (window.displayDispatcher && typeof window.displayDispatcher.runPostInits === 'function') {
            window.displayDispatcher.runPostInits(messageArea);
        }

        if (targetIdToHighlight) {
            setTimeout(() => {
                const targetElement = messageArea.querySelector(`.message-wrapper[data-id="${targetIdToHighlight}"]`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetElement.classList.add('message-highlight');
                    setTimeout(() => {
                        targetElement.classList.remove('message-highlight');
                    }, 2000);
                }
            }, 100);
        } else if (forceScrollToBottom) {
            setTimeout(() => {
                messageArea.scrollTop = messageArea.scrollHeight;
            }, 0);
        } else if (isLoadMore) {
            messageArea.scrollTop = messageArea.scrollHeight - oldScrollHeight;
        }
    }

    if (!registerCoreRenderers()) {
        window.displayDispatcherPending = window.displayDispatcherPending || [];
        window.displayDispatcherPending.push(registerCoreRenderers);
    }

    window.chatUiCore = {
        renderMessages,
        createMessageBubbleElement,
        renderMusicCardForChat
    };
    window.renderMessages = renderMessages;
    window.createMessageBubbleElement = createMessageBubbleElement;
    window.renderMusicCardForChat = renderMusicCardForChat;
})();
