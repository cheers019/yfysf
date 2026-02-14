// START: "情绪天气" (Mood Weather) Feature
// ===============================================================
function setupMoodWeatherFeature() {
    const moodModal = document.getElementById('bond-mood-weather-modal');
    const moodIconEl = document.getElementById('mood-weather-icon');
    const moodReasonEl = document.getElementById('mood-weather-reason');
    const moodTitleEl = document.getElementById('mood-weather-title');
    const sootheBtn = document.getElementById('soothe-ai-btn');

    const CACHE_DURATION = 60 * 60 * 1000;

    async function handleMoodWeatherClick() {
        const characterId = document.getElementById('soul-bond-screen').dataset.characterId;
        const character = db.characters.find(c => c.id === characterId);
        if (!character) return;

        moodTitleEl.textContent = `${character.remarkName}现在的心情`;
        moodModal.classList.add('visible');

        character.soulBondData = character.soulBondData || {};
        const moodCache = character.soulBondData.moodCache;
        const now = Date.now();

        if (moodCache && (now - moodCache.timestamp < CACHE_DURATION)) {
            renderMoodWeatherModal(moodCache.data);
        } else {
            moodIconEl.innerHTML = '🤔';
            moodReasonEl.textContent = '正在感知Ta的情绪...';
            sootheBtn.style.display = 'none';

            try {
                const prompt = generateMoodWeatherPrompt(character);
                const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                           db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                           ? db.functionalApiSettings 
                                           : db.apiSettings;
                const aiResponseText = await callAiApi([{ role: 'user', content: prompt }], functionalSettings);
                const moodData = JSON.parse(aiResponseText.match(/{[\s\S]*}/)[0]);
                
                character.soulBondData.moodCache = {
                    data: moodData,
                    timestamp: now
                };
                await saveData();
                renderMoodWeatherModal(moodData);

            } catch (error) {
                moodReasonEl.textContent = `感知失败: ${error.message}`;
            }
        }
    }

    function renderMoodWeatherModal(moodData) {
        let icon = '☀️';
        let showSoothe = false;
        switch (moodData.mood) {
            case '晴朗': icon = '☀️'; break;
            case '多云': icon = '☁️'; break;
            case '小雨': icon = '🌧️'; showSoothe = true; break;
            case '雷暴': icon = '⛈️'; showSoothe = true; break;
        }
        moodIconEl.innerHTML = icon;
        moodReasonEl.textContent = `“${moodData.reason}”`;
        sootheBtn.style.display = showSoothe ? 'block' : 'none';
    }

    sootheBtn.addEventListener('click', async () => {
        const characterId = document.getElementById('soul-bond-screen').dataset.characterId;
        const character = db.characters.find(c => c.id === characterId);
        if (!character) return;

        const systemContent = `[system: 我注意到你现在的心情似乎不太好（情绪天气是${character.soulBondData.moodCache.data.mood}）。我在这里，想安慰你一下。请根据你的人设，对我做出回应。]`;
        const contextMessage = {
            id: `msg_soothe_${Date.now()}`,
            role: 'user',
            content: systemContent,
            parts: [{ type: 'text', text: systemContent }],
            timestamp: Date.now()
        };
        character.history.push(contextMessage);
        await saveData();
        
        moodModal.classList.remove('visible');
        showToast('安慰已送达~');

        if (currentChatId === character.id) {
            getAiReply();
        } else {
            renderChatList();
        }
    });

    document.querySelector('.bond-nav-btn[data-feature="mood"]').addEventListener('click', handleMoodWeatherClick);
}

function generateMoodWeatherPrompt(character) {
    const history = character.history.slice(-15);
    const historyText = history.map(msg => {
        const sender = msg.role === 'user' ? character.myName : character.remarkName;
        const contentMatch = msg.content.match(/\[.*?的消息：([\s\S]+?)\]/);
        const cleanContent = contentMatch ? contentMatch[1] : msg.content;
        return `${sender}: ${cleanContent}`;
    }).join('\n');

    return `你正在扮演角色“${character.realName}”，人设是：${character.persona}。
请根据我们最近的聊天记录，分析你此刻的心情。
规则:
1. 从【'晴朗', '多云', '小雨', '雷暴'】中选择一个最符合你当前心情的词。
2. 用第一人称视角，写一段**不少于100字**的内心独白，解释你为什么是这个心情。
3. 你的输出必须是严格的JSON格式，不要包含任何其他文字。

# 最近的聊天记录参考:
${historyText}

# JSON格式示例:
{
  "mood": "晴朗",
  "reason": "因为你刚才夸我了，我心里像开了花一样，一整天都变得明亮起来。和你聊天总能让我忘记所有烦恼，感觉世界都温柔了许多。真希望这样的时刻能再多一些。"
}`;
}
// ===============================================================
// END: "情绪天气" Feature
// ===============================================================
window.SoulBondMood = { setup: setupMoodWeatherFeature };
