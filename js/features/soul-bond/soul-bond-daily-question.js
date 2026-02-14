function setupDailyQuestionFeature() {
    const questionModal = document.getElementById('bond-daily-question-modal');
    const questionTextEl = document.getElementById('daily-question-text');
    const answerForm = document.getElementById('daily-question-answer-form');
    const answerTextarea = document.getElementById('daily-question-answer');
    const currentQuestionInput = document.getElementById('current-daily-question-text');
    let isSubmitting = false;

    async function handleDailyQuestionClick() {
        const character = window.SoulBondLogic.getBondCharacter();
        if (!character) return;

        character.soulBondData = character.soulBondData || {};
        character.soulBondData.dailyQuestionHistory = character.soulBondData.dailyQuestionHistory || [];

        const today = new Date().toISOString().slice(0, 10);
        const lastQuestion = character.soulBondData.dailyQuestionHistory[0];

        answerForm.style.display = 'block';
        answerTextarea.disabled = false;
        answerTextarea.value = '';
        answerForm.querySelector('button').disabled = false;

        if (lastQuestion && lastQuestion.date === today) {
            questionTextEl.textContent = lastQuestion.question;
            currentQuestionInput.value = lastQuestion.question;
            if (lastQuestion.answered) {
                answerTextarea.value = `你今天已经回答过啦：\n"${lastQuestion.userAnswer}"`;
                answerTextarea.disabled = true;
                answerForm.querySelector('button').disabled = true;
            }
            questionModal.classList.add('visible');
        } else {
            questionModal.classList.add('visible');
            questionTextEl.textContent = '正在为你准备今天的问题...';
            answerForm.style.display = 'none';

            try {
                const prompt = generateDailyQuestionPrompt(character);
                const functionalSettings = db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                                           db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model
                                           ? db.functionalApiSettings 
                                           : db.apiSettings;
                const aiResponseText = await callAiApi([{ role: 'user', content: prompt }], functionalSettings);
                
                const newQuestion = {
                    date: today,
                    question: aiResponseText.trim(),
                    answered: false,
                    userAnswer: '',
                    aiResponse: ''
                };

                character.soulBondData.dailyQuestionHistory.unshift(newQuestion);
                await saveData();

                questionTextEl.textContent = newQuestion.question;
                currentQuestionInput.value = newQuestion.question;
                answerForm.style.display = 'block';

            } catch (error) {
                questionTextEl.textContent = `问题生成失败: ${error.message}`;
            }
        }
    }

    answerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        const userAnswer = answerTextarea.value.trim();
        const question = currentQuestionInput.value;
        if (!userAnswer) {
            showToast('回答不能为空哦');
            return;
        }

        isSubmitting = true;
        const character = window.SoulBondLogic.getBondCharacter();
        if (!character) {
            isSubmitting = false;
            return;
        }
        character.soulBondData = character.soulBondData || {};
        character.soulBondData.dailyQuestionHistory = character.soulBondData.dailyQuestionHistory || [];

        const todayQuestion = character.soulBondData.dailyQuestionHistory[0];
        if (todayQuestion) {
            todayQuestion.answered = true;
            todayQuestion.userAnswer = userAnswer;
        }

        const characterId = character.id;
        const fullAnswerContent = `每日一问\n问题：${question}\n我的回答：${userAnswer}`;
        const previousChatId = window.currentChatId;
        const previousChatType = window.currentChatType;
        window.currentChatId = characterId;
        window.currentChatType = 'private';
        const tempInput = document.createElement('textarea');
        tempInput.value = fullAnswerContent;
        answerForm.querySelector('button').disabled = true;
        try {
            if (typeof window.sendMessage === 'function') {
                if (typeof window.saveData === 'function') {
                    await window.saveData();
                }
                questionModal.classList.remove('visible');
                if (typeof window.switchScreen === 'function') {
                    window.switchScreen('soul-bond-screen');
                }
                showToast('回答已发送~');
                answerTextarea.value = '';
                currentQuestionInput.value = '';
                setTimeout(() => {
                    const sendPromise = window.sendMessage(tempInput);
                    if (sendPromise && typeof sendPromise.then === 'function') {
                        sendPromise.then(() => {
                            if (typeof window.getAiReply === 'function') {
                                window.getAiReply();
                            }
                        }).finally(() => {
                            if (previousChatId !== undefined) {
                                window.currentChatId = previousChatId;
                            }
                            if (previousChatType !== undefined) {
                                window.currentChatType = previousChatType;
                            }
                            isSubmitting = false;
                            answerForm.querySelector('button').disabled = false;
                        });
                    } else {
                        if (typeof window.getAiReply === 'function') {
                            window.getAiReply();
                        }
                        if (previousChatId !== undefined) {
                            window.currentChatId = previousChatId;
                        }
                        if (previousChatType !== undefined) {
                            window.currentChatType = previousChatType;
                        }
                        isSubmitting = false;
                        answerForm.querySelector('button').disabled = false;
                    }
                }, 0);
            } else {
                console.error('未找到全局发送函数 sendMessage，请检查 script.js 的暴露情况');
                showToast('发送失败：未找到发送函数');
                if (previousChatId !== undefined) {
                    window.currentChatId = previousChatId;
                }
                if (previousChatType !== undefined) {
                    window.currentChatType = previousChatType;
                }
                isSubmitting = false;
                answerForm.querySelector('button').disabled = false;
            }
        } catch (error) {
            console.error('提交每日一问失败:', error);
            showToast('提交失败，请重试');
            if (previousChatId !== undefined) {
                window.currentChatId = previousChatId;
            }
            if (previousChatType !== undefined) {
                window.currentChatType = previousChatType;
            }
            isSubmitting = false;
            answerForm.querySelector('button').disabled = false;
        }
    });

    document.querySelector('.bond-nav-btn[data-feature="dailyquestion"]').addEventListener('click', handleDailyQuestionClick);
}

function generateDailyQuestionPrompt(character) {
    return `你正在扮演角色“${character.realName}”，人设是：${character.persona}。
请根据你的人设，向你的伴侣“我”（${character.myName}）提出一个能够增进你们感情或引发深刻思考的“每日一问”。
规则:
1. 这个问题必须非常贴合你的人设和你们的关系。
2. 避免简单的是/否问题，鼓励对方分享想法和感受。
3. 你的输出必须直接是问题本身，不要包含任何额外的话。

示例:
- 如果你是一个浪漫的诗人："如果我们的记忆可以像一本书一样翻阅，你最想重温哪一页？"
- 如果你是一个务实的科学家："在我们的关系中，你认为哪个变量对整体的‘幸福指数’影响最大？"`;
}

function renderQandAHandbook() {
    const character = window.SoulBondLogic.getBondCharacter();
    const container = document.getElementById('q-and-a-list-container');
    const placeholder = document.getElementById('no-q-and-a-placeholder');

    if (!character || !character.soulBondData || !character.soulBondData.dailyQuestionHistory || character.soulBondData.dailyQuestionHistory.length === 0) {
        container.innerHTML = '';
        placeholder.style.display = 'block';
        return;
    }

    placeholder.style.display = 'none';
    container.innerHTML = '';

    character.soulBondData.dailyQuestionHistory.forEach(item => {
        if (!item.answered) return;

        const li = document.createElement('li');
        li.className = 'diary-entry';
        li.innerHTML = `
            <div class="diary-header">
                <span class="diary-date">${item.date}</span>
            </div>
            <div class="diary-content" style="background: #fff8fa; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <strong>Ta的提问:</strong><br>${item.question}
            </div>
            <div class="diary-content" style="background: #f0f4f8; padding: 10px; border-radius: 8px;">
                <strong>我的回答:</strong><br>${item.userAnswer}
            </div>
        `;
        container.appendChild(li);
    });
}

window.SoulBondDailyQuestion = { setup: setupDailyQuestionFeature, renderQandAHandbook };
