// ▼▼▼ 请复制以下完整代码，替换原文件中的 callAiApi 函数 ▼▼▼

async function callAiApi(messages, customApiSettings = null) {
    // 获取设置，支持传入自定义设置（用于商城等独立API场景）
    // 关键修改：如果没有传入 customApiSettings，默认使用 functionalApiSettings
    let settings = customApiSettings;
    if (!settings) {
        // 优先使用 functionalApiSettings，如果为空或未配置，则回退使用 apiSettings
        settings = (db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0 && 
                    db.functionalApiSettings.url && db.functionalApiSettings.key && db.functionalApiSettings.model) 
                    ? db.functionalApiSettings 
                    : db.apiSettings;
    }
    const { provider, url, key, model } = settings;

    if (!url || !key || !model) {
        throw new Error('API设置不完整，请检查设置。');
    }

    // 检查黑名单
    if (typeof URLBlacklist !== 'undefined') {
        const banApi = URLBlacklist.some((api) => url.indexOf(api) !== -1);
        if (banApi) {
            throw new Error('此API网址已加入黑名单，请勿使用');
        }
    }

    let endpoint = url;
    let headers = { 'Content-Type': 'application/json' };
    let requestBody;

    // --- 针对 Google Gemini 的特殊处理 (修复 400 报错的核心) ---
    if (provider === 'gemini') {
        // 1. 确保 endpoint 格式正确
        // 移除末尾的 /v1 或 /chat/completions 等 OpenAI 风格的后缀
        let baseUrl = url.replace(/\/v1\/chat\/completions\/?$/, '').replace(/\/v1\/?$/, '');
        // 构建 Gemini 专用 endpoint
        endpoint = `${baseUrl}/v1beta/models/${model}:generateContent?key=${getRandomValue(key)}`;
        
        // 2. 提取 System Prompt (Gemini 要求单独放)
        const systemMessage = messages.find(m => m.role === 'system');
        const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;

        // 3. 转换消息格式 (OpenAI -> Gemini)
        const contents = messages
            .filter(m => m.role !== 'system') // 过滤掉 system，因为上面已经提取了
            .map(msg => {
                // 映射角色：assistant -> model
                const role = msg.role === 'assistant' ? 'model' : 'user';
                
                let parts = [];
                
                // 处理内容 (支持纯文本和数组格式的图片)
                if (Array.isArray(msg.content)) {
                    // 如果 content 是数组 (通常包含图片)
                    msg.content.forEach(item => {
                        if (item.type === 'text') {
                            parts.push({ text: item.text });
                        } else if (item.type === 'image' && item.source && item.source.data) {
                            // 兼容 Claude 风格的图片数据
                            parts.push({ inline_data: { mime_type: item.source.media_type, data: item.source.data } });
                        } else if (item.type === 'image_url' && item.image_url && item.image_url.url) {
                            // 兼容 OpenAI 风格的图片 URL (如果是 base64)
                            const match = item.image_url.url.match(/^data:(image\/.+);base64,(.*)$/);
                            if (match) {
                                parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
                            }
                        }
                    });
                } else {
                    // 普通纯文本
                    parts.push({ text: msg.content || '' });
                }
                
                return { role, parts };
            });

        // 判断使用的温度值：如果使用的是功能模型配置，使用功能温度；否则使用聊天温度
        const isUsingFunctionalSettings = (settings === db.functionalApiSettings || 
            (settings.url === db.functionalApiSettings?.url && settings.key === db.functionalApiSettings?.key));
        const temperature = isUsingFunctionalSettings
            ? ((db.functionalApiSettings && typeof db.functionalApiSettings.functionalTemperature !== 'undefined') 
                ? db.functionalApiSettings.functionalTemperature 
                : 1.0)
            : ((db.apiSettings && typeof db.apiSettings.chatTemperature !== 'undefined') 
                ? db.apiSettings.chatTemperature 
                : 1.0);
        
        requestBody = {
            contents: contents,
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: temperature
            }
        };
        
        if (systemInstruction) {
            requestBody.system_instruction = systemInstruction;
        }

    } 
    // --- 其他服务商 (OpenAI, DeepSeek, Claude, NewAPI 等) ---
    else {
        // 确保 endpoint 指向 chat/completions
        if (!endpoint.endsWith('/chat/completions')) {
            endpoint = endpoint.replace(/\/+$/, '') + '/v1/chat/completions';
            // 修正可能的重复 v1 (例如用户填了 .../v1，结果变成了 .../v1/v1/chat...)
            endpoint = endpoint.replace(/\/v1\/v1\//, '/v1/'); 
        }

        headers['Authorization'] = `Bearer ${getRandomValue(key)}`;
        
        // 判断使用的温度值：如果使用的是功能模型配置，使用功能温度；否则使用聊天温度
        const isUsingFunctionalSettings = (settings === db.functionalApiSettings || 
            (settings.url === db.functionalApiSettings?.url && settings.key === db.functionalApiSettings?.key));
        const temperature = isUsingFunctionalSettings
            ? ((db.functionalApiSettings && typeof db.functionalApiSettings.functionalTemperature !== 'undefined') 
                ? db.functionalApiSettings.functionalTemperature 
                : 1.0)
            : ((db.apiSettings && typeof db.apiSettings.chatTemperature !== 'undefined') 
                ? db.apiSettings.chatTemperature 
                : 1.0);
        
        requestBody = {
            model,
            messages,
            stream: false, // 这里的调用通常不需要流式
            max_tokens: 8192,
            temperature: temperature
        };
    }

    // 发送请求
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        if (errorText.trim().startsWith('<')) {
            throw new Error(`API返回了一个错误页面(HTML)，而不是JSON数据。可能地址填写错误。`);
        }
        throw new Error(`AI服务请求失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // 捕捉真实 Token 消耗
    if (data.usage) {
        const totalTokens = data.usage.total_tokens || data.usage.totalTokens || 0;
        if (totalTokens > 0) {
            if (!db.tokenUsage) db.tokenUsage = {};
            db.tokenUsage.lastUsage = totalTokens;
            db.tokenUsage.lastPromptTokens = data.usage.prompt_tokens || data.usage.promptTokens || 0;
            db.tokenUsage.lastCompletionTokens = data.usage.completion_tokens || data.usage.completionTokens || 0;
            db.tokenUsage.lastTimestamp = Date.now();
            console.log(`📊 Token 使用统计: 总计 ${totalTokens} (输入: ${db.tokenUsage.lastPromptTokens}, 输出: ${db.tokenUsage.lastCompletionTokens})`);
        }
    }

    // 解析响应内容
    if (provider === 'gemini') {
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        }
    } else {
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        }
    }
    
    console.error("无法解析的API响应:", data);
    throw new Error('未能从API响应中解析出有效的文本内容。');
}
// ▲▲▲ 替换结束 ▲▲▲

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('api-settings-screen').innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-container">‹</button><div class="title-container"><h1 class="title">API 设置</h1></div><div class="placeholder"></div></header><main class="content"><form id="api-form">
<!-- 💬 聊天主模型区域 -->
<fieldset style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 25px; background-color: #fafafa;">
    <legend style="font-size: 16px; font-weight: 600; color: #333; padding: 0 10px;">💬 聊天主模型</legend>
    
    <div class="form-group">
        <label for="api-provider">API 服务商</label>
        <select id="api-provider" name="provider">
            <option value="newapi">NewAPI (自定义)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
        </select>
    </div>
    
    <div class="api-presets-embedded" style="margin-top:12px;">
        <div id="api-presets-control" style="margin:12px 0;padding:12px;border-radius:8px;border:1px solid var(--border-color, #eee);background:var(--panel-bg, #fff);box-shadow:var(--panel-shadow, none);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <label style="min-width:86px;color:var(--muted,#666);">API 预设：</label>
            <select id="api-preset-select" style="flex:1;padding:8px;border-radius:6px;border:1px solid #ddd;">
              <option value="">— 选择 API 预设 —</option>
            </select>
            <button id="api-apply-preset" class="btn btn-primary" style="margin-left:8px;padding:6px 10px;">应用</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="api-save-preset" class="btn" style="padding:6px 10px;">另存为预设</button>
            <button id="api-manage-presets" class="btn" style="padding:6px 10px;">管理</button>
            <div style="flex:1"></div>
            <button id="api-import-presets" class="btn" style="padding:6px 10px;">导入</button>
            <button id="api-export-presets" class="btn" style="padding:6px 10px;">导出</button>
          </div>
        </div>

        <div id="api-presets-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:9999;align-items:center;justify-content:center;">
          <div style="width:640px;max-width:94%;background:var(--panel-bg,#fff);padding:16px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);">
            <h3 style="margin:0 0 12px 0;">API 预设管理</h3>
            <div id="api-presets-list" style="max-height:360px;overflow:auto;border:1px solid #f0f0f0;padding:8px;border-radius:6px;"></div>
            <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
              <button id="api-close-modal" class="btn btn-primary">关闭</button>
            </div>
          </div>
        </div>
    </div>
    
    <div class="form-group">
        <label for="api-url">API 地址</label>
        <input type="url" id="api-url" name="url" placeholder="选择服务商可自动填写（后缀不用添加/v1）" required>
    </div>
    
    <div class="form-group">
        <label for="api-key">密钥 (Key)</label>
        <input type="password" id="api-key" name="key" placeholder="请输入你的API密钥" required>
    </div>
    
    <button type="button" class="btn btn-secondary" id="fetch-models-btn-main">
        <span class="btn-text">点击拉取模型</span>
        <div class="spinner"></div>
    </button>
    
    <div class="form-group">
        <label for="api-model">选择模型</label>
        <select id="api-model" name="model" required>
            <option value="">请先拉取模型列表</option>
        </select>
    </div>
    
    <!-- 聊天回复温度调节 -->
    <div class="form-group" style="margin-top: 20px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <label for="chat-temperature-slider" style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 0;">聊天回复温度 (Temperature)</label>
            <span id="chat-temperature-value" style="font-size: 16px; font-weight: 600; color: #4c9ffe; min-width: 40px; text-align: right;">1.0</span>
        </div>
        <div style="position: relative; margin: 10px 0;">
            <input type="range" id="chat-temperature-slider" min="0" max="2" step="0.1" value="1.0" style="width: 100%; height: 8px; border-radius: 4px; background: #e0e0e0; outline: none; -webkit-appearance: none; appearance: none; cursor: pointer;">
        </div>
        <p style="font-size: 11px; color: #888; margin-top: 8px; margin-bottom: 0;">
            数值越大越随机（更有创造力），数值越小越严谨（更逻辑化）
        </p>
    </div>
</fieldset>

<!-- ⚙️ 全局功能模型区域 -->
<fieldset style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 25px; background-color: #fafafa;">
    <legend style="font-size: 16px; font-weight: 600; color: #333; padding: 0 10px;">⚙️ 全局功能模型 (日记/心声/羁绊)</legend>
    
    <div class="form-group">
        <label for="func-api-provider">API 服务商</label>
        <select id="func-api-provider" name="func-provider">
            <option value="newapi">NewAPI (自定义)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
        </select>
    </div>
    
    <div class="form-group">
        <label for="func-api-url">API 地址</label>
        <input type="url" id="func-api-url" name="func-url" placeholder="选择服务商可自动填写（后缀不用添加/v1）" required>
    </div>
    
    <div class="form-group">
        <label for="func-api-key">密钥 (Key)</label>
        <input type="password" id="func-api-key" name="func-key" placeholder="请输入你的API密钥" required>
    </div>
    
    <button type="button" class="btn btn-secondary" id="fetch-models-btn-func">
        <span class="btn-text">点击拉取模型</span>
        <div class="spinner"></div>
    </button>
    
    <div class="form-group">
        <label for="func-api-model">选择模型</label>
        <select id="func-api-model" name="func-model" required>
            <option value="">请先拉取模型列表</option>
        </select>
    </div>
    
    <!-- 功能调用温度调节 -->
    <div class="form-group" style="margin-top: 20px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <label for="functional-temperature-slider" style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 0;">功能调用温度 (Temperature)</label>
            <span id="functional-temperature-value" style="font-size: 16px; font-weight: 600; color: #4c9ffe; min-width: 40px; text-align: right;">1.0</span>
        </div>
        <div style="position: relative; margin: 10px 0;">
            <input type="range" id="functional-temperature-slider" min="0" max="2" step="0.1" value="1.0" style="width: 100%; height: 8px; border-radius: 4px; background: #e0e0e0; outline: none; -webkit-appearance: none; appearance: none; cursor: pointer;">
        </div>
        <p style="font-size: 11px; color: #888; margin-top: 8px; margin-bottom: 0;">
            数值越大越随机（更有创造力），数值越小越严谨（更逻辑化）
        </p>
    </div>
</fieldset>

<!-- 新增：时间感知开关 -->
<div class="form-group" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #fce4ec; border-radius: 10px; background-color: #fff8fa;">
    <label for="time-perception-switch" style="margin-bottom: 0; color: var(--secondary-color); font-weight: 600;">时间感知加强</label>
    <input type="checkbox" id="time-perception-switch" style="width: auto; height: 20px; width: 20px;">
</div>

<div class="form-group" style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
    <label for="ai-block-duration">AI自动解封时间 (分钟)</label>
    <input type="number" id="ai-block-duration" min="0" placeholder="0 或留空表示永不自动解封">
</div>
<div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
    <label for="force-html-theater" style="margin-bottom: 0;">生成HTML小剧场</label>
    <input type="checkbox" id="force-html-theater" style="width: auto; height: 20px;">
</div>
<div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-top: 20px;">
    <label for="ai-auto-post-moment" style="margin-bottom: 0;">AI自动发布动态</label>
    <input type="checkbox" id="ai-auto-post-moment" style="width: auto; height: 20px;">
</div>
<button type="submit" class="btn btn-primary" id="save-btn"><span class="btn-text">保 存</span><div class="spinner"></div></button>
</form></main>`;
});

// ▼▼▼ 第二步：请复制这段代码，完整替换 setupApiSettingsApp 函数 ▼▼▼
function setupApiSettingsApp() {
    const form = document.getElementById('api-form');
    
    // 主聊天模型区域元素
    const mainProvider = document.getElementById('api-provider');
    const mainUrl = document.getElementById('api-url');
    const mainKey = document.getElementById('api-key');
    const mainModel = document.getElementById('api-model');
    const mainFetchBtn = document.getElementById('fetch-models-btn-main');
    
    // 全局功能模型区域元素
    const funcProvider = document.getElementById('func-api-provider');
    const funcUrl = document.getElementById('func-api-url');
    const funcKey = document.getElementById('func-api-key');
    const funcModel = document.getElementById('func-api-model');
    const funcFetchBtn = document.getElementById('fetch-models-btn-func');
    
    // 其他设置元素
    const theaterCheckbox = document.getElementById('force-html-theater');
    const autoPostMomentCheckbox = document.getElementById('ai-auto-post-moment');
    const timePerceptionCheckbox = document.getElementById('time-perception-switch');
    
    // Provider 默认 URL 映射
    const providerUrls = {
        newapi: '',
        deepseek: 'https://api.deepseek.com',
        claude: 'https://api.anthropic.com',
        gemini: 'https://generativelanguage.googleapis.com'
    };

    // ===== 1. 数据回显 =====
    // 填充主聊天模型设置
    if (db.apiSettings) {
        mainProvider.value = db.apiSettings.provider || 'newapi';
        mainUrl.value = db.apiSettings.url || '';
        mainKey.value = db.apiSettings.key || '';
        if (db.apiSettings.model) {
            mainModel.innerHTML = `<option value="${db.apiSettings.model}">${db.apiSettings.model}</option>`;
        }
    }
    
    // 填充全局功能模型设置
    if (db.functionalApiSettings && Object.keys(db.functionalApiSettings).length > 0) {
        funcProvider.value = db.functionalApiSettings.provider || 'newapi';
        funcUrl.value = db.functionalApiSettings.url || '';
        funcKey.value = db.functionalApiSettings.key || '';
        if (db.functionalApiSettings.model) {
            funcModel.innerHTML = `<option value="${db.functionalApiSettings.model}">${db.functionalApiSettings.model}</option>`;
        }
    } else {
        // 如果为空，使用默认空值填充
        funcProvider.value = 'newapi';
        funcUrl.value = '';
        funcKey.value = '';
        funcModel.innerHTML = '<option value="">请先拉取模型列表</option>';
    }
    
    // 加载其他设置
    if (theaterCheckbox) theaterCheckbox.checked = !!db.apiSettings?.forceHtmlTheater;
    if (autoPostMomentCheckbox) autoPostMomentCheckbox.checked = !!db.apiSettings?.aiAutoPostMoment;
    if (timePerceptionCheckbox) timePerceptionCheckbox.checked = !!db.apiSettings?.timePerceptionEnabled;
    
    const aiBlockDurationEl = document.getElementById('ai-block-duration');
    if (aiBlockDurationEl) aiBlockDurationEl.value = db.apiSettings?.aiBlockDuration || '';
    
    // 添加滑块自定义样式（通用样式，适用于所有温度滑块）
    const style = document.createElement('style');
    style.textContent = `
        #chat-temperature-slider::-webkit-slider-thumb,
        #functional-temperature-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #4c9ffe;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border: 2px solid #fff;
        }
        #chat-temperature-slider::-moz-range-thumb,
        #functional-temperature-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #4c9ffe;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border: 2px solid #fff;
        }
        #chat-temperature-slider::-webkit-slider-runnable-track,
        #functional-temperature-slider::-webkit-slider-runnable-track {
            height: 8px;
            border-radius: 4px;
            background: linear-gradient(to right, #4c9ffe 0%, #4c9ffe var(--slider-progress, 50%), #e0e0e0 var(--slider-progress, 50%), #e0e0e0 100%);
        }
        #chat-temperature-slider::-moz-range-track,
        #functional-temperature-slider::-moz-range-track {
            height: 8px;
            border-radius: 4px;
            background: #e0e0e0;
        }
    `;
    document.head.appendChild(style);
    
    // 加载主聊天温度设置
    const chatTemperatureSlider = document.getElementById('chat-temperature-slider');
    const chatTemperatureValue = document.getElementById('chat-temperature-value');
    if (chatTemperatureSlider && chatTemperatureValue) {
        const tempValue = (db.apiSettings && typeof db.apiSettings.chatTemperature !== 'undefined') 
            ? db.apiSettings.chatTemperature 
            : 1.0;
        chatTemperatureSlider.value = tempValue;
        chatTemperatureValue.textContent = tempValue.toFixed(1);
        
        // 更新滑块进度条颜色
        const updateChatSliderProgress = () => {
            const value = parseFloat(chatTemperatureSlider.value);
            const percentage = (value / 2) * 100;
            chatTemperatureSlider.style.setProperty('--slider-progress', percentage + '%');
        };
        updateChatSliderProgress();
        
        // 添加滑块事件监听
        chatTemperatureSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            chatTemperatureValue.textContent = value.toFixed(1);
            updateChatSliderProgress();
            // 实时保存到 db
            if (!db.apiSettings) db.apiSettings = {};
            db.apiSettings.chatTemperature = value;
        });
    }
    
    // 加载功能模型温度设置
    const functionalTemperatureSlider = document.getElementById('functional-temperature-slider');
    const functionalTemperatureValue = document.getElementById('functional-temperature-value');
    if (functionalTemperatureSlider && functionalTemperatureValue) {
        const tempValue = (db.functionalApiSettings && typeof db.functionalApiSettings.functionalTemperature !== 'undefined') 
            ? db.functionalApiSettings.functionalTemperature 
            : 1.0;
        functionalTemperatureSlider.value = tempValue;
        functionalTemperatureValue.textContent = tempValue.toFixed(1);
        
        // 更新滑块进度条颜色
        const updateFunctionalSliderProgress = () => {
            const value = parseFloat(functionalTemperatureSlider.value);
            const percentage = (value / 2) * 100;
            functionalTemperatureSlider.style.setProperty('--slider-progress', percentage + '%');
        };
        updateFunctionalSliderProgress();
        
        // 添加滑块事件监听
        functionalTemperatureSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            functionalTemperatureValue.textContent = value.toFixed(1);
            updateFunctionalSliderProgress();
            // 实时保存到 db
            if (!db.functionalApiSettings) db.functionalApiSettings = {};
            db.functionalApiSettings.functionalTemperature = value;
        });
    }
    
    // ===== 2. Provider 变化时自动填充 URL =====
    mainProvider.addEventListener('change', () => {
        mainUrl.value = providerUrls[mainProvider.value] || '';
    });
    
    funcProvider.addEventListener('change', () => {
        funcUrl.value = providerUrls[funcProvider.value] || '';
    });
    
    // ===== 3. 拉取模型功能 =====
    // 通用拉取模型函数
    const fetchModels = async (url, key, provider, modelSelect, fetchBtn) => {
        let apiUrl = url.trim();
        const apiKey = key.trim();
        if (!apiUrl || !apiKey) {
            showToast('请先填写API地址和密钥！');
            return;
        }
        if (apiUrl.endsWith('/')) {
            apiUrl = apiUrl.slice(0, -1);
        }
        
        const endpoint = provider === 'gemini' 
            ? `${apiUrl}/v1beta/models?key=${getRandomValue(apiKey)}` 
            : `${apiUrl}/v1/models`;
        
        fetchBtn.classList.add('loading');
        fetchBtn.disabled = true;
        
        try {
            const headers = provider === 'gemini' 
                ? {} 
                : { Authorization: `Bearer ${apiKey}` };
            
            const response = await fetch(endpoint, { method: 'GET', headers });
            if (!response.ok) {
                throw new Error(`网络响应错误: ${response.status}`);
            }
            
            const data = await response.json();
            let models = [];
            
            if (provider === 'gemini') {
                if (data.models) {
                    models = data.models.map(m => m.name.replace('models/', ''));
                }
            } else {
                if (data.data) {
                    models = data.data.map(m => m.id);
                }
            }
            
            modelSelect.innerHTML = '';
            if (models.length > 0) {
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    modelSelect.appendChild(option);
                });
                showToast('模型列表拉取成功！');
            } else {
                modelSelect.innerHTML = '<option value="">未找到任何模型</option>';
                showToast('未找到任何模型');
            }
        } catch (error) {
            showToast(`拉取失败: ${error.message}`);
            modelSelect.innerHTML = '<option value="">拉取失败</option>';
        } finally {
            fetchBtn.classList.remove('loading');
            fetchBtn.disabled = false;
        }
    };
    
    // 主聊天模型拉取按钮
    mainFetchBtn.addEventListener('click', async () => {
        await fetchModels(mainUrl.value, mainKey.value, mainProvider.value, mainModel, mainFetchBtn);
    });
    
    // 全局功能模型拉取按钮
    funcFetchBtn.addEventListener('click', async () => {
        await fetchModels(funcUrl.value, funcKey.value, funcProvider.value, funcModel, funcFetchBtn);
    });
    
    // ===== 4. 保存逻辑 =====
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 验证主聊天模型
        if (!mainModel.value) {
            showToast('请选择主聊天模型后保存！');
            return;
        }
        
        // 验证全局功能模型
        if (!funcModel.value) {
            showToast('请选择全局功能模型后保存！');
            return;
        }
        
        // 检查黑名单
        const banApi = URLBlacklist.some((api) => {
            return mainUrl.value.indexOf(api) !== -1 || funcUrl.value.indexOf(api) !== -1;
        });
        if (banApi) {
            alert('此API网址已加入黑名单，请勿使用');
            return;
        }
        
        // 获取温度值
        const chatTemperatureSlider = document.getElementById('chat-temperature-slider');
        const functionalTemperatureSlider = document.getElementById('functional-temperature-slider');
        const chatTemperature = chatTemperatureSlider ? parseFloat(chatTemperatureSlider.value) : 1.0;
        const functionalTemperature = functionalTemperatureSlider ? parseFloat(functionalTemperatureSlider.value) : 1.0;
        
        // 保存主聊天模型设置
        db.apiSettings = {
            provider: mainProvider.value,
            url: mainUrl.value,
            key: mainKey.value,
            model: mainModel.value,
            forceHtmlTheater: theaterCheckbox?.checked || false,
            aiAutoPostMoment: autoPostMomentCheckbox?.checked || false,
            aiBlockDuration: aiBlockDurationEl?.value || 0,
            timePerceptionEnabled: timePerceptionCheckbox?.checked || false,
            chatTemperature: chatTemperature
        };
        
        // 保存全局功能模型设置
        db.functionalApiSettings = {
            provider: funcProvider.value,
            url: funcUrl.value,
            key: funcKey.value,
            model: funcModel.value,
            functionalTemperature: functionalTemperature
        };
        
        await saveData();
        showToast('API设置已保存！');
    });
}
// ▲▲▲ 替换结束 ▲▲▲

// === /ChatGPT 插入：API 预设脚本 === 

(function(){
  if (window._apiPresetsScriptLoaded) return;
  window._apiPresetsScriptLoaded = true;

  function _getApiPresets() {
    try { return JSON.parse(localStorage.getItem('apiPresets') || '[]'); }
    catch(e){ return []; }
  }
  function _saveApiPresets(arr) {
    localStorage.setItem('apiPresets', JSON.stringify(arr || []));
  }

  function populateApiSelect() {
    const sel = document.getElementById('api-preset-select');
    if (!sel) return;
    const presets = _getApiPresets();
    sel.innerHTML = '<option value="">— 选择 API 预设 —</option>';
    presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  function saveCurrentApiAsPreset() {
    // Try to gather API settings fields: try to detect common fields like #setting-api-key, #setting-api-url, etc.
    const apiKeyEl = document.querySelector('#setting-api-key, input[name="apiKey"], input[id*="api-key"], input[id*="apikey"]');
    const apiUrlEl = document.querySelector('#setting-api-url, input[name="apiUrl"], input[id*="api-url"], input[id*="apiurl"]');
    const providerEl = document.querySelector('#setting-api-provider, select[name="provider"], select[id*="provider"]');

    const data = {
      apiKey: apiKeyEl ? apiKeyEl.value : '',
      apiUrl: apiUrlEl ? apiUrlEl.value : '',
      provider: providerEl ? providerEl.value : '',
      // capture whole form as fallback
      raw: {}
    };
    // gather inputs inside same settings container if possible
    const container = apiKeyEl ? apiKeyEl.closest('form,div') : null;
    if (container) {
      const inputs = container.querySelectorAll('input,select,textarea');
      inputs.forEach(i => { try { data.raw[i.name || i.id || i.getAttribute('data-key') || ('f_'+Math.random().toString(36).slice(2))] = i.value; } catch(e){} });
    }
    let name = prompt('为该 API 预设填写名称（会覆盖同名预设）：');
    if (!name) return;
    const presets = _getApiPresets();
    const idx = presets.findIndex(p => p.name === name);
    const preset = {name: name, data: data};
    if (idx >= 0) presets[idx] = preset; else presets.push(preset);
    _saveApiPresets(presets);
    populateApiSelect();
    (window.showToast && showToast('API 预设已保存')) || console.log('API 预设已保存');
  }

  // 修改：新增两个函数，分别应用到主模型和功能模型
  async function applyApiPresetToMain(name) {
    const presets = _getApiPresets();
    const p = presets.find(x => x.name === name);
    if (!p) return (window.showToast && showToast('未找到该预设')) || alert('未找到该预设');
    
    try {
      // 填充主聊天模型区域
      const mainProvider = document.getElementById('api-provider');
      const mainUrl = document.getElementById('api-url');
      const mainKey = document.getElementById('api-key');
      const mainModel = document.getElementById('api-model');

      if (mainProvider && p.data && typeof p.data.provider !== 'undefined') {
        mainProvider.value = p.data.provider;
        // 触发 change 事件以自动填充 URL
        mainProvider.dispatchEvent(new Event('change'));
      }
      if (mainUrl && p.data && typeof p.data.apiUrl !== 'undefined') {
        mainUrl.value = p.data.apiUrl;
      }
      if (mainKey && p.data && typeof p.data.apiKey !== 'undefined') {
        mainKey.value = p.data.apiKey;
      }
      if (mainModel && p.data) {
        // 尝试从多个位置获取 model 值
        const modelValue = (p.data.raw && (p.data.raw['api-model'] || p.data.raw['model'])) || p.data.model || '';
        if (modelValue) {
          // 检查该选项是否已存在
          const existingOption = Array.from(mainModel.options).find(opt => opt.value === modelValue);
          if (!existingOption) {
            // 如果不存在，添加新选项
            const option = document.createElement('option');
            option.value = modelValue;
            option.textContent = modelValue;
            mainModel.appendChild(option);
          }
          mainModel.value = modelValue;
          // 触发 change 事件以更新 UI
          mainModel.dispatchEvent(new Event('change'));
        }
      }

      (window.showToast && showToast('预设已应用到主聊天模型')) || console.log('预设已应用到主聊天模型');
    } catch(e) {
      console.error('applyApiPresetToMain error', e);
      (window.showToast && showToast('应用失败：' + e.message)) || alert('应用失败：' + e.message);
    }
  }

  async function applyApiPresetToFunc(name) {
    const presets = _getApiPresets();
    const p = presets.find(x => x.name === name);
    if (!p) return (window.showToast && showToast('未找到该预设')) || alert('未找到该预设');
    
    try {
      // 填充全局功能模型区域
      const funcProvider = document.getElementById('func-api-provider');
      const funcUrl = document.getElementById('func-api-url');
      const funcKey = document.getElementById('func-api-key');
      const funcModel = document.getElementById('func-api-model');

      if (funcProvider && p.data && typeof p.data.provider !== 'undefined') {
        funcProvider.value = p.data.provider;
        // 触发 change 事件以自动填充 URL
        funcProvider.dispatchEvent(new Event('change'));
      }
      if (funcUrl && p.data && typeof p.data.apiUrl !== 'undefined') {
        funcUrl.value = p.data.apiUrl;
      }
      if (funcKey && p.data && typeof p.data.apiKey !== 'undefined') {
        funcKey.value = p.data.apiKey;
      }
      if (funcModel && p.data) {
        // 尝试从多个位置获取 model 值（优先查找功能模型专用字段，然后回退到通用字段）
        const modelValue = (p.data.raw && (p.data.raw['func-api-model'] || p.data.raw['api-model'] || p.data.raw['model'])) || p.data.model || '';
        if (modelValue) {
          // 检查该选项是否已存在
          const existingOption = Array.from(funcModel.options).find(opt => opt.value === modelValue);
          if (!existingOption) {
            // 如果不存在，添加新选项
            const option = document.createElement('option');
            option.value = modelValue;
            option.textContent = modelValue;
            funcModel.appendChild(option);
          }
          funcModel.value = modelValue;
          // 触发 change 事件以更新 UI
          funcModel.dispatchEvent(new Event('change'));
        }
      }

      (window.showToast && showToast('预设已应用到全局功能模型')) || console.log('预设已应用到全局功能模型');
    } catch(e) {
      console.error('applyApiPresetToFunc error', e);
      (window.showToast && showToast('应用失败：' + e.message)) || alert('应用失败：' + e.message);
    }
  }

  // 保留原函数以兼容旧代码（如果还有地方在使用）
  async function applyApiPreset(name) {
    // 默认应用到主模型（向后兼容）
    await applyApiPresetToMain(name);
  }

  function openApiManageModal() {
    const modal = document.getElementById('api-presets-modal');
    const list = document.getElementById('api-presets-list');
    if (!modal || !list) return;
    list.innerHTML = '';
    const presets = _getApiPresets();
    if (!presets.length) {
      list.innerHTML = '<p style="color:#888;margin:6px 0;">暂无预设</p>';
    }
    presets.forEach((p, idx) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 6px';
      row.style.borderBottom = '1px solid #f6f6f6';

      const left = document.createElement('div');
      left.style.flex = '1';
      left.style.minWidth = '120px';
      left.style.marginRight = '12px';
      left.style.overflow = 'hidden';
      left.innerHTML = '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+p.name+'</div><div style="font-size:12px;color:#666;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (p.data && p.data.provider ? ('提供者：'+p.data.provider) : '') + '</div>';

      const btns = document.createElement('div');
      btns.style.display = 'grid';
      btns.style.gridTemplateColumns = 'repeat(2, auto)';
      btns.style.gap = '6px';
      btns.style.alignItems = 'center';
      btns.style.flexShrink = '0';

      // 修改：将单个"应用"按钮改为两个按钮
      const applyMainBtn = document.createElement('button');
      applyMainBtn.className = 'btn btn-primary';
      applyMainBtn.textContent = '应用为主模型';
      applyMainBtn.style.fontSize = '12px';
      applyMainBtn.style.padding = '6px 10px';
      applyMainBtn.style.width = 'auto';
      applyMainBtn.style.minWidth = 'fit-content';
      applyMainBtn.style.whiteSpace = 'nowrap';
      applyMainBtn.dataset.presetName = p.name;
      applyMainBtn.onclick = function(){ applyApiPresetToMain(p.name); };

      const applyFuncBtn = document.createElement('button');
      applyFuncBtn.className = 'btn btn-secondary';
      applyFuncBtn.textContent = '应用为功能模型';
      applyFuncBtn.style.fontSize = '12px';
      applyFuncBtn.style.padding = '6px 10px';
      applyFuncBtn.style.width = 'auto';
      applyFuncBtn.style.minWidth = 'fit-content';
      applyFuncBtn.style.whiteSpace = 'nowrap';
      applyFuncBtn.dataset.presetName = p.name;
      applyFuncBtn.onclick = function(){ applyApiPresetToFunc(p.name); };

      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn';
      renameBtn.textContent = '重命名';
      renameBtn.style.fontSize = '12px';
      renameBtn.style.padding = '6px 10px';
      renameBtn.style.width = 'auto';
      renameBtn.style.minWidth = 'fit-content';
      renameBtn.style.whiteSpace = 'nowrap';
      renameBtn.onclick = function(){
        const newName = prompt('输入新名称：', p.name);
        if (!newName) return;
        const all = _getApiPresets();
        all[idx].name = newName;
        _saveApiPresets(all);
        openApiManageModal();
        populateApiSelect();
      };

      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = '删除';
      delBtn.style.fontSize = '12px';
      delBtn.style.padding = '6px 10px';
      delBtn.style.width = 'auto';
      delBtn.style.minWidth = 'fit-content';
      delBtn.style.whiteSpace = 'nowrap';
      delBtn.onclick = function(){ if(!confirm('确定删除 "'+p.name+'" ?')) return; const all=_getApiPresets(); all.splice(idx,1); _saveApiPresets(all); openApiManageModal(); populateApiSelect(); };

      btns.appendChild(applyMainBtn);
      btns.appendChild(applyFuncBtn);
      btns.appendChild(renameBtn);
      btns.appendChild(delBtn);

      row.appendChild(left); row.appendChild(btns);
      list.appendChild(row);
    });
    modal.style.display = 'flex';
  }

  // export / import handlers
  function exportApiPresets() {
    const presets = _getApiPresets();
    const blob = new Blob([JSON.stringify(presets, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'api_presets.json'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function importApiPresets() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = function(e){
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = function(){ try { const data = JSON.parse(r.result); if (Array.isArray(data)) { _saveApiPresets(data); populateApiSelect(); openApiManageModal(); } else alert('文件格式不正确'); } catch(e){ alert('导入失败：'+e.message); } };
      r.readAsText(f);
    };
    inp.click();
  }

  // bind UI
  function bind() {
    populateApiSelect();
    const saveBtn = document.getElementById('api-save-preset');
    const manageBtn = document.getElementById('api-manage-presets');
    const applyBtn = document.getElementById('api-apply-preset');
    const select = document.getElementById('api-preset-select');
    const modalClose = document.getElementById('api-close-modal');
    const importBtn = document.getElementById('api-import-presets');
    const exportBtn = document.getElementById('api-export-presets');

    if (saveBtn) saveBtn.addEventListener('click', saveCurrentApiAsPreset);
    if (manageBtn) manageBtn.addEventListener('click', openApiManageModal);
    if (applyBtn) applyBtn.addEventListener('click', function(){ const v=select.value; if(!v) return (window.showToast&&showToast('请选择预设'))||alert('请选择预设'); applyApiPreset(v); });
    if (modalClose) modalClose.addEventListener('click', function(){ document.getElementById('api-presets-modal').style.display='none'; });
    if (importBtn) importBtn.addEventListener('click', importApiPresets);
    if (exportBtn) exportBtn.addEventListener('click', exportApiPresets);

    if (select) select.addEventListener('change', function(){ /* optional: preview selection */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else setTimeout(bind,50);

})();
