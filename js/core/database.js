let db = {
        characters: [],
        groups: [],
        callLogs: [], // [NEW] Call archives
        apiSettings: {},
    functionalApiSettings: {},
    tokenUsage: {},
    wallpaper: 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg',
    wallpaper2: 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg',
    myStickers: [],
    homeScreenMode: 'night',
    worldBooks: [],
    renderers: [],
    fontUrl: '',
    customIcons: {},
    customWidgets: [],
    playlist: [],
    musicPlayerSettings: {
        volume: 0.8,
        playbackMode: 'sequential',
    },
    music_search_history: [],
    inventory: [],
    css_beautify: '',
    globalCssPresets: [],
    soul_bond_roster: [],
    userProfile: {},
    diary_milestones: []
};
window.db = db;
window.dbLoaded = false;

class OptimizedDataStorage {
    constructor() {
        this.db = new Dexie('章鱼喷墨机DB_V2');

        this.db.version(1).stores({
            storage: 'key, value, timestamp',
            messageChunks: 'id, chatId, chatType, chunkIndex, messages, timestamp',
            metadata: 'key, value, timestamp'
        });

        this.cache = new Map();
        this.maxCacheSize = 50;
        this.chunkSize = 100;

        this.performanceMetrics = {
            cacheHits: 0,
            cacheMisses: 0,
            operationTimes: [],
            memoryUsage: 0
        };
    }

    updateCache(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        this.cache.set(key, value);

        if (this.cache.size > this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.performanceMetrics.memoryUsage = JSON.stringify([...this.cache.values()]).length;
    }

    getFromCache(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            this.performanceMetrics.cacheHits++;
            return value;
        }
        this.performanceMetrics.cacheMisses++;
        return null;
    }

    async saveData(key, data) {
        const startTime = Date.now();
        try {
            const item = {
                key: key,
                value: JSON.stringify(data),
                timestamp: Date.now()
            };

            await this.db.storage.put(item);
            this.updateCache(key, data);
            console.log(`数据已保存: ${key}`);
            return true;
        } catch (error) {
            console.error('保存数据失败:', error);
            return false;
        }
    }

    async getData(key) {
        const startTime = Date.now();
        try {
            const cached = this.getFromCache(key);
            if (cached !== null) {
                return cached;
            }

            const item = await this.db.storage.get(key);
            if (item) {
                const data = JSON.parse(item.value);
                this.updateCache(key, data);
                return data;
            } else {
                console.log(`未找到数据: ${key}`);
                return null;
            }
        } catch (error) {
            console.error('获取数据失败:', error);
            return null;
        }
    }

    async saveChatMessages(chatId, chatType, messages) {
        const startTime = Date.now();
        try {
            await this.db.messageChunks.where('chatId').equals(chatId).and(chunk => chunk.chatType === chatType).delete();

            const chunks = [];
            for (let i = 0; i < messages.length; i += this.chunkSize) {
                const chunkMessages = messages.slice(i, i + this.chunkSize);
                const chunkId = `${chatId}_${chatType}_${Math.floor(i / this.chunkSize)}`;

                chunks.push({
                    id: chunkId,
                    chatId: chatId,
                    chatType: chatType,
                    chunkIndex: Math.floor(i / this.chunkSize),
                    messages: chunkMessages,
                    timestamp: Date.now()
                });
            }

            if (chunks.length > 0) {
                await this.db.messageChunks.bulkPut(chunks);
            }

            const cacheKey = `messages_${chatId}_${chatType}`;
            this.updateCache(cacheKey, messages);

            console.log(`消息已分块保存: ${chatId} (${chunks.length}个分块)`);
            return true;
        } catch (error) {
            console.error('保存消息失败:', error);
            return false;
        }
    }

    async getChatMessages(chatId, chatType, limit = null, offset = 0) {
        const startTime = Date.now();
        try {
            const cacheKey = `messages_${chatId}_${chatType}`;

            if (!limit) {
                const cached = this.getFromCache(cacheKey);
                if (cached !== null) {
                    return cached;
                }
            }

            const chunks = await this.db.messageChunks
                .where('chatId').equals(chatId)
                .and(chunk => chunk.chatType === chatType)
                .sortBy('chunkIndex');

            if (chunks.length === 0) {
                return [];
            }

            let allMessages = [];
            chunks.forEach(chunk => {
                allMessages = allMessages.concat(chunk.messages);
            });

            if (!limit) {
                this.updateCache(cacheKey, allMessages);
            }

            if (limit) {
                const result = allMessages.slice(offset, offset + limit);
                return result;
            }

            return allMessages;
        } catch (error) {
            console.error('获取消息失败:', error);
            return [];
        }
    }

    async addMessage(chatId, chatType, message) {
        const startTime = Date.now();
        try {
            const lastChunk = await this.db.messageChunks
                .where({ chatId: chatId, chatType: chatType })
                .last();

            if (lastChunk && lastChunk.messages.length < this.chunkSize) {
                lastChunk.messages.push(message);
                await this.db.messageChunks.put(lastChunk);
            } else {
                const newChunkIndex = lastChunk ? lastChunk.chunkIndex + 1 : 0;
                const newChunkId = `${chatId}_${chatType}_${newChunkIndex}`;
                const newChunk = {
                    id: newChunkId,
                    chatId: chatId,
                    chatType: chatType,
                    chunkIndex: newChunkIndex,
                    messages: [message],
                    timestamp: Date.now()
                };
                await this.db.messageChunks.put(newChunk);
            }

            const cacheKey = `messages_${chatId}_${chatType}`;
            if (this.cache.has(cacheKey)) {
                this.cache.delete(cacheKey);
            }
            
            console.log(`消息已增量添加: ${chatId}`);
            return true;
        } catch (error) {
            console.error('增量添加消息失败:', error);
            return false;
        }
    }

    async deleteMessage(chatId, chatType, messageId) {
        const startTime = Date.now();
        try {
            const chunks = await this.db.messageChunks
                .where({ chatId: chatId, chatType: chatType })
                .toArray();

            for (const chunk of chunks) {
                const messageIndex = chunk.messages.findIndex(msg => msg.id === messageId);
                if (messageIndex !== -1) {
                    chunk.messages.splice(messageIndex, 1);
                    if (chunk.messages.length > 0) {
                        await this.db.messageChunks.put(chunk);
                    } else {
                        await this.db.messageChunks.delete(chunk.id);
                    }
                    
                    const cacheKey = `messages_${chatId}_${chatType}`;
                    if (this.cache.has(cacheKey)) {
                        this.cache.delete(cacheKey);
                    }
                    console.log(`消息已删除: ${messageId}`);
                    return true;
                }
            }
            console.warn(`删除失败: 未找到消息 ${messageId}`);
            return false;
        } catch (error) {
            console.error('删除消息失败:', error);
            return false;
        }
    }

    async updateMessage(chatId, chatType, messageId, updatedMessage) {
        const startTime = Date.now();
        try {
            const chunks = await this.db.messageChunks
                .where({ chatId: chatId, chatType: chatType })
                .toArray();

            for (const chunk of chunks) {
                const messageIndex = chunk.messages.findIndex(msg => msg.id === messageId);
                if (messageIndex !== -1) {
                    chunk.messages[messageIndex] = { ...chunk.messages[messageIndex], ...updatedMessage };
                    await this.db.messageChunks.put(chunk);
                    
                    const cacheKey = `messages_${chatId}_${chatType}`;
                    if (this.cache.has(cacheKey)) {
                        this.cache.delete(cacheKey);
                    }
                    console.log(`消息已更新: ${messageId}`);
                    return true;
                }
            }
            console.warn(`更新失败: 未找到消息 ${messageId}`);
            return false;
        } catch (error) {
            console.error('更新消息失败:', error);
            return false;
        }
    }

    async clearChatMessages(chatId, chatType) {
        const startTime = Date.now();
        try {
            await this.db.messageChunks.where('chatId').equals(chatId).and(chunk => chunk.chatType === chatType).delete();

            const cacheKey = `messages_${chatId}_${chatType}`;
            this.cache.delete(cacheKey);

            return true;
        } catch (error) {
            console.error('清空消息失败:', error);
            return false;
        }
    }

    async removeData(key) {
        const startTime = Date.now();
        try {
            await this.db.storage.delete(key);
            this.cache.delete(key);
            console.log(`数据已删除: ${key}`);

            return true;
        } catch (error) {
            console.error('删除数据失败:', error);
            return false;
        }
    }

    async clearAll() {
        const startTime = Date.now();
        try {
            await this.db.storage.clear();
            await this.db.messageChunks.clear();
            await this.db.metadata.clear();
            this.cache.clear();
            console.log('所有数据已清空');

            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    }

    async getAllKeys() {
        try {
            const storageItems = await this.db.storage.toArray();
            return storageItems.map(item => item.key);
        } catch (error) {
            console.error('获取所有键失败:', error);
            return [];
        }
    }

    async getStorageInfo() {
        const startTime = Date.now();
        try {
            const [storageItems, messageChunks] = await Promise.all([
                this.db.storage.toArray(),
                this.db.messageChunks.toArray()
            ]);

            const storageSize = storageItems.reduce((sum, item) => sum + item.value.length, 0);
            const messageSize = messageChunks.reduce((sum, chunk) => sum + JSON.stringify(chunk.messages).length, 0);
            const totalSize = storageSize + messageSize;

            const info = {
                itemCount: storageItems.length,
                chunkCount: messageChunks.length,
                totalSize: totalSize,
                storageSize: storageSize,
                messageSize: messageSize,
                cacheSize: this.cache.size,
                items: storageItems.map(item => ({
                    key: item.key,
                    size: item.value.length,
                    timestamp: new Date(item.timestamp).toLocaleString()
                }))
            };

            this.updateStorageDisplay(info);

            return info;
        } catch (error) {
            console.error('获取存储信息失败:', error);
            return null;
        }
    }

    updateStorageDisplay(info) {
        const monitor = document.getElementById('performance-monitor');
        if (!monitor) return;

        document.getElementById('storage-size').textContent = `${(info.totalSize / 1024).toFixed(1)} KB`;
        document.getElementById('chunk-count').textContent = info.chunkCount.toString();

        const sizeElement = document.getElementById('storage-size');
        const sizeKB = info.totalSize / 1024;
        if (sizeKB < 1000) sizeElement.className = 'metric-value good';
        else if (sizeKB < 5000) sizeElement.className = 'metric-value warning';
        else sizeElement.className = 'metric-value error';
    }

    async migrateFromOldStorage() {
        const startTime = Date.now();
        let oldDb = null;
        let migrationSuccess = false;

        try {
            oldDb = new Dexie('章鱼喷墨机DB');
            oldDb.version(1).stores({
                storage: 'key, value, timestamp'
            });

            const oldData = await oldDb.storage.get('章鱼喷墨机');
            if (oldData) {
                console.log('检测到旧数据库，开始迁移...');
                const data = JSON.parse(oldData.value);

                const { characters, groups, ...baseData } = data;
                await this.saveData('章鱼喷墨机', baseData);

                let migratedCharacters = 0;
                let migratedGroups = 0;

                if (characters) {
                    for (const char of characters) {
                        if (char.history && char.history.length > 0) {
                            await this.saveChatMessages(char.id, 'private', char.history);
                        }
                        const { history, ...charData } = char;
                        charData.history = [];
                        await this.saveData(`character_${char.id}`, charData);
                        migratedCharacters++;
                    }
                }

                if (groups) {
                    for (const group of groups) {
                        if (group.history && group.history.length > 0) {
                            await this.saveChatMessages(group.id, 'group', group.history);
                        }
                        const { history, ...groupData } = group;
                        groupData.history = [];
                        await this.saveData(`group_${group.id}`, groupData);
                        migratedGroups++;
                    }
                }

                migrationSuccess = true;
                console.log(`数据迁移完成: ${migratedCharacters}个角色, ${migratedGroups}个群组`);

                if (oldDb && oldDb.isOpen()) {
                    oldDb.close();
                }

                return true;
            } else {
                console.log('未发现旧数据库数据');
                if (oldDb && oldDb.isOpen()) {
                    oldDb.close();
                }
                return false;
            }

            return false;
        } catch (error) {
            console.error('数据迁移失败:', error);

            if (oldDb) {
                try {
                    if (oldDb.isOpen()) {
                        oldDb.close();
                        console.log('已关闭旧数据库连接');
                    }
                } catch (closeError) {
                    console.error('关闭旧数据库连接失败:', closeError);
                }
            }

            return false;
        } finally {
            const duration = Date.now() - startTime;
            console.log(`数据迁移操作完成，耗时: ${duration}ms, 成功: ${migrationSuccess}`);
        }
    }
}

const dataStorage = new OptimizedDataStorage();
window.dataStorage = dataStorage;

const saveData = async (data) => {
    const dbData = data ? data : db;

    const { 
        characters, 
        groups, 
        worldBooks, 
        apiSettings,
        functionalApiSettings,
        customIcons,
        wallpaper,
        wallpaper2,
        aiSpaceWallpaper,
        homeProfile,
        ...baseData
    } = dbData;

    await dataStorage.saveData('章鱼喷墨机', baseData);

    if (worldBooks) await dataStorage.saveData('worldBooks_data', worldBooks);
    if (apiSettings) await dataStorage.saveData('apiSettings_data', apiSettings);
    if (functionalApiSettings) await dataStorage.saveData('functionalApiSettings_data', functionalApiSettings);
    if (customIcons) await dataStorage.saveData('customIcons_data', customIcons);
    if (wallpaper) await dataStorage.saveData('wallpaper_data', wallpaper);
    if (wallpaper2) await dataStorage.saveData('wallpaper2_data', wallpaper2);
    if (aiSpaceWallpaper) await dataStorage.saveData('aiSpaceWallpaper_data', aiSpaceWallpaper);
    if (homeProfile) await dataStorage.saveData('homeProfile_data', homeProfile);

    if (characters) {
        for (const char of characters) {
            if (char.history && char.history.length > 0) {
                await dataStorage.saveChatMessages(char.id, 'private', char.history);
            }
            const { history, ...charData } = char;
            charData.history = [];
            await dataStorage.saveData(`character_${char.id}`, charData);
        }
    }

    if (groups) {
        for (const group of groups) {
            if (group.history && group.history.length > 0) {
                await dataStorage.saveChatMessages(group.id, 'group', group.history);
            }
            const { history, ...groupData } = group;
            groupData.history = [];
            await dataStorage.saveData(`group_${group.id}`, groupData);
        }
    }

    return Promise.resolve();
};
window.saveData = saveData;

const loadData = async () => {
    window.dbLoaded = false;
    await dataStorage.migrateFromOldStorage();

    const oldData = localStorage.getItem('gemini-chat-app-db');
    if (oldData) {
        console.log('检测到localStorage中的旧数据，开始迁移...');
        await saveData(JSON.parse(oldData));
        console.log('localStorage旧数据迁移完成并已保留');
    }

    let data = await dataStorage.getData('章鱼喷墨机');
    if (data) {
        db = { ...db, ...data };
        window.db = db;
    }

    const loadedWorldBooks = await dataStorage.getData('worldBooks_data');
    if (loadedWorldBooks && loadedWorldBooks.length > 0) {
        db.worldBooks = loadedWorldBooks;
    } else if (db.worldBooks && db.worldBooks.length > 0) {
        await dataStorage.saveData('worldBooks_data', db.worldBooks);
        console.log('已成功将旧版世界书数据迁移到新存储位置。');
    } else {
        db.worldBooks = [];
    }

    if (db.worldBooks && db.worldBooks.length > 0) {
        db.worldBooks.forEach(book => {
            if (book.categoryId === undefined) {
                book.categoryId = 'uncategorized';
            }
        });
    }

    db.apiSettings = await dataStorage.getData('apiSettings_data') || {};
    db.functionalApiSettings = await dataStorage.getData('functionalApiSettings_data') || null;
    if (!db.functionalApiSettings || Object.keys(db.functionalApiSettings).length === 0) {
        db.functionalApiSettings = JSON.parse(JSON.stringify(db.apiSettings || {}));
    }
    db.customIcons = await dataStorage.getData('customIcons_data') || {};
    db.wallpaper = await dataStorage.getData('wallpaper_data') || 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg';
    db.wallpaper2 = await dataStorage.getData('wallpaper2_data') || 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg';
    db.aiSpaceWallpaper = await dataStorage.getData('aiSpaceWallpaper_data') || '';
    db.homeProfile = await dataStorage.getData('homeProfile_data') || { name: '点击设置昵称', signature: '点击设置个性签名', avatar: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg', heroBg: 'https://i.postimg.cc/wM57022X/image.png' };

    if (!db.avatarFrames) {
        db.avatarFrames = [];
    }
    if (!db.globalCssPresets) {
        db.globalCssPresets = [];
    }
    db.characters.forEach(c => {
        if (c.avatarFrameUrl === undefined) c.avatarFrameUrl = null;
        if (c.myAvatarFrameUrl === undefined) c.myAvatarFrameUrl = null;
    });
    db.groups.forEach(g => {
        if (g.me.avatarFrameUrl === undefined) g.me.avatarFrameUrl = null;
        g.members.forEach(m => {
            if (m.avatarFrameUrl === undefined) m.avatarFrameUrl = null;
        });
    });
    if (db.uncategorizedCollapsed === undefined) {
        db.uncategorizedCollapsed = false;
    }
    if (!db.apiSettings) db.apiSettings = {};
    if (db.apiSettings.chatTemperature === undefined) {
        db.apiSettings.chatTemperature = 1.0;
    }
    if (!db.functionalApiSettings || Object.keys(db.functionalApiSettings).length === 0) {
        db.functionalApiSettings = JSON.parse(JSON.stringify(db.apiSettings || {}));
    }
    if (db.functionalApiSettings.functionalTemperature === undefined) {
        db.functionalApiSettings.functionalTemperature = 1.0;
    }
    if (!db.wallet) {
        db.wallet = {
            balance: 0.00,
            passwordEnabled: false,
            password: null,
            transactions: []
        };
    }
    if (!db.wallpaper) db.wallpaper = 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg';
    if (!db.wallpaper2) db.wallpaper2 = 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg';
    if (!db.myStickers) db.myStickers = [];
    if (!db.aiSpaceWallpaper) db.aiSpaceWallpaper = '';
    if (!db.homeScreenMode) db.homeScreenMode = 'night';
    if (!db.worldBooks) db.worldBooks = [];
    if (!db.fontUrl) db.fontUrl = '';
    if (!db.customIcons) db.customIcons = {};
    if (!db.homeProfile) {
        db.homeProfile = {
            name: '点击设置昵称',
            signature: '点击设置个性签名',
            avatar: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg',
            heroBg: 'https://i.postimg.cc/wM57022X/image.png'
        };
    }

    if (!db.worldBooks) db.worldBooks = [];

    db.characters = [];
    db.groups = [];

    const allKeys = await dataStorage.getAllKeys();
    const characterKeys = allKeys.filter(key => key.startsWith('character_'));
    const groupKeys = allKeys.filter(key => key.startsWith('group_'));

    console.log(`发现 ${characterKeys.length} 个角色数据, ${groupKeys.length} 个群组数据`);

    const characterPromises = characterKeys.map(async (key) => {
        const charId = key.replace('character_', '');
        const charData = await dataStorage.getData(key);
        if (charData) {
            charData.history = await dataStorage.getChatMessages(charId, 'private');

            if (charData.isPinned === undefined) charData.isPinned = false;
            if (charData.status === undefined) charData.status = '在线';
            if (!charData.worldBookIds) charData.worldBookIds = [];
            if (charData.customBubbleCss === undefined) charData.customBubbleCss = '';
            if (charData.useCustomBubbleCss === undefined) charData.useCustomBubbleCss = false;
            return charData;
        }
        return null;
    });

    const groupPromises = groupKeys.map(async (key) => {
        const groupId = key.replace('group_', '');
        const groupData = await dataStorage.getData(key);
        if (groupData) {
            groupData.history = await dataStorage.getChatMessages(groupId, 'group');

            if (groupData.isPinned === undefined) groupData.isPinned = false;
            if (!groupData.worldBookIds) groupData.worldBookIds = [];
            if (groupData.customBubbleCss === undefined) groupData.customBubbleCss = '';
            if (groupData.useCustomBubbleCss === undefined) groupData.useCustomBubbleCss = false;

            return groupData;
        }
        return null;
    });

    const [loadedCharacters, loadedGroups] = await Promise.all([
        Promise.all(characterPromises),
        Promise.all(groupPromises)
    ]);

    db.characters = loadedCharacters.filter(char => char !== null);
    db.groups = loadedGroups.filter(group => group !== null);

    const localStorageMappings = [
        { key: 'worldBooks_data', target: 'worldBooks' },
        { key: 'myStickers', target: 'myStickers' },
        { key: 'renderers', target: 'renderers' },
        { key: 'playlist', target: 'playlist' },
        { key: 'music_search_history', target: 'music_search_history' },
        { key: 'mall_data', target: 'mallData' },
        { key: 'wallet_data', target: 'wallet' },
        { key: 'inventory', target: 'inventory' },
        { key: 'wallpaper', target: 'wallpaper' },
        { key: 'wallpaper2', target: 'wallpaper2' },
        { key: 'customIcons', target: 'customIcons' },
        { key: 'customWidgets', target: 'customWidgets' },
        { key: 'fontUrl', target: 'fontUrl' },
        { key: 'css_beautify', target: 'css_beautify' },
        { key: 'soul_bond_roster', target: 'soul_bond_roster' },
        { key: 'userProfile', target: 'userProfile' },
        { key: 'diary_milestones', target: 'diary_milestones' },
        { key: 'characters', target: 'characters' },
        { key: 'characters_data', target: 'characters' },
        { key: 'groups', target: 'groups' },
        { key: 'groups_data', target: 'groups' },
        { key: 'apiSettings', target: 'apiSettings' },
        { key: 'apiSettings_data', target: 'apiSettings' },
        { key: 'functionalApiSettings', target: 'functionalApiSettings' },
        { key: 'functionalApiSettings_data', target: 'functionalApiSettings' },
        { key: 'aiSpaceWallpaper', target: 'aiSpaceWallpaper' },
        { key: 'aiSpaceWallpaper_data', target: 'aiSpaceWallpaper' },
        { key: 'homeScreenMode', target: 'homeScreenMode' },
        { key: 'homeProfile', target: 'homeProfile' },
        { key: 'homeProfile_data', target: 'homeProfile' },
        { key: 'tokenUsage', target: 'tokenUsage' }
    ];

    let mergedKeyCount = 0;
    localStorageMappings.forEach(mapping => {
        const raw = localStorage.getItem(mapping.key);
        if (raw === null) return;
        let value = raw;
        try {
            value = JSON.parse(raw);
        } catch (e) {}
        if (typeof value === 'undefined') return;
        db[mapping.target] = value;
        mergedKeyCount++;
    });

    console.log(`独立键名合并完成，共合并 ${mergedKeyCount} 项`);
    console.log(`成功加载 ${db.characters.length} 个角色, ${db.groups.length} 个群组`);
    console.log('完整数据库对象:', db);

    window.dbLoaded = true;
    return Promise.resolve();
};
window.loadData = loadData;
