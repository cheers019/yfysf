        // --- Utility and Core Functions ---
        if (!window.loadData) {
        // --- 优化的数据存储系统 ---
        class OptimizedDataStorage {
            constructor() {
                // 创建数据库
                this.db = new Dexie('章鱼喷墨机DB_V2');

                // 定义数据库结构
                this.db.version(1).stores({
                    // 基础数据存储
                    storage: 'key, value, timestamp',
                    // 消息分块存储
                    messageChunks: 'id, chatId, chatType, chunkIndex, messages, timestamp',
                    // 元数据存储
                    metadata: 'key, value, timestamp'
                });

                // LRU缓存配置
                this.cache = new Map();
                this.maxCacheSize = 50; // 最大缓存50个数据块
                this.chunkSize = 100; // 每个数据块100条消息

                // 性能监控
                this.performanceMetrics = {
                    cacheHits: 0,
                    cacheMisses: 0,
                    operationTimes: [],
                    memoryUsage: 0
                };
            }



            // LRU缓存管理
            updateCache(key, value) {
                if (this.cache.has(key)) {
                    this.cache.delete(key);
                }
                this.cache.set(key, value);

                if (this.cache.size > this.maxCacheSize) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }

                // 更新内存使用量估算
                this.performanceMetrics.memoryUsage = JSON.stringify([...this.cache.values()]).length;
            }

            // 从缓存获取数据
            getFromCache(key) {
                if (this.cache.has(key)) {
                    const value = this.cache.get(key);
                    // 移到最后（最近使用）
                    this.cache.delete(key);
                    this.cache.set(key, value);
                    this.performanceMetrics.cacheHits++;
                    return value;
                }
                this.performanceMetrics.cacheMisses++;
                return null;
            }

            // 保存基础数据（非消息数据）
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

            // 获取基础数据
            async getData(key) {
                const startTime = Date.now();
                try {
                    // 先检查缓存
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

            // 保存聊天消息（分块存储）
            async saveChatMessages(chatId, chatType, messages) {
                const startTime = Date.now();
                try {
                    // 清除该聊天的所有现有分块
                    await this.db.messageChunks.where('chatId').equals(chatId).and(chunk => chunk.chatType === chatType).delete();

                    // 将消息分块存储
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

                    // 更新缓存
                    const cacheKey = `messages_${chatId}_${chatType}`;
                    this.updateCache(cacheKey, messages);

                    console.log(`消息已分块保存: ${chatId} (${chunks.length}个分块)`);
                    return true;
                } catch (error) {
                    console.error('保存消息失败:', error);
                    return false;
                }
            }

            // 获取聊天消息（按需加载）
            async getChatMessages(chatId, chatType, limit = null, offset = 0) {
                const startTime = Date.now();
                try {
                    const cacheKey = `messages_${chatId}_${chatType}`;

                    // 如果没有限制，先检查缓存
                    if (!limit) {
                        const cached = this.getFromCache(cacheKey);
                        if (cached !== null) {
                            return cached;
                        }
                    }

                    // 从数据库获取分块
                    const chunks = await this.db.messageChunks
                        .where('chatId').equals(chatId)
                        .and(chunk => chunk.chatType === chatType)
                        .sortBy('chunkIndex');

                    if (chunks.length === 0) {
                        return [];
                    }

                    // 合并所有消息
                    let allMessages = [];
                    chunks.forEach(chunk => {
                        allMessages = allMessages.concat(chunk.messages);
                    });

                    // 如果没有限制，更新缓存
                    if (!limit) {
                        this.updateCache(cacheKey, allMessages);
                    }

                    // 应用分页
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

            // 添加单条消息（增量更新）
            async addMessage(chatId, chatType, message) {
                const startTime = Date.now();
                try {
                    // Find the last chunk for this chat
                    const lastChunk = await this.db.messageChunks
                        .where({ chatId: chatId, chatType: chatType })
                        .last();

                    if (lastChunk && lastChunk.messages.length < this.chunkSize) {
                        // Last chunk has space, update it
                        lastChunk.messages.push(message);
                        await this.db.messageChunks.put(lastChunk);
                    } else {
                        // No last chunk or it's full, create a new one
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

                    // Invalidate the full history cache for this chat
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

            // 删除消息
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
                                // Delete the chunk if it's empty
                                await this.db.messageChunks.delete(chunk.id);
                            }
                            
                            // Invalidate cache
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

            // 更新消息
            async updateMessage(chatId, chatType, messageId, updatedMessage) {
                const startTime = Date.now();
                try {
                    const chunks = await this.db.messageChunks
                        .where({ chatId: chatId, chatType: chatType })
                        .toArray();

                    for (const chunk of chunks) {
                        const messageIndex = chunk.messages.findIndex(msg => msg.id === messageId);
                        if (messageIndex !== -1) {
                            // Merge updates into the existing message object
                            chunk.messages[messageIndex] = { ...chunk.messages[messageIndex], ...updatedMessage };
                            await this.db.messageChunks.put(chunk);
                            
                            // Invalidate cache
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

            // 清空聊天记录
            async clearChatMessages(chatId, chatType) {
                const startTime = Date.now();
                try {
                    await this.db.messageChunks.where('chatId').equals(chatId).and(chunk => chunk.chatType === chatType).delete();

                    // 清除缓存
                    const cacheKey = `messages_${chatId}_${chatType}`;
                    this.cache.delete(cacheKey);


                    return true;
                } catch (error) {
                    console.error('清空消息失败:', error);

                    return false;
                }
            }

            // 删除数据
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

            // 清空所有数据
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

            // 获取所有存储的键
            async getAllKeys() {
                try {
                    const storageItems = await this.db.storage.toArray();
                    return storageItems.map(item => item.key);
                } catch (error) {
                    console.error('获取所有键失败:', error);
                    return [];
                }
            }

            // 获取存储信息
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

                    // 更新显示
                    this.updateStorageDisplay(info);

                    return info;
                } catch (error) {
                    console.error('获取存储信息失败:', error);

                    return null;
                }
            }

            // 更新存储信息显示
            updateStorageDisplay(info) {
                const monitor = document.getElementById('performance-monitor');
                if (!monitor) return;

                document.getElementById('storage-size').textContent = `${(info.totalSize / 1024).toFixed(1)} KB`;
                document.getElementById('chunk-count').textContent = info.chunkCount.toString();

                // 设置存储大小颜色指示器
                const sizeElement = document.getElementById('storage-size');
                const sizeKB = info.totalSize / 1024;
                if (sizeKB < 1000) sizeElement.className = 'metric-value good';
                else if (sizeKB < 5000) sizeElement.className = 'metric-value warning';
                else sizeElement.className = 'metric-value error';
            }

            // 数据迁移方法（从旧版本迁移）
            async migrateFromOldStorage() {
                const startTime = Date.now();
                let oldDb = null;
                let migrationSuccess = false;

                try {
                    // 尝试从旧数据库获取数据
                    oldDb = new Dexie('章鱼喷墨机DB');
                    oldDb.version(1).stores({
                        storage: 'key, value, timestamp'
                    });

                    // 检查旧数据库是否存在数据
                    const oldData = await oldDb.storage.get('章鱼喷墨机');
                    if (oldData) {
                        console.log('检测到旧数据库，开始迁移...');
                        const data = JSON.parse(oldData.value);

                        // 迁移基础数据
                        const { characters, groups, ...baseData } = data;
                        await this.saveData('章鱼喷墨机', baseData);

                        let migratedCharacters = 0;
                        let migratedGroups = 0;

                        // 迁移角色消息
                        if (characters) {
                            for (const char of characters) {
                                if (char.history && char.history.length > 0) {
                                    await this.saveChatMessages(char.id, 'private', char.history);
                                }
                                // 保存角色信息（不包含history）
                                const { history, ...charData } = char;
                                charData.history = []; // 保持兼容性
                                await this.saveData(`character_${char.id}`, charData);
                                migratedCharacters++;
                            }
                        }

                        // 迁移群组消息
                        if (groups) {
                            for (const group of groups) {
                                if (group.history && group.history.length > 0) {
                                    await this.saveChatMessages(group.id, 'group', group.history);
                                }
                                // 保存群组信息（不包含history）
                                const { history, ...groupData } = group;
                                groupData.history = []; // 保持兼容性
                                await this.saveData(`group_${group.id}`, groupData);
                                migratedGroups++;
                            }
                        }

                        migrationSuccess = true;
                        console.log(`数据迁移完成: ${migratedCharacters}个角色, ${migratedGroups}个群组`);

                        // 迁移成功后立即删除旧数据库
                        try {
                            console.log('开始删除旧数据库...');

                            // 关闭数据库连接
                            if (oldDb.isOpen()) {
                                oldDb.close();
                            }

                            // 删除整个数据库
                            await oldDb.delete();
                            console.log('旧数据库删除成功');

                            // 验证删除是否成功
                            const deletedDb = new Dexie('章鱼喷墨机DB');
                            try {
                                deletedDb.version(1).stores({
                                    storage: 'key, value, timestamp'
                                });
                                const testData = await deletedDb.storage.get('章鱼喷墨机');
                                if (!testData) {
                                    console.log('旧数据库删除验证成功');
                                } else {
                                    console.warn('旧数据库可能未完全删除');
                                }
                                deletedDb.close();
                            } catch (verifyError) {
                                // 如果无法访问，说明删除成功
                                console.log('旧数据库删除验证成功（数据库不存在）');
                            }

                        } catch (deleteError) {
                            console.error('删除旧数据库失败，但不影响主要功能:', deleteError);
                            // 尝试清空数据而不是删除数据库
                            try {
                                if (!oldDb.isOpen()) {
                                    await oldDb.open();
                                }
                                await oldDb.storage.clear();
                                console.log('已清空旧数据库内容');
                                oldDb.close();
                            } catch (clearError) {
                                console.error('清空旧数据库也失败:', clearError);
                            }
                        }

                        return true;
                    } else {
                        console.log('未发现旧数据库数据');
                        // 即使没有数据，也尝试删除可能存在的空数据库
                        try {
                            if (oldDb.isOpen()) {
                                oldDb.close();
                            }
                            await oldDb.delete();
                            console.log('已删除空的旧数据库');
                        } catch (deleteError) {
                            // 删除失败可能是因为数据库不存在，这是正常的
                            console.log('旧数据库不存在或已删除');
                        }
                        return false;
                    }


                    return false;
                } catch (error) {
                    console.error('数据迁移失败:', error);

                    // 即使迁移失败，也尝试清理旧数据库连接
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
                    // 确保在任何情况下都记录迁移耗时
                    const duration = Date.now() - startTime;
                    console.log(`数据迁移操作完成，耗时: ${duration}ms, 成功: ${migrationSuccess}`);
                }
            }
        }

        const dataStorage = new OptimizedDataStorage();

        // 兼容性适配器 - 保持原有API接口
        const saveData = async (data) => {
            const dbData = data ? data : db;

            // 修改：分离出所有需要独立保存的重要数据
            const { 
                characters, 
                groups, 
                worldBooks, 
                apiSettings,
                functionalApiSettings, // 新增：全局功能模型配置
                customIcons,
                wallpaper,
                wallpaper2,
                aiSpaceWallpaper,
                homeProfile,
                // ... 你未来可能增加的其他顶层复杂数据
                ...baseData // 剩余的简单数据
            } = dbData;

            // 保存剩余的基础数据
            await dataStorage.saveData('章鱼喷墨机', baseData);

            // 新增：为每一项重要数据创建独立的保存通道
            if (worldBooks) await dataStorage.saveData('worldBooks_data', worldBooks);
            if (apiSettings) await dataStorage.saveData('apiSettings_data', apiSettings);
            if (functionalApiSettings) await dataStorage.saveData('functionalApiSettings_data', functionalApiSettings); // 新增：保存全局功能模型配置
            if (customIcons) await dataStorage.saveData('customIcons_data', customIcons);
            if (wallpaper) await dataStorage.saveData('wallpaper_data', wallpaper);
            if (wallpaper2) await dataStorage.saveData('wallpaper2_data', wallpaper2);
            if (aiSpaceWallpaper) await dataStorage.saveData('aiSpaceWallpaper_data', aiSpaceWallpaper);
            if (homeProfile) await dataStorage.saveData('homeProfile_data', homeProfile);


            // 分别保存角色和群组数据（包含消息）
            if (characters) {
                for (const char of characters) {
                    // 保存消息到分块存储
                    if (char.history && char.history.length > 0) {
                        await dataStorage.saveChatMessages(char.id, 'private', char.history);
                    }
                    // 保存角色基础信息（不包含history）
                    const { history, ...charData } = char;
                    charData.history = []; // 保持兼容性
                    await dataStorage.saveData(`character_${char.id}`, charData);
                }
            }

            if (groups) {
                for (const group of groups) {
                    // 保存消息到分块存储
                    if (group.history && group.history.length > 0) {
                        await dataStorage.saveChatMessages(group.id, 'group', group.history);
                    }
                    // 保存群组基础信息（不包含history）
                    const { history, ...groupData } = group;
                    groupData.history = []; // 保持兼容性
                    await dataStorage.saveData(`group_${group.id}`, groupData);
                }
            }

            return Promise.resolve();
        };
        // 将 saveData 暴露到全局作用域
        window.saveData = saveData;


   // ▼▼▼ 请从这里开始，一直复制到最下面的"复制结束"注释 ▼▼▼
        const loadData = async () => {
            // 首先尝试数据迁移
            await dataStorage.migrateFromOldStorage();

            // 检查localStorage中的旧数据
            const oldData = localStorage.getItem('gemini-chat-app-db');
            if (oldData) {
                console.log('检测到localStorage中的旧数据，开始迁移...');
                await saveData(JSON.parse(oldData));
                console.log('localStorage旧数据迁移完成并已保留');
            }

            // 额外的安全检查：确保旧数据库完全清理
            try {
                const safetyCheckDb = new Dexie('章鱼喷墨机DB');
                safetyCheckDb.version(1).stores({
                    storage: 'key, value, timestamp'
                });

                const residualData = await safetyCheckDb.storage.get('章鱼喷墨机');
                if (residualData) {
                    console.warn('发现残留的旧数据库数据，执行强制清理...');
                    await safetyCheckDb.storage.clear();
                    safetyCheckDb.close();
                    await safetyCheckDb.delete();
                    console.log('残留旧数据库已强制清理');
                } else {
                    safetyCheckDb.close();
                }
            } catch (safetyError) {
                // 如果无法访问旧数据库，说明已经被正确删除
                console.log('旧数据库安全检查完成（数据库不存在）');
            }

            // 加载基础数据
            let data = await dataStorage.getData('章鱼喷墨机');
            if (data) {
                db = { ...db, ...data };
            }
    // --- 新增：从独立通道加载所有重要数据 ---

            // --- 兼容旧版世界书数据的迁移逻辑 ---
            const loadedWorldBooks = await dataStorage.getData('worldBooks_data');
            if (loadedWorldBooks && loadedWorldBooks.length > 0) {
                // 如果新的专用位置有数据，就优先使用它
                db.worldBooks = loadedWorldBooks;
            } else if (db.worldBooks && db.worldBooks.length > 0) {
                // 如果专用位置没数据，但我们从旧的大包里读出了世界书数据
                // 就把它保存到新的专用位置，完成数据“搬家”
                await dataStorage.saveData('worldBooks_data', db.worldBooks);
                console.log('已成功将旧版世界书数据迁移到新存储位置。');
            } else {
                // 如果两边都没有，那才是真的没有世界书
                db.worldBooks = [];
            }
            // --- 迁移逻辑结束 ---
  // ▼▼▼ 在这里添加新的代码 ▼▼▼
            // --- 新增：为旧版世界书数据添加分类兼容 ---
            if (db.worldBooks && db.worldBooks.length > 0) {
                db.worldBooks.forEach(book => {
                    if (book.categoryId === undefined) {
                        book.categoryId = 'uncategorized';
                    }
                });
            }
            // --- 兼容代码结束 ---
            // ▲▲▲ 添加结束 ▲▲▲
            db.apiSettings = await dataStorage.getData('apiSettings_data') || {};
            // 新增：加载全局功能模型配置
            db.functionalApiSettings = await dataStorage.getData('functionalApiSettings_data') || null;
            // 如果没有存过，则默认让它等于 apiSettings（深拷贝，避免空值报错）
            if (!db.functionalApiSettings || Object.keys(db.functionalApiSettings).length === 0) {
                db.functionalApiSettings = JSON.parse(JSON.stringify(db.apiSettings || {}));
            }
            db.customIcons = await dataStorage.getData('customIcons_data') || {};
            db.wallpaper = await dataStorage.getData('wallpaper_data') || 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg';
            db.wallpaper2 = await dataStorage.getData('wallpaper2_data') || 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg';
            db.aiSpaceWallpaper = await dataStorage.getData('aiSpaceWallpaper_data') || '';
            db.homeProfile = await dataStorage.getData('homeProfile_data') || { name: '点击设置昵称', signature: '点击设置个性签名', avatar: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg', heroBg: 'https://i.postimg.cc/wM57022X/image.png' };
            // --- 新增结束 ---

            // (在 loadData 函数内部，靠近其他 if (!db.xxx) 的地方添加)
if (!db.avatarFrames) {
    db.avatarFrames = []; // 初始化全局头像框列表
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
    db.uncategorizedCollapsed = false; // 默认不折叠
}// 初始化默认值
            if (!db.apiSettings) db.apiSettings = {};
            // 新增：初始化主聊天温度设置，默认值 1.0
            if (db.apiSettings.chatTemperature === undefined) {
                db.apiSettings.chatTemperature = 1.0;
            }
            // 新增：确保 functionalApiSettings 有默认值
            if (!db.functionalApiSettings || Object.keys(db.functionalApiSettings).length === 0) {
                db.functionalApiSettings = JSON.parse(JSON.stringify(db.apiSettings || {}));
            }
            // 新增：初始化功能模型温度设置，默认值 1.0
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
            if (!db.wallpaper2) db.wallpaper2 = 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg'; // 新增
            if (!db.myStickers) db.myStickers = [];
          if (!db.aiSpaceWallpaper) db.aiSpaceWallpaper = ''; // 为AI手机壁纸初始化默认值
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

            
            if (!db.worldBooks) db.worldBooks = []; // 兼容性检查
            // --- 结束 ---

            // 重建characters和groups列表
            // 由于saveData时这两个字段被排除，需要从存储中重新构建
            db.characters = [];
            db.groups = [];

            // 获取所有存储的键，找出角色和群组数据
            const allKeys = await dataStorage.getAllKeys();
            const characterKeys = allKeys.filter(key => key.startsWith('character_'));
            const groupKeys = allKeys.filter(key => key.startsWith('group_'));

            console.log(`发现 ${characterKeys.length} 个角色数据, ${groupKeys.length} 个群组数据`);

            // 加载角色数据
            const characterPromises = characterKeys.map(async (key) => {
                const charId = key.replace('character_', '');
                const charData = await dataStorage.getData(key);
                if (charData) {
                    // 按需加载消息历史
                    charData.history = await dataStorage.getChatMessages(charId, 'private');

                    // 设置默认值
                    if (charData.isPinned === undefined) charData.isPinned = false;
                    if (charData.status === undefined) charData.status = '在线';
                    if (!charData.worldBookIds) charData.worldBookIds = [];
                    if (charData.customBubbleCss === undefined) charData.customBubbleCss = '';
                    if (charData.useCustomBubbleCss === undefined) charData.useCustomBubbleCss = false;
// 为旧数据兼容用户日记
                    return charData;
                }
                return null;
            });

            // 加载群组数据
            const groupPromises = groupKeys.map(async (key) => {
                const groupId = key.replace('group_', '');
                const groupData = await dataStorage.getData(key);
                if (groupData) {
                    // 按需加载消息历史
                    groupData.history = await dataStorage.getChatMessages(groupId, 'group');

                    // 设置默认值
                    if (groupData.isPinned === undefined) groupData.isPinned = false;
                    if (!groupData.worldBookIds) groupData.worldBookIds = [];
                    if (groupData.customBubbleCss === undefined) groupData.customBubbleCss = '';
                    if (groupData.useCustomBubbleCss === undefined) groupData.useCustomBubbleCss = false;

                    return groupData;
                }
                return null;
            });

            // 等待所有数据加载完成
            const [loadedCharacters, loadedGroups] = await Promise.all([
                Promise.all(characterPromises),
                Promise.all(groupPromises)
            ]);

            // 过滤掉null值并赋值给db
            db.characters = loadedCharacters.filter(char => char !== null);
            db.groups = loadedGroups.filter(group => group !== null);

            console.log(`成功加载 ${db.characters.length} 个角色, ${db.groups.length} 个群组`);
            console.log('完整数据库对象:', db);

         
            return Promise.resolve();
        };
        // 将 loadData 暴露到全局作用域
        window.loadData = loadData;
        }
// ▲▲▲ 复制结束 ▲▲▲
