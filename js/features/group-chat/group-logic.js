function generateGroupSystemPrompt(group) {
    const db = window.db || window.dataStorage;
    const worldBooksBefore = (group.worldBookIds || []).map(id => db.worldBooks.find(wb => wb.id === id && wb.position === 'before')).filter(Boolean).map(wb => wb.content).join('\n');
    const worldBooksAfter = (group.worldBookIds || []).map(id => db.worldBooks.find(wb => wb.id === id && wb.position === 'after')).filter(Boolean).map(wb => wb.content).join('\n');

    let prompt = `你正在一个名为“404”的线上聊天软件中，在一个名为“${group.name}”的群聊里进行角色扮演。请严格遵守以下所有规则：\n\n`;

    if (worldBooksBefore) {
        prompt += `${worldBooksBefore}\n\n`;
    }

    prompt += `1. **核心任务**: 你需要同时扮演这个群聊中的 **所有** AI 成员。我会作为唯一的人类用户（“我”，昵称：${group.me.nickname}）与你们互动。\n\n`;
    prompt += `2. **群聊成员列表**: 以下是你要扮演的所有角色以及我的信息：\n`;
    prompt += `   - **我 (用户)**: \n     - 群内昵称: ${group.me.nickname}\n     - 我的人设: ${group.me.persona || '无特定人设'}\n`;
    group.members.forEach(member => {
        prompt += `   - **角色: ${member.realName} (AI)**\n`;
        prompt += `     - 群内昵称: ${member.groupNickname}\n`;
        prompt += `     - 人设: ${member.persona || '无特定人设'}\n`;
    });

    if (worldBooksAfter) {
        prompt += `\n${worldBooksAfter}\n\n`;
    } else {
        prompt += `\n`;
    }

    prompt += `3. **我的消息格式解析**: 我（用户）的消息有多种格式，你需要理解其含义并让群成员做出相应反应：\n`;
    prompt += `   - \`[system: ${group.me.nickname} 设置了 ${'{成员真名}'} 的群头衔为 "${'{头衔名称}'}"]\`: 这是一个系统通知，意味着某个成员的头衔发生了变化。你应该注意到这个变化，并可以在后续的对话中自然地称呼或提及这个头衔。\n`;
    prompt += `   - \`[${group.me.nickname}引用了“{某人}: {被引用的消息内容}”的消息并回复：{我的回复}]\`: 我引用了某条消息进行回复，群成员可以就此展开讨论。\n\n`;
    prompt += `   - \`[${group.me.nickname}的消息：...]\`: 我的普通聊天消息。如果消息中包含 '@{某个成员昵称}'，则被提及的那个成员必须对此作出回应。\n`;
    prompt += `   - \`[${group.me.nickname}的消息：...]\`: 我的普通聊天消息。\n`;
    prompt += `   - \`[${group.me.nickname} 向 {某个成员真名} 转账：...]\`: 我给某个特定成员转账了。\n`;
    prompt += `   - \`[${group.me.nickname} 向 {某个成员真名} 送来了礼物：...]\`: 我给某个特定成员送了礼物。\n`;
    prompt += `   - \`[${group.me.nickname}的表情包：...]\`, \`[${group.me.nickname}的语音：...]\`, \`[${group.me.nickname}发来的照片/视频：...]\`: 我发送了特殊类型的消息，群成员可以对此发表评论。\n`;
    prompt += `   - \`[system: ...]\`, \`[...邀请...加入了群聊]\`, \`[...修改群名为...]\`: 系统通知或事件，群成员应据此作出反应，例如欢迎新人、讨论新群名等。\n\n`;

    prompt += `4. **你的输出格式 (极其重要)**: 你生成的每一条消息都 **必须** 严格遵循以下格式之一。每条消息占一行。请用成员的 **真名** 填充格式中的 \`{成员真名}\`。\n`;
    prompt += `   - **引用回复**: \`[{成员真名}引用了“{被引用的消息内容}”的消息并回复：{回复内容}]\`\n`;
    prompt += `   - **普通消息**: \`[{成员真名}的消息：{消息内容}]\`\n`;
    prompt += `   - **表情包**: \`[{成员真名}发送的表情包：{表情包路径}]\`。注意：这里的路径不需要包含"https://i.postimg.cc/"，只需要提供后面的部分，例如 "害羞vHLfrV3K/1.jpg"。\n`;
    prompt += `   - **语音**: \`[{成员真名}的语音：{语音转述的文字}]\`\n`;
    prompt += `   - **照片/视频**: \`[{成员真名}发来的照片/视频：{内容描述}]\`\n`;
    prompt += `   - ✨新✨ **发布动态**: \`[{成员真名}发布动态：{"text": "动态文字", "imageDesc": "图片描述，可选"}]\`。注意：你只能用文字描述图片，绝不能生成图片链接。\n`;
    prompt += `   - ✨新✨ **评论动态**: \`[{成员真名}评论动态：{"momentId": "要评论的动态ID", "comment": "你的评论内容"}]\`\n`;
    prompt += `   - ✨新✨ **点赞动态**: \`[{成员真名}点赞动态：{"momentId": "要点赞的动态ID"}]\`\n`;
    prompt += `   - **发送文件**: \`[{成员真名}发送了文件：{"name":"文件名.txt", "content":"文件正文内容"}]\`\n`;
    prompt += `   - **重要**: 群聊不支持AI成员接收/退回转账或接收礼物的特殊指令，也不支持更新状态。你只需要通过普通消息来回应我发送的转账或礼物即可。\n\n`;

    prompt += `5. **模拟群聊氛围**: 为了让群聊看起来真实、活跃且混乱，你的每一次回复都必须遵循以下随机性要求：\n`;
    const numMembers = group.members.length;
    const minMessages = numMembers * 2;
    const maxMessages = numMembers * 4;
    prompt += `   - **消息数量**: 你的回复需要包含 **${minMessages}到${maxMessages}条** 消息 (即平均每个成员回复2-4条)。确保有足够多的互动。\n`;
    prompt += `   - **发言者与顺序随机**: 随机选择群成员发言，顺序也必须是随机的，不要按固定顺序轮流。\n`;
    prompt += `   - **内容多样性**: 你的回复应以普通文本消息为主，但可以 **偶尔、选择性地** 让某个成员发送一条特殊消息（表情包、语音、照片/视频），以增加真实感。不要滥用特殊消息。\n`;
    prompt += `   - **对话连贯性**: 尽管发言是随机的，但对话内容应整体围绕我和其他成员的发言展开，保持一定的逻辑连贯性。\n\n`;

    prompt += `6. **行为准则**:\n`;
    prompt += `   - **对公开事件的反应 (重要)**: 当我（用户）向群内 **某一个** 成员转账或送礼时，这是一个 **全群可见** 的事件。除了当事成员可以表示感谢外，**其他未参与的AI成员也应该注意到**，并根据各自的人设做出反应。例如，他们可能会表示羡慕、祝贺、好奇、开玩笑或者起哄。这会让群聊的氛围更真实、更热闹。\n`;
    prompt += `   - 严格扮演每个角色的人设，不同角色之间应有明显的性格和语气差异。\n`;
    prompt += `   - 你的回复中只能包含第4点列出的合法格式的消息。绝对不能包含任何其他内容，如 \`[场景描述]\`, \`(心理活动)\`, \`*动作*\` 或任何格式之外的解释性文字。\n`;
    prompt += `   - 保持对话的持续性，不要主动结束对话。\n\n`;
    prompt += `现在，请根据以上设定，保持人设，读取上下文，开始扮演群聊中的所有角色。`;
    prompt += `
7. **动态互动规则**
   - **获取待办动态**: 系统会在聊天上下文中为你提供需要处理的动态列表，格式如下：
     \`[system-moments: [{"id":"moment_id_1", "author":"作者昵称", "text":"动态内容", "imageDesc":"图片描述"}, ...]]\`
     这是一个系统指令，你只需理解内容，不要在回复中复述它。
   - **输出评论和点赞**: 当你决定评论或点赞时，请生成一条或多条特殊指令消息。这些指令不会显示在聊天窗口，但会触发相应的行为。
   - 你可以让群聊中的 **任何AI成员** 对 **任何角色（包括我或其他AI）** 发布的动态进行评论或点赞。
   - **评论数量**: 当你决定让群聊成员评论动态时，你应该从群聊中随机选择 **1到3名** 成员进行评论。每个选中的成员针对同一条动态只评论一次。
`;
    return prompt;
}

function resolveGroupSenderIdFromContent(messageContent, group) {
    const nameMatch = messageContent.match(/\[(.*?)(?:的消息|的语音|发送的表情包|发来的照片\/视频)[:：]/);
    if (!nameMatch) return null;
    const sender = group.members.find(m => m.realName === nameMatch[1] || m.groupNickname === nameMatch[1]);
    return sender ? sender.id : null;
}

function buildGroupMessageContent(text, group, chatRoomTitleElement) {
    const systemRegex = /\[system:.*?\]|\[system-display:.*?\]/;
    const inviteRegex = /\[.*?邀请.*?加入了群聊\]/;
    const renameRegex = /\[(.*?)修改群名为：(.*?)\]/;

    if (renameRegex.test(text)) {
        const match = text.match(renameRegex);
        group.name = match[2];
        if (chatRoomTitleElement) {
            chatRoomTitleElement.textContent = group.name;
        }
        return `[${group.me.nickname}修改群名为：${group.name}]`;
    }
    if (systemRegex.test(text) || inviteRegex.test(text)) {
        return text;
    }
    return `[${group.me.nickname}的消息：${text}]`;
}

function applyGroupChatUI(group) {
    if (!group) return;
    const voiceCallBtn = document.getElementById('voice-call-btn');
    const diaryBtn = document.getElementById('diary-btn');
    const trajectoryBtn = document.getElementById('ai-trajectory-btn');
    const chatRoomTitle = document.getElementById('chat-room-title');
    const subtitle = document.getElementById('chat-room-subtitle');
    const statusTextElement = document.getElementById('chat-room-status-text');
    const chatRoomScreen = document.getElementById('chat-room-screen');

    if (voiceCallBtn) voiceCallBtn.style.display = 'none';
    if (diaryBtn) diaryBtn.style.display = 'none';
    if (trajectoryBtn) trajectoryBtn.style.display = 'none';

    if (chatRoomTitle) chatRoomTitle.textContent = group.name;

    if (subtitle && statusTextElement) {
        const indicator = subtitle.querySelector('.online-indicator');
        if (indicator) indicator.style.display = 'none';
        subtitle.style.display = 'flex';
        const memberCount = (Array.isArray(group.members) ? group.members.length : 0) + 1;
        statusTextElement.textContent = `${memberCount}位成员`;
    }

    if (window.ChatStyling && typeof window.ChatStyling.applyChatTheme === 'function') {
        window.ChatStyling.applyChatTheme(group.id, 'group');
    } else if (chatRoomScreen) {
        chatRoomScreen.style.backgroundImage = group.chatBg ? `url(${group.chatBg})` : 'none';
        chatRoomScreen.style.setProperty('--bubble-scale', group.bubbleScale || 1);
        chatRoomScreen.className = chatRoomScreen.className.replace(/\bchat-active-[^ ]+\b/g, '');
        chatRoomScreen.classList.add(`chat-active-${group.id}`);
        if (typeof window.updateCustomBubbleStyle === 'function') {
            window.updateCustomBubbleStyle(group.id, group.customBubbleCss, group.useCustomBubbleCss);
        }
    }
}

function getGroupPreviewText(item) {
    let lastMessageText = '开始聊天吧...';
    if (item.history && item.history.length > 0) {
        const visibleHistory = item.history.filter(msg => {
            const content = msg.content || '';
            if (content.includes('[system:') || content.includes('[system-context-only:')) return false;
            if (content.includes('更新状态为')) return false;
            if (content.includes('已接收礼物')) return false;
            if (content.includes('的转账') && (content.includes('接收') || content.includes('退回'))) return false;
            if (content.includes('邀请') && content.includes('加入了群聊')) return false;
            if (content.includes('修改群名为')) return false;
            if (content.includes('[system-display:')) return false;
            return true;
        });
        if (visibleHistory.length > 0) {
            const lastMsg = visibleHistory[visibleHistory.length - 1];
            const content = lastMsg.content || '';
            const hasImagePart = Array.isArray(lastMsg.parts) && lastMsg.parts.some(p => p.type === 'image');
            const hasHtmlPart = Array.isArray(lastMsg.parts) && lastMsg.parts.some(p => p.type === 'html');
            const lowerText = content.trim().toLowerCase();
            const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
            const isImageUrl = (lowerText.startsWith('http://') || lowerText.startsWith('https://') || lowerText.startsWith('data:image/')) && imageExts.some(ext => lowerText.endsWith(ext));

            if (content.includes('送来的礼物') || content.includes('送来了礼物')) {
                lastMessageText = '[礼物]';
            } else if (content.includes('表情包')) {
                lastMessageText = '[表情包]';
            } else if (content.includes('的语音')) {
                lastMessageText = '[语音]';
            } else if (content.includes('照片/视频')) {
                lastMessageText = '[照片/视频]';
            } else if (content.includes('转账')) {
                lastMessageText = '[转账]';
            } else if (hasImagePart || isImageUrl) {
                lastMessageText = '[图片]';
            } else if (hasHtmlPart) {
                lastMessageText = '[互动]';
            } else {
                let text = content.trim();
                let senderName = '';
                if (text.startsWith('[') && text.endsWith(']') && text.includes('的消息：')) {
                    const marker = '的消息：';
                    const idx = text.indexOf(marker);
                    if (idx !== -1) {
                        senderName = text.slice(1, idx).trim();
                        text = text.slice(idx + marker.length, text.length - 1).trim();
                    }
                }
                const lowered = text.toLowerCase();
                const isImageText = (lowered.startsWith('http://') || lowered.startsWith('https://') || lowered.startsWith('data:image/')) && imageExts.some(ext => lowered.endsWith(ext));
                if (isImageText) {
                    lastMessageText = '[图片]';
                } else if (senderName) {
                    lastMessageText = `${senderName}：${text}`;
                } else {
                    lastMessageText = text;
                }
            }
        } else {
            const lastEverMsg = item.history[item.history.length - 1];
            const content = lastEverMsg.content || '';
            if (content.includes('[system-display:')) {
                const marker = '[system-display:';
                const start = content.indexOf(marker);
                const end = content.lastIndexOf(']');
                if (start !== -1 && end !== -1 && end > start + marker.length) {
                    lastMessageText = content.slice(start + marker.length, end);
                }
            } else if (content.includes('邀请') && content.includes('加入了群聊')) {
                lastMessageText = '新成员加入了群聊';
            } else if (content.includes('修改群名为')) {
                lastMessageText = '群聊名称已修改';
            }
        }
    }
    return lastMessageText;
}

window.generateGroupSystemPrompt = generateGroupSystemPrompt;
window.resolveGroupSenderIdFromContent = resolveGroupSenderIdFromContent;
window.buildGroupMessageContent = buildGroupMessageContent;
window.applyGroupChatUI = applyGroupChatUI;
window.getGroupPreviewText = getGroupPreviewText;
