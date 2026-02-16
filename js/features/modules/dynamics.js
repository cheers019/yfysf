(function() {
    // 1) 初始化 Dexie（使用页面已引入的 Dexie）
    let db;
    try {
      db = new Dexie('AppDB_Moments');
      db.version(1).stores({
        moments: 'id,timestamp,commentedBy' // comments 和 likes 存在于对象内
      });
      // expose to window so external scripts can access the Dexie instance
      try{ window.AppDB_Moments = db; }catch(e){}

    } catch (e) {
      console.error('Dexie init failed', e);
      showToast('本地数据库初始化失败，动态功能受限');
      return;
    }
})();

const renderMoments = (function() {
    function getAuthorProfile(authorId) {
        // 默认备用信息
        let profile = { name: '未知用户', avatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg' };

        // 1. 检查是不是用户自己
        let myProfile = {};
        try {
            if (typeof loadProfileFromStorage === 'function') {
                myProfile = loadProfileFromStorage();
            } else {
                 myProfile = {
                    id: localStorage.getItem('myTopId') || 'user',
                    name: localStorage.getItem('myTopName') || '我',
                    avatar: localStorage.getItem('myTopAvatar')
                };
            }
        } catch (e) {}

        if (authorId === (myProfile.id || 'user')) {
            return { name: myProfile.name || '我', avatar: myProfile.avatar };
        }

        // 2. 在所有AI角色中查找
        if (window.db && Array.isArray(window.db.characters)) {
            const character = window.db.characters.find(c => c.id === authorId);
            if (character) {
                return { name: character.remarkName, avatar: character.avatar };
            }
        }

        // 3. 在所有群聊的成员中查找
        if (window.db && Array.isArray(window.db.groups)) {
            for (const group of window.db.groups) {
                if (Array.isArray(group.members)) {
                    const member = group.members.find(m => m.id === authorId);
                    if (member) {
                        return { name: member.groupNickname, avatar: member.avatar };
                    }
                }
            }
        }
        return profile;
    }
    // ▲▲▲▲▲▲ 工具函数补全结束 ▲▲▲▲▲▲

    // 5) 渲染动态列表 (包含工具函数的完整版)
    async function renderMoments() {
        let list = [];
        try {
            // 优先读取最新的数据库
            if (window.AppDB_Moments && window.AppDB_Moments.moments) {
                list = await window.AppDB_Moments.moments.orderBy('timestamp').reverse().toArray();
            } else if (window.db && window.db.moments) {
                list = window.db.moments.sort((a,b) => b.timestamp - a.timestamp);
            }
        } catch(e) { console.warn('Load moments failed', e); }

        const momentsContainer = document.getElementById('moments-container');
        const momentsEmpty = document.getElementById('moments-empty');

        if (!momentsContainer) return;

        momentsContainer.innerHTML = '';

        if (!list.length) {
            if (momentsEmpty) momentsEmpty.style.display = 'block';
            else {
                const p = document.createElement('p');
                p.className = 'placeholder-text';
                p.textContent = '还没有动态，点击右上角发布吧~';
                momentsContainer.appendChild(p);
            }
            return;
        } else {
            if (momentsEmpty) momentsEmpty.style.display = 'none';
        }

        const myProfile = loadProfileFromStorage();
        const myId = myProfile.id || 'user';

        list.forEach(m => {
            const div = document.createElement('div');
            div.className = 'moment-item';
            div.dataset.id = m.id || (m.id = ('m_' + Date.now() + Math.random()));

            // --- 1. 头部信息 ---
            const head = document.createElement('div');
            head.className = 'moment-head';
            const avatar = document.createElement('img');
            avatar.className = 'moment-avatar';
            
            const authorInfo = getAuthorProfile(m.authorId);
            avatar.src = authorInfo.avatar || m.authorAvatar || 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
            
            const meta = document.createElement('div');
            meta.className = 'moment-meta';
            const name = document.createElement('div');
            name.style.fontWeight = '700';
            name.textContent = authorInfo.name || m.author || '未知用户';
            
            const time = document.createElement('div');
            time.style.fontSize = '12px';
            time.style.color = '#999';
            try { time.textContent = new Date(m.timestamp).toLocaleString(); } catch (e) { time.textContent = ''; }
            
            meta.appendChild(name);
            meta.appendChild(time);
            head.appendChild(avatar);
            head.appendChild(meta);
            div.appendChild(head);

            // --- 2. 正文内容 ---
            const txt = document.createElement('div');
            txt.className = 'moment-text';
            txt.textContent = m.text || '';
            div.appendChild(txt);

            // --- 3. 图片内容 ---
            if (m.imageData && m.imageData.length > 10) {
                const im = document.createElement('img');
                im.className = 'moment-image';
                im.src = m.imageData;
                im.alt = m.imageDesc ? m.imageDesc : (m.text || '动态图片');
                div.appendChild(im);
                if (m.imageDesc) {
                    const desc = document.createElement('div');
                    desc.style.fontSize = '13px';
                    desc.style.color = '#666';
                    desc.textContent = '图片：' + m.imageDesc;
                    div.appendChild(desc);
                }
            } else if (m.imageDesc) {
                const descCard = document.createElement('div');
                descCard.className = 'moment-image-desc-card';
                if (m.id) descCard.dataset.momentId = m.id || '';
                const descContent = document.createElement('p');
                descContent.className = 'desc-content';
                descContent.textContent = m.imageDesc;
                descCard.appendChild(descContent);
                descCard.setAttribute('role', 'img');
                descCard.setAttribute('aria-label', m.imageDesc);
                div.appendChild(descCard);
            }

            // --- 4. 操作栏 ---
            const actions = document.createElement('div');
            actions.className = 'moment-actions';
            
            const likeBtn = document.createElement('button');
            likeBtn.className = 'moment-action-btn';
            const likes = m.likes || [];
            if (likes.includes(myId)) likeBtn.classList.add('liked');
            
            likeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span>${likes.length > 0 ? likes.length : '点赞'}</span>`;
            
            likeBtn.addEventListener('click', async (event) => {
                event.stopPropagation();
                const btn = event.currentTarget;
                const likesWrap = div.querySelector('.moment-likes');
                const currentLikes = m.likes || [];
                const myIdx = currentLikes.indexOf(myId);

                if (myIdx > -1) {
                    currentLikes.splice(myIdx, 1);
                    btn.classList.remove('liked');
                } else {
                    currentLikes.push(myId);
                    btn.classList.add('liked');
                }
                m.likes = currentLikes;

                if (window.AppDB_Moments) await window.AppDB_Moments.moments.put(m);

                btn.querySelector('span').textContent = currentLikes.length > 0 ? currentLikes.length : '点赞';
                if (likesWrap) {
                    if (currentLikes.length > 0) {
                        const likeNames = currentLikes.map(id => getAuthorProfile(id).name).join(', ');
                        likesWrap.innerHTML = `<span class="like-icon">♥</span> ${likeNames}`;
                        likesWrap.classList.add('visible');
                    } else {
                        likesWrap.classList.remove('visible');
                    }
                }
            });

            const commentBtn = document.createElement('button');
            commentBtn.className = 'moment-action-btn';
            commentBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg><span>评论</span>`;
            
            commentBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const inputArea = div.querySelector('.moment-comment-input-area');
                if (inputArea) {
                    inputArea.classList.toggle('visible');
                    const input = inputArea.querySelector('input');
                    const postBtn = inputArea.querySelector('button');
                    input.value = '';
                    input.placeholder = '添加评论...';
                    delete postBtn.dataset.replyToCommentId;
                    delete postBtn.dataset.replyToAuthorId;
                    if (inputArea.classList.contains('visible')) input.focus();
                }
            });

            actions.appendChild(likeBtn);
            actions.appendChild(commentBtn);
            div.appendChild(actions);

            // --- 5. 点赞列表区 ---
            const likesWrap = document.createElement('div');
            likesWrap.className = 'moment-likes';
            if (likes.length > 0) {
                const likeNames = likes.map(id => getAuthorProfile(id).name).join(', ');
                likesWrap.innerHTML = `<span class="like-icon">♥</span> ${likeNames}`;
                likesWrap.classList.add('visible');
            }
            div.appendChild(likesWrap);

            // --- 6. 评论列表区 (递归渲染) ---
            const commentsWrap = document.createElement('div');
            commentsWrap.className = 'moment-comments';

            const renderCommentsFlat = (comments) => {
                if (!comments || comments.length === 0) return;
                
                const traverse = (list) => {
                    list.forEach(c => {
                        const cm = document.createElement('div');
                        cm.className = 'moment-comment';
                        cm.dataset.commentId = c.id;
                        cm.dataset.authorId = c.roleId; 
                        
                        const authorName = getAuthorProfile(c.roleId).name;
                        
                        let replyHtml = '';
                        if (c.replyTo) {
                            const replyToName = getAuthorProfile(c.replyTo).name;
                            replyHtml = `<span style="color:#888; margin: 0 4px;">回复</span><strong>${replyToName}</strong>`;
                        }

                        cm.innerHTML = `<strong>${authorName}</strong>${replyHtml}: <span>${c.text}</span>`;
                        commentsWrap.appendChild(cm);

                        if (c.replies && c.replies.length > 0) {
                            traverse(c.replies);
                        }
                    });
                };
                traverse(comments);
            };

            renderCommentsFlat(m.comments);
            
            if (commentsWrap.innerHTML === '') {
                const none = document.createElement('div');
                none.style.color='#bbb'; none.textContent = '暂时没有评论';
                commentsWrap.appendChild(none);
            }
            div.appendChild(commentsWrap);

            // --- 7. 评论输入框 ---
            const commentInputArea = document.createElement('div');
            commentInputArea.className = 'moment-comment-input-area';
            commentInputArea.innerHTML = `
              <input type="text" class="moment-comment-input" placeholder="添加评论...">
              <button class="post-comment-btn" data-moment-id="${m.id}">发布</button>
            `;
            div.appendChild(commentInputArea);

            momentsContainer.appendChild(div);
        });
        
        // 强制接管旧的安全模式
        window.renderMomentsSafe = renderMoments;
    }

    return renderMoments;
})();

const renderMomentsSafe = (function() {
    let _db = null;
    if (typeof Dexie !== 'undefined') {
        // Use the existing global instance if available
        if (window.AppDB_Moments) {
            _db = window.AppDB_Moments;
        } else {
            try {
                _db = new Dexie('AppDB_Moments');
                _db.version(1).stores({ moments: 'id,timestamp,commentedBy' });
                window.AppDB_Moments = _db; // Ensure it's globally available
            } catch (e) {
                console.warn('[injected patch] Dexie init failed:', e);
                _db = null;
            }
        }
    } else {
        console.warn('[injected patch] Dexie not available.');
    }

    // ▼▼▼ 在 renderMomentsSafe 函数的正上方，粘贴这个新函数 ▼▼▼
    function getAuthorProfile(authorId) {
        // 默认备用信息
        let profile = { name: '未知用户', avatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg' };

        // 1. 检查是不是用户自己
        const myProfile = (typeof loadProfileFromStorage === 'function') ? loadProfileFromStorage() : {};
        if (authorId === (myProfile.id || 'user')) {
            return { name: myProfile.name || '我', avatar: myProfile.avatar };
        }

        // 2. 在所有AI角色中查找
        if (window.db && Array.isArray(window.db.characters)) {
            const character = window.db.characters.find(c => c.id === authorId);
            if (character) {
                return { name: character.remarkName, avatar: character.avatar };
            }
        }

        // 3. 在所有群聊的成员中查找 (以防是群聊成员发的动态)
        if (window.db && Array.isArray(window.db.groups)) {
            for (const group of window.db.groups) {
                if (Array.isArray(group.members)) {
                    const member = group.members.find(m => m.id === authorId);
                    if (member) {
                        return { name: member.groupNickname, avatar: member.avatar };
                    }
                }
            }
        }
        
        return profile; // 如果都找不到，返回默认信息
    }
    // ▲▲▲ 添加结束 ▲▲▲

    // ▼▼▼ 用这个新版本，完整替换掉旧的 renderMomentsSafe 函数 ▼▼▼
    async function renderMomentsSafe() {
      try {
        const container = document.getElementById('moments-container') || (document.getElementById('moments-screen') && document.getElementById('moments-screen').querySelector('#moments-container'));
        if (!container) {
          console.warn('[injected patch] No container found for moments.');
          return;
        }
        let list = [];
        if (_db && _db.moments) {
          try {
            list = await _db.moments.orderBy('timestamp').reverse().toArray();
          } catch (e) {
            console.error('[injected patch] Failed reading moments from IndexedDB:', e);
            list = [];
          }
        } else {
          try {
            const maybeDb = window.AppDB_Moments || null;
            if (maybeDb && maybeDb.moments) {
              list = await maybeDb.moments.orderBy('timestamp').reverse().toArray();
            }
          } catch (e) {
            list = [];
          }
        }

        container.innerHTML = '';
        const momentsEmpty = document.getElementById('moments-empty');
        if (!list || !list.length) {
          if (momentsEmpty) momentsEmpty.style.display = 'block';
          else {
            const p = document.createElement('p');
            p.className = 'placeholder-text';
            p.textContent = '还没有动态，点击右上角发布吧~';
            container.appendChild(p);
          }
          return;
        } else {
          if (momentsEmpty) momentsEmpty.style.display = 'none';
        }

        list.forEach(m => {
          try {
            const div = document.createElement('div'); div.className = 'moment-item';
            div.dataset.id = m.id || (m.id = (Math.random()+''+Date.now()));
            const head = document.createElement('div'); head.className = 'moment-head';
            const avatar = document.createElement('img'); avatar.className = 'moment-avatar';
            const meta = document.createElement('div'); meta.className = 'moment-meta';
            const name = document.createElement('div'); name.style.fontWeight='700';
            const time = document.createElement('div'); time.style.fontSize='12px'; time.style.color='#999';
            try { time.textContent = new Date(m.timestamp).toLocaleString(); } catch(e) { time.textContent = ''; }
            
            // --- 核心修改在这里 ---
            const authorInfo = getAuthorProfile(m.authorId); // 使用新函数查找作者信息
            name.textContent = authorInfo.name || m.author || '未知用户'; // 优先用新找到的名字，找不到再用快照里的旧名字
            avatar.src = authorInfo.avatar || m.authorAvatar || 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg'; // 优先用新找到的头像，找不到再用快照里的
            // --- 修改结束 ---

            meta.appendChild(name);
            meta.appendChild(time);
            head.appendChild(avatar);
            head.appendChild(meta);
            div.appendChild(head);

            const txt = document.createElement('div'); txt.className='moment-text'; txt.textContent = m.text || '';
            div.appendChild(txt);

            if (m.imageData && m.imageData !== 'null' && m.imageData !== 'undefined' && m.imageData.length>10) {
              const im = document.createElement('img'); im.className = 'moment-image';
              im.src = m.imageData;
              im.alt = m.imageDesc ? m.imageDesc : (m.text || '动态图片');
              div.appendChild(im);
              if (m.imageDesc) {
                const desc = document.createElement('div'); desc.style.fontSize='13px'; desc.style.color='#666';
                desc.textContent = '图片：' + m.imageDesc;
                div.appendChild(desc);
              }
            } else if (m.imageDesc) {
              const descCard = document.createElement('div'); descCard.className = 'moment-image-desc-card';
              if (m.id) descCard.dataset.momentId = m.id || '';
              const descContent = document.createElement('p'); descContent.className = 'desc-content';
              descContent.textContent = m.imageDesc;
              descCard.appendChild(descContent);
              descCard.setAttribute('role', 'img');
              descCard.setAttribute('aria-label', m.imageDesc);
              descCard.addEventListener('click', function () { /* show detail */ });
              div.appendChild(descCard);
            }

            const actions = document.createElement('div');
            actions.className = 'moment-actions';
            
            const likeBtn = document.createElement('button');
            likeBtn.className = 'moment-action-btn';
            const likes = m.likes || [];
            const myProfile = loadProfileFromStorage();
            const myId = myProfile.id || 'user';
            if (likes.includes(myId)) {
                likeBtn.classList.add('liked');
            }
            likeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span>${likes.length > 0 ? likes.length : '点赞'}</span>`;
            
likeBtn.addEventListener('click', async (event) => {
                event.stopPropagation(); // 防止点击穿透
                const btn = event.currentTarget;
                const momentItem = btn.closest('.moment-item');
                
                // 1. 更新本地数据状态
                const currentLikes = m.likes || [];
                const myIdx = currentLikes.indexOf(myId);

                if (myIdx > -1) {
                    currentLikes.splice(myIdx, 1);
                    btn.classList.remove('liked');
                } else {
                    currentLikes.push(myId);
                    btn.classList.add('liked');
                }
                m.likes = currentLikes;

                // --- 【核弹级修复】现场连接数据库进行保存 ---
                try {
                    // 不管全局变量在不在，直接新建一个连接，保证 put 方法存在
                    const safeDb = new Dexie('AppDB_Moments');
                    safeDb.version(1).stores({ moments: 'id,timestamp,commentedBy' });
                    await safeDb.moments.put(m);
                    // console.log('点赞状态已保存');
                } catch (e) {
                    console.error("数据库写入失败:", e);
                    alert("点赞保存失败，请检查控制台");
                }
                // ------------------------------------------

                // 2. 更新按钮文字
                const span = btn.querySelector('span');
                if (span) {
                    span.textContent = currentLikes.length > 0 ? currentLikes.length : '点赞';
                }

                // 3. 更新点赞人名列表显示
                const likesWrap = momentItem.querySelector('.moment-likes');
                if (likesWrap) {
                    if (currentLikes.length > 0) {
                        const likeNames = currentLikes.map(likeId => window.getAuthorNameById(likeId)).join(', ');
                        likesWrap.innerHTML = `<span class="like-icon">♥</span> ${likeNames}`;
                        likesWrap.classList.add('visible');
                    } else {
                        likesWrap.classList.remove('visible');
                    }
                }
            });

            const commentBtn = document.createElement('button');
            commentBtn.className = 'moment-action-btn';
            commentBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg><span>评论</span>`;
            commentBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const btn = event.currentTarget;
                const momentItem = btn.closest('.moment-item');
                if (momentItem) {
                    const inputArea = momentItem.querySelector('.moment-comment-input-area');
                    if (inputArea) {
                        inputArea.classList.toggle('visible');
                        if (inputArea.classList.contains('visible')) {
                            inputArea.querySelector('input').focus();
                        }
                    }
                }
            });

            actions.appendChild(likeBtn);
            actions.appendChild(commentBtn);
            div.appendChild(actions);

            if (likes.length > 0) {
                const likesWrap = document.createElement('div');
                likesWrap.className = 'moment-likes visible';
                const likeNames = likes.map(likeId => window.getAuthorNameById(likeId)).join(', ');
                likesWrap.innerHTML = `<span class="like-icon">♥</span> ${likeNames}`;
                div.appendChild(likesWrap);
            }

            const commentsWrap = document.createElement('div'); commentsWrap.className = 'moment-comments';
            if (m.comments && m.comments.length) {
              m.comments.forEach(c => {
                const cm = document.createElement('div'); cm.className='moment-comment';
                const authorName = window.getAuthorNameById(c.roleId || c.role);
                cm.textContent = `${authorName}：${c.text}`;
                commentsWrap.appendChild(cm);
              });
            } else {
              const none = document.createElement('div'); none.style.color='#bbb'; none.textContent = '暂时没有评论';
              commentsWrap.appendChild(none);
            }
            div.appendChild(commentsWrap);

            const commentInputArea = document.createElement('div');
            commentInputArea.className = 'moment-comment-input-area';
            commentInputArea.innerHTML = `
              <input type="text" class="moment-comment-input" placeholder="添加评论...">
              <button class="post-comment-btn" data-moment-id="${m.id}">发布</button>
            `;
            div.appendChild(commentInputArea);
            container.appendChild(div);
          } catch (innerErr) {
            console.error('[injected patch] render single moment failed', innerErr, m);
          }
        });

      } catch (err) {
        console.error('[injected patch] renderMomentsSafe failed', err);
        const container = document.getElementById('moments-container') || (document.getElementById('moments-screen') && document.getElementById('moments-screen').querySelector('.content'));
        if (container) {
          container.innerHTML = '<div style="color:#b00;padding:12px;border-radius:10px;background:#fff8f8;">加载动态时出错（详情见 Console）</div>';
        }
      }
    }
    // ▲▲▲ 替换结束 ▲▲▲

    return renderMomentsSafe;
})();

async function addMomentToDB(momentObj) {
  try {
    if (window.AppDB_Moments && window.AppDB_Moments.moments && typeof window.AppDB_Moments.moments.add === 'function') {
      return window.AppDB_Moments.moments.add(momentObj);
    }
  } catch(e){}

  try {
    if (window.db && window.db.moments && typeof window.db.moments.add === 'function') {
      return window.db.moments.add(momentObj);
    }
  } catch(e){}

  if (!window.db) window.db = {};
  if (!Array.isArray(window.db.moments)) window.db.moments = [];
  window.db.moments.push(momentObj);

  if (typeof window.saveData === 'function') {
    try { await window.saveData(); } catch(e){ console.warn('saveData fallback failed', e); }
  }

  try {
    if (window.AppDB_Moments && window.AppDB_Moments.moments && typeof window.AppDB_Moments.moments.put === 'function') {
      await window.AppDB_Moments.moments.put(momentObj);
    }
  } catch(e){ console.warn('mirror to AppDB_Moments failed', e); }

  return Promise.resolve();
}

async function saveUserComment(momentId, commentText, replyToCommentId = null, replyToAuthorName = null) {
    try {
        const db = window.AppDB_Moments || window.db;
        if (!db || !momentId || !commentText) return;
        const moment = await db.moments.get(momentId);
        if (!moment) return;

        const myProfile = loadProfileFromStorage();
        const myId = myProfile.id || 'user';
        const myGlobalName = myProfile.name || '我';
        const targetAuthorId = replyToAuthorName; 

        const newComment = {
            id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            roleId: myId,
            text: commentText,
            ts: Date.now(),
            replies: [],
            replyTo: targetAuthorId || null 
        };

        let notificationTargetCharacter = null;
        let notificationContent = '';
        
        const getUserNameForAi = (targetAi) => {
            return (targetAi && targetAi.myName) ? targetAi.myName : myGlobalName;
        };

        const idInfo = `(请在回复指令中使用此ID数据 -> momentId: "${momentId}", commentId: "${newComment.id}")`;

        if (replyToCommentId) {
            const findComment = (comments) => {
                for (const c of comments) {
                    if (c.id === replyToCommentId) return c;
                    if (c.replies && c.replies.length > 0) {
                        const found = findComment(c.replies);
                        if (found) return found;
                    }
                }
                return null;
            };
            const parentComment = findComment(moment.comments || []);
            
            if (parentComment) {
                parentComment.replies = parentComment.replies || [];
                parentComment.replies.push(newComment);
                
                if (targetAuthorId && targetAuthorId.startsWith('char_')) {
                    notificationTargetCharacter = window.db.characters.find(c => c.id === targetAuthorId);
                    if (notificationTargetCharacter) {
                        const nameToUse = getUserNameForAi(notificationTargetCharacter);
                        const momentSnippet = moment.text.substring(0, 10) + '...';
                        notificationContent = `[system: ${nameToUse} 回复了你对动态 "${momentSnippet}" 的评论: "${commentText}"。${idInfo}]`;
                    }
                }
            } else {
                 moment.comments = moment.comments || [];
                 moment.comments.push(newComment);
            }
        } else {
            moment.comments = moment.comments || [];
            moment.comments.push(newComment);
            
            if (moment.authorId && moment.authorId.startsWith('char_')) {
                notificationTargetCharacter = window.db.characters.find(c => c.id === moment.authorId);
                if (notificationTargetCharacter) {
                    const nameToUse = getUserNameForAi(notificationTargetCharacter);
                    const momentSnippet = moment.text.substring(0, 10) + '...';
                    notificationContent = `[system: ${nameToUse} 评论了你的动态 "${momentSnippet}": "${commentText}"。${idInfo}]`;
                }
            }
        }

        moment.commentedBy = moment.commentedBy || [];
        if (!moment.commentedBy.includes(myId)) {
            moment.commentedBy.push(myId);
        }

        await db.moments.put(moment);

        if (notificationTargetCharacter && notificationContent) {
            const contextMessage = {
                id: `msg_context_${Date.now()}`,
                role: 'user',
                content: notificationContent,
                parts: [{ type: 'text', text: notificationContent }],
                timestamp: Date.now()
            };
            notificationTargetCharacter.history.push(contextMessage);
            if (typeof window.saveData === 'function') {
                await window.saveData();
            }
        }
        
        renderMoments();
    } catch (e) {
        console.error(`Failed to save user comment`, e);
        if (typeof showToast === 'function') showToast('评论失败');
    }
}

async function saveMomentComment(momentId, authorId, commentText) {
    try {
        if (!window.AppDB_Moments || !window.AppDB_Moments.moments || !momentId) return;
        const moment = await window.AppDB_Moments.moments.get(momentId);
        if (moment) {
            moment.comments = moment.comments || [];
            moment.commentedBy = moment.commentedBy || [];
            moment.comments.push({
                roleId: authorId,
                text: commentText,
                ts: Date.now()
            });
            if (!moment.commentedBy.includes(authorId)) {
                moment.commentedBy.push(authorId);
            }
            await window.AppDB_Moments.moments.put(moment);
            if (typeof renderMoments === 'function') renderMoments();
        }
    } catch (e) {
        console.error(`Failed to save comment for moment ${momentId}:`, e);
    }
}

async function saveMomentLike(momentId, authorId) {
    try {
        if (!window.AppDB_Moments || !window.AppDB_Moments.moments || !momentId) return;
        const moment = await window.AppDB_Moments.moments.get(momentId);
        if (moment) {
            moment.likes = moment.likes || [];
            if (!moment.likes.includes(authorId)) {
                moment.likes.push(authorId);
                await window.AppDB_Moments.moments.put(moment);
                if (typeof renderMoments === 'function') renderMoments();
            }
        }
    } catch (e) {
        console.error(`Failed to save like for moment ${momentId}:`, e);
    }
}

async function saveAiReplyToComment(momentId, commentId, replyText, aiAuthorId) {
    try {
        const db = window.AppDB_Moments || window.db;
        if (!db || !momentId || !commentId || !replyText) return;
        const moment = await db.moments.get(momentId);
        if (!moment) return;

        const findCommentAndAddReply = (comments) => {
            for (const c of comments) {
                if (c.id === commentId) {
                    c.replies = c.replies || [];
                    c.replies.push({
                        id: `comment_${Date.now()}`,
                        roleId: aiAuthorId,
                        text: replyText,
                        ts: Date.now(),
                        replyTo: c.roleId
                    });
                    return true;
                }
                if (c.replies && findCommentAndAddReply(c.replies)) {
                    return true;
                }
            }
            return false;
        };

        if (findCommentAndAddReply(moment.comments || [])) {
            await db.moments.put(moment);
            if (typeof renderMoments === 'function') {
                renderMoments();
            }
        }
    } catch (e) {
        console.error(`Failed to save AI reply for comment ${commentId}:`, e);
    }
}

function setupMomentsEventListeners() {
    const momentsScreen = document.getElementById('moments-screen');
    if (!momentsScreen) return;
    const db = window.db || {};

    momentsScreen.addEventListener('click', (e) => {
        const myProfile = loadProfileFromStorage();
        const myId = myProfile.id || 'user';

        const commentEl = e.target.closest('.moment-comment');
        if (commentEl) {
            e.stopPropagation();
            
            const replyToAuthorId = commentEl.dataset.authorId;
            const commentId = commentEl.dataset.commentId;
            const authorName = window.getAuthorNameById(replyToAuthorId) || '评论者';

            if (replyToAuthorId === myId) {
                if (typeof showToast === 'function') showToast("不能回复自己的评论哦~");
                return;
            }

            const momentItem = commentEl.closest('.moment-item');
            if (!momentItem) return;

            const inputArea = momentItem.querySelector('.moment-comment-input-area');
            const input = inputArea.querySelector('input');
            const postBtn = inputArea.querySelector('button');

            input.placeholder = `回复 ${authorName}:`;
            inputArea.classList.add('visible');
            input.focus();
            
            postBtn.dataset.replyToCommentId = commentId;
            postBtn.dataset.replyToAuthorId = replyToAuthorId;
        }
    }, true);

    const mentionPanel = document.getElementById('mention-panel');
    let currentInputElement = null;

    const showMentionPanel = (inputElement) => {
        currentInputElement = inputElement;
        if (!db || !db.characters || db.characters.length === 0) {
            mentionPanel.innerHTML = '<div class="mention-item" style="color:#aaa;">没有可@的角色</div>';
        } else {
            mentionPanel.innerHTML = '';
            db.characters.forEach(char => {
                const item = document.createElement('div');
                item.className = 'mention-item';
                item.innerHTML = `<img src="${char.avatar}" alt="${char.remarkName}"><span>${char.remarkName}</span>`;
                item.onmousedown = (evt) => {
                    evt.preventDefault();
                    const text = inputElement.value;
                    const cursorPos = inputElement.selectionStart;
                    const textBeforeCursor = text.substring(0, cursorPos);
                    const atIndex = textBeforeCursor.lastIndexOf('@');
                    const newText = text.substring(0, atIndex) + `@${char.remarkName} ` + text.substring(cursorPos);
                    inputElement.value = newText;
                    hideMentionPanel();
                    inputElement.focus();
                    const newCursorPos = atIndex + `@${char.remarkName} `.length;
                    setTimeout(() => inputElement.setSelectionRange(newCursorPos, newCursorPos), 0);
                };
                mentionPanel.appendChild(item);
            });
        }
        const rect = inputElement.getBoundingClientRect();
        mentionPanel.style.display = 'block';
        mentionPanel.style.bottom = `${window.innerHeight - rect.top}px`;
        mentionPanel.style.left = `${rect.left}px`;
        mentionPanel.style.width = `${rect.width}px`;
        mentionPanel.style.top = 'auto';
    };

    const hideMentionPanel = () => {
        if (mentionPanel) mentionPanel.style.display = 'none';
        currentInputElement = null;
    };

    momentsScreen.addEventListener('input', (e) => {
        if (e.target.matches('.moment-comment-input, #post-text')) {
            const input = e.target;
            const textBeforeCursor = input.value.substring(0, input.selectionStart);
            if (textBeforeCursor.endsWith('@')) {
                showMentionPanel(input);
            } else if (!/@\S*$/.test(textBeforeCursor)) {
                hideMentionPanel();
            }
        }
    }, true);

    document.addEventListener('click', (e) => {
        if (currentInputElement && !mentionPanel.contains(e.target) && e.target !== currentInputElement) {
            hideMentionPanel();
        }
    }, true);
    document.addEventListener('scroll', hideMentionPanel, true);
}

function setupDynamicImageHandlers(addImageCheckbox, imageInputGroup, postImagePreview) {
    if (!addImageCheckbox || !imageInputGroup) return;
    addImageCheckbox.addEventListener('change', e => {
      if (!addImageCheckbox.checked) { try { postImagePreview.src = ''; } catch(e){} try { const pi = document.getElementById('post-image'); if(pi) pi.value = ''; } catch(e){} }
      imageInputGroup.style.display = e.target.checked ? 'block' : 'none';
    });
}

async function fileToDataURLAndCompress(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new Image();
      img.onload = function() {
        const w = img.width, h = img.height;
        let nw = w, nh = h;
        if (w > maxWidth) {
          nw = maxWidth;
          nh = Math.round(h * (maxWidth / w));
        }
        const canvas = document.createElement('canvas');
        canvas.width = nw;
        canvas.height = nh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, nw, nh);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out);
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleDynamicSubmit(ev, options = {}) {
  ev.preventDefault();

  const postForm = options.postForm || document.getElementById('post-form');
  const submitBtn = postForm ? postForm.querySelector('button[type="submit"]') : null;
  if (submitBtn) submitBtn.disabled = true;

  const textEl = document.getElementById('post-text');
  const addImageEl = document.getElementById('add-image');
  const imageDescEl = document.getElementById('image-description');

  const text = textEl ? textEl.value.trim() : '';
  const addImage = addImageEl ? addImageEl.checked : false;
  const imageDesc = imageDescEl ? imageDescEl.value.trim() : '';

  if (!text && !addImage) {
    if (submitBtn) submitBtn.disabled = false;
    if (typeof showToast === 'function') showToast('请输入动态内容');
    return;
  }

  if (addImage && !imageDesc) {
    if (submitBtn) submitBtn.disabled = false;
    if (typeof showToast === 'function') showToast('请输入图片描述');
    return;
  }

  const id = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
  const momentObj = {
    id,
    authorId: (localStorage.getItem('myTopId') || 'user'),
    authorAvatar: (localStorage.getItem('myTopAvatar') || null),
    text,
    imageDesc: addImage ? imageDesc : '',
    timestamp: Date.now(),
    commentedBy: [],
    comments: [],
    likes: []
  };

  try {
    await addMomentToDB(momentObj);

    if (typeof showToast === 'function') showToast('发布成功');
    try { if (typeof options.closePostModal === 'function') options.closePostModal(); } catch(e){}

    if (typeof renderMoments === 'function') {
      try { await renderMoments(); } catch(e){ console.warn('renderMoments failed', e); }
    } else if (typeof window.renderMomentsSafe === 'function') {
      try { await window.renderMomentsSafe(); } catch(e){ console.warn('renderMomentsSafe failed', e); }
    } else {
      const ms = document.getElementById('moments-screen');
      if (ms) {
        ms.classList.remove('active');
        setTimeout(()=>ms.classList.add('active'), 10);
      }
    }
  } catch (e) {
    console.error('add moment err', e);
    if (typeof showToast === 'function') showToast('保存失败: ' + (e && e.message ? e.message : String(e)));
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function getAuthorInfoById(authorId) {
  const profile = { id: authorId, name: '未知用户', avatar: null };
  let myProfile = null;
  try {
    if (typeof loadProfileFromStorage === 'function') {
      myProfile = loadProfileFromStorage();
    } else {
      myProfile = {
        id: localStorage.getItem('myTopId') || 'user',
        name: localStorage.getItem('myTopName') || '我',
        avatar: localStorage.getItem('myTopAvatar')
      };
    }
  } catch (e) {}

  if (myProfile && authorId === (myProfile.id || 'user')) {
    return { id: myProfile.id || authorId, name: myProfile.name || '我', avatar: myProfile.avatar || null };
  }

  if (window.db && Array.isArray(window.db.characters)) {
    const character = window.db.characters.find(c => c.id === authorId);
    if (character) {
      return { id: character.id, name: character.remarkName, avatar: character.avatar };
    }
  }

  if (window.db && Array.isArray(window.db.groups)) {
    for (const group of window.db.groups) {
      if (Array.isArray(group.members)) {
        const member = group.members.find(m => m.id === authorId);
        if (member) {
          return { id: member.id, name: member.groupNickname, avatar: member.avatar };
        }
      }
    }
  }

  return profile;
}

const safeParse = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    try {
      let fixed = jsonString.replace(/[\u201C\u201D]/g, '"').replace(/'/g, '"').replace(/,\s*}/g, '}');
      return JSON.parse(fixed);
    } catch (e2) { return null; }
  }
};

const findLatestMomentIdAndCommentId = async (authorId) => {
  const dbInstance = window.AppDB_Moments || window.db;
  if (!dbInstance || !dbInstance.moments) return { mId: null, cId: null };
  try {
    let allMoments = [];
    if (typeof dbInstance.moments.toArray === 'function') {
      allMoments = await dbInstance.moments.toArray();
    } else if (Array.isArray(dbInstance.moments)) {
      allMoments = dbInstance.moments.slice();
    }
    const authorMoments = allMoments.filter(m => m.authorId === authorId);
    if (authorMoments.length === 0) return { mId: null, cId: null };
    authorMoments.sort((a, b) => b.timestamp - a.timestamp);
    const latestMoment = authorMoments[0];
    let latestCommentId = null;
    if (latestMoment.comments && latestMoment.comments.length > 0) {
      const userComments = latestMoment.comments.filter(c => c.roleId !== authorId);
      if (userComments.length > 0) {
        latestCommentId = userComments[userComments.length - 1].id;
      }
    }
    return { mId: latestMoment.id, cId: latestCommentId };
  } catch (err) { return { mId: null, cId: null }; }
};

async function handleAiCommand(type, content, charId) {
  try {
    if (!type || !charId) return false;
    const data = safeParse(content);
    if (!data) return false;

    if (type === '发布动态') {
      const authorInfo = getAuthorInfoById(charId);
      const momentObj = {
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        authorId: charId,
        authorAvatar: authorInfo.avatar || null,
        text: data.text || '',
        imageDesc: data.imageDesc || '',
        timestamp: Date.now(),
        commentedBy: [],
        comments: [],
        likes: []
      };
      await addMomentToDB(momentObj);
      return true;
    }

    if (type === '点赞动态') {
      if (data.momentId === '...' || !data.momentId) {
        const { mId } = await findLatestMomentIdAndCommentId(charId);
        if (mId) data.momentId = mId;
      }
      if (data.momentId) {
        await saveMomentLike(data.momentId, charId);
        return true;
      }
      return false;
    }

    if (type === '评论动态') {
      if (data.momentId === '...' || !data.momentId) {
        const { mId } = await findLatestMomentIdAndCommentId(charId);
        if (mId) data.momentId = mId;
      }
      if (data.momentId && data.comment) {
        await saveMomentComment(data.momentId, charId, data.comment);
        return true;
      }
      return false;
    }

    if (type === '回复评论') {
      if (data.momentId === '...' || !data.momentId || data.commentId === '...' || !data.commentId) {
        const { mId, cId } = await findLatestMomentIdAndCommentId(charId);
        if (mId && cId) {
          data.momentId = mId;
          data.commentId = cId;
        }
      }
      if (data.momentId && data.commentId && data.reply) {
        await saveAiReplyToComment(data.momentId, data.commentId, data.reply, charId);
        return true;
      }
      return false;
    }

    return false;
  } catch (e) {
    return false;
  }
}

async function getPendingMomentsForRole(roleId, limit = 5) {
  let myId = 'user';
  try {
    if (typeof window.loadProfileFromStorage === 'function') {
      const profile = window.loadProfileFromStorage();
      if (profile && profile.id) myId = profile.id;
    } else {
      myId = localStorage.getItem('myTopId') || 'user';
    }
  } catch (e) {}

  let all = [];
  try {
    if (window.AppDB_Moments && window.AppDB_Moments.moments && typeof window.AppDB_Moments.moments.orderBy === 'function') {
      all = await window.AppDB_Moments.moments.orderBy('timestamp').reverse().toArray();
    } else if (window.db && window.db.moments && typeof window.db.moments.orderBy === 'function') {
      all = await window.db.moments.orderBy('timestamp').reverse().toArray();
    } else if (window.db && Array.isArray(window.db.moments)) {
      all = window.db.moments.slice().sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (e) {}

  const pending = all.filter(m =>
    m.authorId === myId &&
    !(m.commentedBy || []).includes(roleId)
  );

  return pending.slice(0, limit);
}

async function markMomentsCommentedBy(commentsArray, roleId) {
  const dbInstance = window.AppDB_Moments || window.db;
  if (!dbInstance || !dbInstance.moments) return;
  try {
    if (typeof dbInstance.transaction === 'function') {
      await dbInstance.transaction('rw', dbInstance.moments, async () => {
        for (const c of commentsArray) {
          const m = await dbInstance.moments.get(c.momentId);
          if (!m) continue;
          const cbSet = new Set(m.commentedBy || []);
          cbSet.add(roleId);
          m.commentedBy = Array.from(cbSet);
          m.comments = m.comments || [];
          m.comments.push({ roleId, text: c.commentText, ts: Date.now() });
          await dbInstance.moments.put(m);
        }
      });
    } else {
      for (const c of commentsArray) {
        const m = await dbInstance.moments.get(c.momentId);
        if (!m) continue;
        const cbSet = new Set(m.commentedBy || []);
        cbSet.add(roleId);
        m.commentedBy = Array.from(cbSet);
        m.comments = m.comments || [];
        m.comments.push({ roleId, text: c.commentText, ts: Date.now() });
        await dbInstance.moments.put(m);
      }
    }
    renderMoments();
  } catch (e) {
    console.error('mark comments err', e);
  }
}

async function getContextText(roleId, limit = 3) {
  if (!roleId) return '';
  const pendingMoments = await getPendingMomentsForRole(roleId, limit);
  if (!pendingMoments || pendingMoments.length === 0) return '';
  const momentsData = pendingMoments.map(m => ({
    id: m.id,
    author: m.author,
    text: m.text,
    imageDesc: m.imageDesc
  }));
  return `\n[system-moments: ${JSON.stringify(momentsData)}]`;
}

async function triggerProactiveMomentInteraction(character) {
  try {
    const myProfile = loadProfileFromStorage();
    const myId = myProfile.id || 'user';

    const allMoments = await window.AppDB_Moments.moments.toArray();
    const unInteractedMoments = allMoments.filter(m =>
      m.authorId === myId &&
      !m.likes.includes(character.id) &&
      !m.comments.some(c => c.roleId === character.id)
    );

    if (unInteractedMoments.length === 0) {
      console.log(`[后台互动] ${character.remarkName} 找不到可以互动的新动态。`);
      return false;
    }

    const momentToInteract = unInteractedMoments.sort((a, b) => b.timestamp - a.timestamp)[0];

    const prompt = `你正在扮演角色“${character.realName}”（人设：${character.persona}）。你刚刚在“动态”里看到了你的朋友“${character.myName}”发布的一条新内容，你还没有和它互动过。
        
# 动态内容
- 作者: ${character.myName}
- 文字: "${momentToInteract.text}"
- 图片描述(如有): "${momentToInteract.imageDesc || '无'}"

# 你的任务
根据你的人设和动态内容，决定是“点赞”还是“评论”。

# 输出格式 (严格遵守)
- 如果决定点赞，你的回复必须是且仅是： [${character.realName}点赞动态：{"momentId":"${momentToInteract.id}"}]
- 如果决定评论，你的回复必须是且仅是： [${character.realName}评论动态：{"momentId":"${momentToInteract.id}", "comment":"这里是你的评论内容"}]
- 绝对不要回复任何其他内容。`;

    const messagesForApi = [{ role: 'user', content: prompt }];
    const functionalSettings = window.db && window.db.functionalApiSettings && Object.keys(window.db.functionalApiSettings).length > 0 &&
                               window.db.functionalApiSettings.url && window.db.functionalApiSettings.key && window.db.functionalApiSettings.model
                               ? window.db.functionalApiSettings
                               : (window.db ? window.db.apiSettings : null);
    const callAi = typeof window.callAiApi === 'function' ? window.callAiApi : (typeof callAiApi === 'function' ? callAiApi : null);
    if (!callAi || !functionalSettings) return false;
    const aiResponseText = await callAi(messagesForApi, functionalSettings);

    const likeRegex = /\[(.*?)点赞动态：({.*?})\]/;
    const commentRegex = /\[(.*?)评论动态：({.*?})\]/;

    const likeMatch = aiResponseText.match(likeRegex);
    const commentMatch = aiResponseText.match(commentRegex);

    if (likeMatch) {
      const likeData = JSON.parse(likeMatch[2]);
      await saveMomentLike(likeData.momentId, character.id);
      addNotificationToQueue({
        avatar: character.avatar,
        text: `<strong>${character.remarkName}</strong> 点赞了你的动态`
      });
      console.log(`[后台互动] ${character.remarkName} 点赞了动态 ${likeData.momentId}`);
      return true;
    } else if (commentMatch) {
      const commentData = JSON.parse(commentMatch[2]);
      await saveMomentComment(commentData.momentId, character.id, commentData.comment);
      addNotificationToQueue({
        avatar: character.avatar,
        text: `<strong>${character.remarkName}</strong> 评论了你的动态: ${commentData.comment}`
      });
      console.log(`[后台互动] ${character.remarkName} 评论了动态 ${commentData.momentId}`);
      return true;
    } else {
      console.warn(`[后台互动] AI返回了无效的互动指令: ${aiResponseText}`);
      return false;
    }
  } catch (error) {
    console.error("AI后台动态互动失败:", error);
    return false;
  }
}

window.renderMoments = renderMoments;
window.renderMomentsSafe = renderMomentsSafe;
window.dynamicsHandler = {
    render: window.renderMoments,
    renderSafe: window.renderMomentsSafe,
    addMoment: addMomentToDB,
    saveComment: saveUserComment,
    saveLike: saveMomentLike,
    saveMomentComment,
    saveAiReplyToComment,
    setupListeners: setupMomentsEventListeners,
    setupImageHandlers: setupDynamicImageHandlers,
    handleDynamicSubmit,
    fileToDataURLAndCompress,
    handleAiCommand,
    getPendingMomentsForRole,
    markMomentsCommentedBy,
    getContextText,
    triggerProactiveMomentInteraction
};
