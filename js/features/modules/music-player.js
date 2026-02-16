let audioPlayer = null;
let currentSongIndex = -1;
let isPlaying = false;
let sharedWithChatIds = new Set();
let shuffleOrder = [];
let parsedLyrics = [];
let currentLyricIndex = -1;

let musicWidget = null;
let musicModal = null;
let playlistPanel = null;
let addSongModal = null;
let shareMusicModal = null;
let playBtn = null;
let nextBtn = null;
let prevBtn = null;
let loopBtn = null;
let openPlaylistBtn = null;
let openAddSongModalBtn = null;
let openCloudSearchBtn = null;
let addSongForm = null;
let shareBtn = null;
let confirmShareBtn = null;
let cloudSearchModal = null;
let cloudSearchForm = null;
let cloudSearchInput = null;
let cloudSearchResults = null;
let closeCloudSearchBtn = null;
let addSongModalTitle = null;
let editingSongIndex = null;
let lyricsImportBtn = null;

function parseLRC(lrcContent) {
    if (!lrcContent) return [];
    const lines = lrcContent.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = line.replace(timeRegex, '').trim();
            if (text) {
                result.push({ time, text });
            }
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

if (typeof window.Http_Get_External === 'undefined') {
    window.Http_Get_External = function(url) {
        return new Promise((resolve) => {
            fetch(url).then(res => res.json().catch(() => res.text())).then(resolve).catch(() => resolve(null));
        });
    }
}

async function Http_Get(url) { return await window.Http_Get_External(url); }

async function searchNeteaseMusic(name, singer) {
    try {
        let searchTerm = name.replace(/\s/g, "");
        if (singer) { searchTerm += ` ${singer.replace(/\s/g, "")}`; }
        const apiUrl = `https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(searchTerm)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API 请求失败，状态码: ${response.status}`);
        }
        const result = await response.json();
        if (result.code !== 200 || !result.data || result.data.length === 0) {
            return [];
        }
        return result.data.map(song => ({
            name: song.song,
            artist: song.singer,
            id: song.id,
            cover: song.cover || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png',
            source: 'netease'
        })).slice(0, 30);
    } catch (e) {
        return [];
    }
}

async function searchTencentMusic(name) {
    try {
        name = name.replace(/\s/g, "");
        const result = await Http_Get(`https://api.vkeys.cn/v2/music/tencent?word=${encodeURIComponent(name)}`);
        if (!result?.data?.length) return [];
        return result.data.map(song => ({
            name: song.song,
            artist: song.singer,
            id: song.id,
            cover: song.cover || 'https://s3plus.meituan.net/opapisdk/op_ticket_885190757_1757748720126_qdqqd_1jt5sv.jpeg',
            source: 'tencent'
        })).slice(0, 30);
    } catch (e) {
        return [];
    }
}

async function getLyricsForSong(songId, source) {
    const url = source === 'netease'
        ? `https://api.vkeys.cn/v2/music/netease/lyric?id=${songId}`
        : `https://api.vkeys.cn/v2/music/tencent/lyric?id=${songId}`;
    const response = await Http_Get(url);
    if (response?.data) {
        const lrc = response.data.lrc || response.data.lyric || "";
        const tlyric = response.data.trans || response.data.tlyric || "";
        return lrc + "\n" + tlyric;
    }
    return "";
}

async function getPlayableSongDetails(songData) {
    let playableResult = null;
    let finalSource = songData.source;

    const primaryApiUrl = songData.source === 'netease' 
        ? `https://api.vkeys.cn/v2/music/netease?id=${songData.id}`
        : `https://api.vkeys.cn/v2/music/tencent?id=${songData.id}`;
    
    let primaryResult = await Http_Get(primaryApiUrl);
    if (primaryResult?.data?.url) {
        playableResult = { url: primaryResult.data.url, id: songData.id, source: songData.source };
    }

    if (!playableResult) {
        const fallbackSource = songData.source === 'netease' ? 'tencent' : 'netease';
        const fallbackResults = fallbackSource === 'tencent' 
            ? await searchTencentMusic(songData.name)
            : await searchNeteaseMusic(songData.name, songData.artist);

        if (fallbackResults.length > 0) {
            const fallbackApiUrl = fallbackSource === 'netease'
                ? `https://api.vkeys.cn/v2/music/netease?id=${fallbackResults[0].id}`
                : `https://api.vkeys.cn/v2/music/tencent?id=${fallbackResults[0].id}`;
            const fallbackResult = await Http_Get(fallbackApiUrl);
            if (fallbackResult?.data?.url) {
                playableResult = { url: fallbackResult.data.url, id: fallbackResults[0].id, source: fallbackSource };
                finalSource = fallbackSource;
            }
        }
    }

    if (playableResult) {
        if (playableResult.url && typeof playableResult.url === 'string') {
            playableResult.url = playableResult.url.replace(/^http:\/\//i, 'https://');
        }
        if (songData.cover && typeof songData.cover === 'string') {
            songData.cover = songData.cover.replace(/^http:\/\//i, 'https://');
        }
        const lrcContent = await getLyricsForSong(playableResult.id, finalSource) || "";
        return {
            name: songData.name,
            artist: songData.artist,
            src: playableResult.url,
            cover: songData.cover,
            isLocal: false,
            lrcContent: lrcContent
        };
    }
    return null;
}

const cloudRefreshTTL = 1000 * 60 * 15;

function resolveMusicCover(coverValue) {
    const normalized = typeof coverValue === 'string' ? coverValue.trim() : '';
    if (!normalized || window.musicCoverPlaceholders.has(normalized)) return window.defaultMusicCoverUrl;
    return normalized;
}

function isCloudSong(song) {
    if (!song) return false;
    if (song.isCloud === true) return true;
    if (song.fetchTime) return true;
    if (song.url && typeof song.url === 'string') {
        if (song.url.startsWith('https://files.catbox.moe/')) return false;
        return /vkeys\.cn/i.test(song.url);
    }
    return false;
}

async function refreshSongLink(songName, artist) {
    const safeName = String(songName || '').trim();
    const safeArtist = String(artist || '').trim();
    if (!safeName) return null;
    const [neteaseResults, tencentResults] = await Promise.all([
        searchNeteaseMusic(safeName, safeArtist),
        searchTencentMusic(safeName)
    ]);
    const combinedResults = [...neteaseResults, ...tencentResults];
    if (combinedResults.length === 0) return null;
    const preferred = combinedResults[0];
    const playable = await getPlayableSongDetails(preferred);
    if (!playable) return null;
    return {
        name: playable.name,
        artist: playable.artist,
        url: playable.src,
        cover: playable.cover,
        lyrics: playable.lrcContent,
        fetchTime: Date.now(),
        isCloud: true
    };
}

async function searchAndPlaySong(title, artist, options = {}) {
    const { autoplay = true, forceCloud = false } = options;
    if (!forceCloud) {
        const existingSong = db.playlist.find(s => s.name === title && (artist ? s.artist === artist : true));
        if (existingSong) {
            const songIndex = db.playlist.indexOf(existingSong);
            if (autoplay) {
                await playSong(songIndex);
            }
            return { song: existingSong, index: songIndex };
        }
    }
    const [neteaseResults, tencentResults] = await Promise.all([
        searchNeteaseMusic(title, artist),
        searchTencentMusic(title)
    ]);
    const combinedResults = [...neteaseResults, ...tencentResults];
    if (combinedResults.length === 0) return null;
    const preferred = artist
        ? combinedResults.find(s => s.artist && s.artist.includes(artist)) || combinedResults[0]
        : combinedResults[0];
    const playable = await getPlayableSongDetails(preferred);
    if (!playable) return null;
    const newSong = {
        id: `song_${Date.now()}`,
        url: playable.src,
        name: playable.name,
        artist: playable.artist,
        albumArt: playable.cover,
        lyrics: playable.lrcContent,
        isCloud: true,
        fetchTime: Date.now(),
        refreshRetryCount: 0
    };
    db.playlist.push(newSong);
    await saveData();
    const songIndex = db.playlist.length - 1;
    if (autoplay) {
        await playSong(songIndex);
    }
    return { song: newSong, index: songIndex };
}

function renderCloudSearchResults(results) {
    if (!cloudSearchResults) return;
    cloudSearchResults.innerHTML = '';
    if (!results || results.length === 0) {
        cloudSearchResults.innerHTML = '<li style="color:#888; text-align:center; padding: 12px 0;">未找到相关歌曲</li>';
        return;
    }
    results.forEach(song => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.cursor = 'pointer';
        const sourceLabel = song.source === 'netease' ? '网易云' : 'QQ音乐';
        li.innerHTML = `
            <div class="item-details">
                <div class="item-name">${song.name}</div>
                <div class="item-preview">${song.artist} · ${sourceLabel}</div>
            </div>
        `;
        li.addEventListener('click', async () => {
            const existingSong = db.playlist.find(s => s.name === song.name && s.artist === song.artist);
            if (existingSong) {
                const songIndex = db.playlist.indexOf(existingSong);
                await playSong(songIndex);
                if (musicModal) musicModal.classList.add('visible');
                showToast(`正在播放: ${existingSong.name}`);
                return;
            }
            showToast("正在为你从云端找歌...");
            const playable = await getPlayableSongDetails(song);
            if (!playable) {
                showToast("未找到可播放资源");
                return;
            }
            const newSong = {
                id: `song_${Date.now()}`,
                url: playable.src,
                name: playable.name,
                artist: playable.artist,
                albumArt: playable.cover,
                lyrics: playable.lrcContent,
                isCloud: true,
                fetchTime: Date.now(),
                refreshRetryCount: 0
            };
            db.playlist.push(newSong);
            await saveData();
            renderPlaylistPanel();
            await playSong(db.playlist.length - 1);
            if (musicModal) musicModal.classList.add('visible');
            showToast(`已添加并播放: ${newSong.name}`);
        });
        cloudSearchResults.appendChild(li);
    });
}

async function handleCloudSearchSubmit(e) {
    e.preventDefault();
    const query = cloudSearchInput.value.trim();
    if (!query) return;
    showToast("正在搜索...");
    let musicName = query;
    let singerName = "";
    if (query.includes('-') || query.includes('–')) {
        const parts = query.split(/[-–]/);
        musicName = parts[0].trim();
        singerName = parts.slice(1).join(' ').trim();
    }
    const [neteaseResults, tencentResults] = await Promise.all([
        searchNeteaseMusic(musicName, singerName),
        searchTencentMusic(musicName)
    ]);
    const combinedResults = [...neteaseResults, ...tencentResults];
    if (combinedResults.length === 0) {
        renderCloudSearchResults([]);
        showToast("未找到相关歌曲");
        return;
    }
    renderCloudSearchResults(combinedResults);
}

function updateLyrics(currentTime) {
    if (!parsedLyrics.length) return;

    let newLyricIndex = parsedLyrics.findIndex(line => line.time > currentTime) - 1;
    if (newLyricIndex === -2) {
        newLyricIndex = parsedLyrics.length - 1;
    }
    if (newLyricIndex < 0) {
        newLyricIndex = 0;
    }

    if (newLyricIndex !== currentLyricIndex) {
        currentLyricIndex = newLyricIndex;
        const lyricsPanel = document.getElementById('lyrics-panel');
        const innerPanel = lyricsPanel.querySelector('.lyrics-panel-inner');
        const allLines = innerPanel.querySelectorAll('.lyric-line');

        allLines.forEach((line, index) => {
            line.classList.toggle('active', index === currentLyricIndex);
        });

        const activeLine = allLines[currentLyricIndex];
        if (activeLine) {
            const panelHeight = lyricsPanel.clientHeight;
            const activeLineOffset = activeLine.offsetTop + (activeLine.clientHeight / 2);
            const scrollAmount = activeLineOffset - (panelHeight / 2);
            innerPanel.style.transform = `translateY(-${scrollAmount}px)`;
        }
    }
}

function updatePlayerUI() {
    const song = db.playlist[currentSongIndex];
    const albumArt = musicModal.querySelector('.music-album-art');
    const songTitle = musicModal.querySelector('.song-title');
    const lyricsPanel = musicModal.querySelector('#lyrics-panel');
    const playBtnEl = musicModal.querySelector('.play-btn');

    if (song) {
        albumArt.src = resolveMusicCover(song.albumArt || song.cover);
        albumArt.onerror = () => {
            albumArt.src = window.defaultMusicCoverUrl;
            albumArt.onerror = null;
        };
        songTitle.textContent = song.name;
        playBtnEl.innerHTML = isPlaying ? '<svg viewBox="0 0 24 24"><path d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>';
    } else {
        songTitle.textContent = '歌曲名';
        if (lyricsPanel) {
            lyricsPanel.innerHTML = '<p class="lyric-line">歌词面板</p>';
        }
    }
}

async function playSong(index) {
    if (index < 0 || index >= db.playlist.length) {
        isPlaying = false;
        audioPlayer.pause();
        currentSongIndex = -1;
        updatePlayerUI();
        return;
    }
    currentSongIndex = index;
    const song = db.playlist[index];
    const shouldRefresh = isCloudSong(song) && (!song.fetchTime || (Date.now() - song.fetchTime > cloudRefreshTTL));
    if (shouldRefresh) {
        const refreshed = await refreshSongLink(song.name, song.artist);
        if (refreshed) {
            song.url = refreshed.url;
            song.albumArt = refreshed.cover;
            song.lyrics = refreshed.lyrics;
            song.fetchTime = refreshed.fetchTime;
            song.isCloud = true;
            song.refreshRetryCount = 0;
            await saveData();
        } else {
            showToast("该音源目前不可用");
            isPlaying = false;
            updatePlayerUI();
            return;
        }
    }
    audioPlayer.src = song.url;

    const lyricsPanel = document.getElementById('lyrics-panel');
    lyricsPanel.innerHTML = '';
    
    parsedLyrics = [];
    currentLyricIndex = -1;

    if (song.lyrics) {
        parsedLyrics = parseLRC(song.lyrics);
    }

    if (parsedLyrics.length > 0) {
        const innerPanel = document.createElement('div');
        innerPanel.className = 'lyrics-panel-inner';
        parsedLyrics.forEach(line => {
            const p = document.createElement('p');
            p.className = 'lyric-line';
            p.textContent = line.text;
            innerPanel.appendChild(p);
        });
        lyricsPanel.appendChild(innerPanel);
    } else {
        lyricsPanel.innerHTML = '<p class="lyric-line">暂无歌词</p>';
    }

    try {
        await audioPlayer.play();
        isPlaying = true;
    } catch (error) {
        isPlaying = false;
        showToast(`歌曲 ${song.name} 播放失败`);
    }
    updatePlayerUI();
    notifyAiOfSongChange();
}

function togglePlayPause() {
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
    } else {
        if (currentSongIndex === -1 && db.playlist.length > 0) {
            playSong(0);
        } else if (currentSongIndex !== -1) {
            audioPlayer.play();
            isPlaying = true;
        } else {
            showToast("播放列表为空, 请先添加歌曲");
        }
    }
    updatePlayerUI();
}

function createShuffleOrder() {
    shuffleOrder = [...Array(db.playlist.length).keys()];
    for (let i = shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
    }
}

function playNext() {
    if (db.playlist.length === 0) return;
    const mode = db.musicPlayerSettings.playbackMode;
    if (mode === 'shuffle') {
        if (shuffleOrder.length === 0) createShuffleOrder();
        const currentIndexInShuffle = shuffleOrder.indexOf(currentSongIndex);
        const nextIndexInShuffle = (currentIndexInShuffle + 1) % shuffleOrder.length;
        playSong(shuffleOrder[nextIndexInShuffle]);
    } else {
        const nextIndex = (currentSongIndex + 1) % db.playlist.length;
        playSong(nextIndex);
    }
}

function playPrev() {
    if (db.playlist.length === 0) return;
    const mode = db.musicPlayerSettings.playbackMode;
    if (mode === 'shuffle') {
        if (shuffleOrder.length === 0) createShuffleOrder();
        const currentIndexInShuffle = shuffleOrder.indexOf(currentSongIndex);
        const prevIndexInShuffle = (currentIndexInShuffle - 1 + shuffleOrder.length) % shuffleOrder.length;
        playSong(shuffleOrder[prevIndexInShuffle]);
    } else {
        const prevIndex = (currentSongIndex - 1 + db.playlist.length) % db.playlist.length;
        playSong(prevIndex);
    }
}

async function changePlaybackMode() {
    const modes = ['sequential', 'loop', 'shuffle'];
    const currentModeIndex = modes.indexOf(db.musicPlayerSettings.playbackMode);
    const nextModeIndex = (currentModeIndex + 1) % modes.length;
    db.musicPlayerSettings.playbackMode = modes[nextModeIndex];
    
    if (db.musicPlayerSettings.playbackMode === 'shuffle') createShuffleOrder();
    else shuffleOrder = [];

    let iconHtml = '', toastMessage = '';
    switch (db.musicPlayerSettings.playbackMode) {
        case 'loop':
            iconHtml = '<svg viewBox="0 0 24 24"><path d="M12,5V1L7,6L12,11V7A6,6 0 0,1 18,13A6,6 0 0,1 12,19A6,6 0 0,1 6,13H4A8,8 0 0,0 12,21A8,8 0 0,0 20,13A8,8 0 0,0 12,5Z"/></svg>';
            toastMessage = '单曲循环';
            audioPlayer.loop = true;
            break;
        case 'shuffle':
            iconHtml = '<svg viewBox="0 0 24 24"><path d="M10.59,9.17L5.41,4L4,5.41L9.17,10.59L10.59,9.17M14.83,13.41L13.41,14.83L18,19.42L19.42,18L14.83,13.41M14.83,9.17L19.42,4.58L18,3.17L13.41,7.76L14.83,9.17M4.2,19.2L5.6,17.8L4.2,16.4L2.8,17.8L4.2,19.2M9.17,14.83L7.76,13.41L3.17,18L4.58,19.42L9.17,14.83Z"/></svg>';
            toastMessage = '随机播放';
            audioPlayer.loop = false;
            break;
        default:
            iconHtml = '<svg viewBox="0 0 24 24"><path d="M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z"/></svg>';
            toastMessage = '顺序播放';
            audioPlayer.loop = false;
            break;
    }
    loopBtn.innerHTML = iconHtml;
    showToast(toastMessage);
    await saveData();
}

function renderPlaylistPanel() {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '';
    if (db.playlist.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">播放列表是空的</p>';
        return;
    }
    db.playlist.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        if(index === currentSongIndex) li.style.backgroundColor = 'var(--bg-color)';
        li.style.cssText += 'display: flex; justify-content: space-between; align-items: center;';
        const cover = resolveMusicCover(song.albumArt || song.cover);
        li.innerHTML = `
            <img src="${cover}" alt="album cover" class="music-card-icon" onerror="this.src='${window.defaultMusicCoverUrl}';this.onerror=null;" style="margin-right: 12px;">
            <div class="item-details" style="cursor: pointer; flex-grow: 1;">
                <div class="item-name">${song.name}</div>
                <div class="item-preview">${song.artist}</div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-small btn-edit" data-edit-index="${index}" style="padding: 4px 8px; background-color: #eee; color: #333;">编</button>
                <button class="btn btn-small btn-remove" data-remove-index="${index}" style="padding: 4px 8px; background-color: #eee; color: #333;">删</button>
            </div>
        `;
        li.querySelector('.item-details').addEventListener('click', () => {
            playSong(index);
            playlistPanel.classList.remove('visible');
        });
        li.querySelector('button.btn-remove').addEventListener('click', async (e) => {
            e.stopPropagation();
            db.playlist.splice(index, 1);
            if (currentSongIndex === index) { playNext(); } 
            else if (currentSongIndex > index) { currentSongIndex--; }
            await saveData();
            renderPlaylistPanel();
        });
        li.querySelector('button.btn-edit').addEventListener('click', async (e) => {
            e.stopPropagation();
            openAddSongModal(index);
        });
        container.appendChild(li);
    });
}

function renderShareModal() {
    const container = document.getElementById('share-music-selection-list');
    container.innerHTML = '';
    const allChats = [...db.characters, ...db.groups];
    if (allChats.length === 0) {
        container.innerHTML = '<li style="color:#888; text-align:center; padding: 20px 0;">没有可以分享的聊天</li>';
        return;
    }
    allChats.forEach(chat => {
        const li = document.createElement('li');
        li.className = 'world-book-select-item';
        const isChecked = sharedWithChatIds.has(chat.id);
        const name = chat.remarkName || chat.name;
        const avatar = chat.avatar || 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
        
        li.innerHTML = `
            <input type="checkbox" id="share-select-${chat.id}" value="${chat.id}" ${isChecked ? 'checked' : ''}>
            <label for="share-select-${chat.id}" style="display: flex; align-items: center; width: 100%; gap: 10px;">
                <img src="${avatar}" alt="${name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <span>${name}</span>
            </label>
        `;
        container.appendChild(li);
    });
}

const sendMusicCard = async (chatId, song) => {
    const chat = db.characters.find(c => c.id === chatId) || db.groups.find(g => g.id === chatId);
    if (!chat) return;

    const myName = chat.me ? chat.me.nickname : chat.myName;
    const content = `[${myName}分享了音乐：${song.name} - ${song.artist}]`;

    const message = { 
        id: `msg_music_${Date.now()}`, 
        role: 'user', 
        content, 
        parts: [{ type: 'text', text: content }], 
        timestamp: Date.now(), 
        senderId: 'user_me' 
    };
    
    chat.history.push(message);
    if (currentChatId === chatId) {
        addMessageBubble(message);
    }
};

async function notifyAiOfSongChange() {
    if (currentSongIndex === -1 || sharedWithChatIds.size === 0) return;
    
    const song = db.playlist[currentSongIndex];
    const notificationContent = `[system-context-only: 我正在听的歌曲已切换为: ${song.name} - ${song.artist}。歌词: ${song.lyrics || '无'}]`;
    
    for (const chatId of sharedWithChatIds) {
        const chat = db.characters.find(c => c.id === chatId) || db.groups.find(g => g.id === chatId);
        if (chat) {
            const message = { id: `msg_music_update_${Date.now()}`, role: 'user', content: notificationContent, parts: [{ type: 'text', text: notificationContent }], timestamp: Date.now(), senderId: 'user_me' };
            chat.history.push(message);
        }
    }
    await saveData();
}

function openAddSongModal(songIndex = null) {
    if (!addSongForm || !addSongModal) return;
    addSongForm.reset();
    editingSongIndex = Number.isInteger(songIndex) ? songIndex : null;
    if (typeof editingSongIndex === 'number' && editingSongIndex >= 0 && editingSongIndex < db.playlist.length) {
        const song = db.playlist[editingSongIndex];
        if (addSongModalTitle) addSongModalTitle.textContent = '编辑歌曲信息';
        document.getElementById('song-url-input').value = song.url || '';
        document.getElementById('song-name-input').value = song.name || '';
        document.getElementById('song-artist-input').value = song.artist || '';
        document.getElementById('song-album-art-input').value = song.albumArt || '';
        document.getElementById('song-lyrics-input').value = song.lyrics || '';
    } else {
        editingSongIndex = null;
        if (addSongModalTitle) addSongModalTitle.textContent = '手动添加歌曲';
    }
    addSongModal.classList.add('visible');
}

function setupMusicPlayer() {
    audioPlayer = document.getElementById('global-audio-player');
    musicWidget = document.getElementById('music-app-widget');
    musicModal = document.getElementById('music-player-modal');
    playlistPanel = document.getElementById('music-playlist-panel');
    addSongModal = document.getElementById('add-song-modal');
    shareMusicModal = document.getElementById('share-music-modal');
    
    playBtn = musicModal.querySelector('.play-btn');
    nextBtn = musicModal.querySelector('.side-btn[title="下一首"]');
    prevBtn = musicModal.querySelector('.side-btn[title="上一首"]');
    loopBtn = musicModal.querySelector('.music-extra-controls button[title="循环模式"]');
    openPlaylistBtn = musicModal.querySelector('.music-extra-controls button[title="歌曲列表"]');
    openAddSongModalBtn = document.getElementById('open-add-song-modal-btn');
    openCloudSearchBtn = document.getElementById('open-cloud-search-btn');
    addSongForm = document.getElementById('add-song-form');
    shareBtn = musicModal.querySelector('.share-btn');
    confirmShareBtn = document.getElementById('confirm-music-share-btn');
    cloudSearchModal = document.getElementById('cloud-search-modal');
    cloudSearchForm = document.getElementById('cloud-search-form');
    cloudSearchInput = document.getElementById('cloud-search-input');
    cloudSearchResults = document.getElementById('cloud-search-results');
    closeCloudSearchBtn = document.getElementById('close-cloud-search-btn');
    lyricsImportBtn = document.getElementById('lyrics-import-btn');
    if (addSongModal) {
        addSongModalTitle = addSongModal.querySelector('h3');
    }
    if (audioPlayer) {
        audioPlayer.preload = 'metadata';
    }

    musicWidget.addEventListener('click', () => musicModal.classList.add('visible'));
    playBtn.addEventListener('click', togglePlayPause);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    loopBtn.addEventListener('click', changePlaybackMode);
    openPlaylistBtn.addEventListener('click', () => { renderPlaylistPanel(); playlistPanel.classList.add('visible'); });
    openAddSongModalBtn.addEventListener('click', () => { openAddSongModal(); });
    if (openCloudSearchBtn && cloudSearchModal) {
        openCloudSearchBtn.addEventListener('click', () => {
            if (cloudSearchForm) cloudSearchForm.reset();
            if (cloudSearchResults) cloudSearchResults.innerHTML = '';
            cloudSearchModal.classList.add('visible');
            if (cloudSearchInput) setTimeout(() => cloudSearchInput.focus(), 0);
        });
    }
    if (cloudSearchForm) {
        cloudSearchForm.addEventListener('submit', handleCloudSearchSubmit);
    }
    if (closeCloudSearchBtn && cloudSearchModal) {
        closeCloudSearchBtn.addEventListener('click', () => {
            cloudSearchModal.classList.remove('visible');
            renderPlaylistPanel();
        });
    }
    if (lyricsImportBtn) {
        lyricsImportBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const lrcContent = await new Promise(resolve => {
                const lrcInput = document.getElementById('lrc-upload-input');
                if (!lrcInput) return resolve(null);
                const handler = (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => resolve(re.target.result);
                        reader.readAsText(file);
                    } else { resolve(null); }
                    lrcInput.removeEventListener('change', handler);
                    lrcInput.value = '';
                };
                lrcInput.addEventListener('change', handler);
                lrcInput.click();
            });
            if (lrcContent !== null) {
                const lyricsInput = document.getElementById('song-lyrics-input');
                if (lyricsInput) lyricsInput.value = lrcContent;
            }
        });
    }

    addSongForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('song-url-input').value.trim();
        const name = document.getElementById('song-name-input').value.trim();
        const artist = document.getElementById('song-artist-input').value.trim();
        const albumArt = document.getElementById('song-album-art-input').value.trim();
        const lyrics = document.getElementById('song-lyrics-input').value.trim();
        if (typeof editingSongIndex === 'number' && editingSongIndex >= 0 && editingSongIndex < db.playlist.length) {
            const song = db.playlist[editingSongIndex];
            song.url = url;
            song.name = name;
            song.artist = artist;
            song.albumArt = albumArt;
            song.lyrics = lyrics;
            await saveData();
            showToast("歌曲信息已更新");
            addSongModal.classList.remove('visible');
            renderPlaylistPanel();
            if (currentSongIndex === editingSongIndex) {
                await playSong(editingSongIndex);
            } else {
                updatePlayerUI();
            }
            editingSongIndex = null;
        } else {
            if (!url.startsWith("https://files.catbox.moe/")) { showToast("请输入有效的Catbox链接"); return; }
            const newSong = {
                id: `song_${Date.now()}`,
                url,
                name,
                artist,
                albumArt,
                lyrics
            };
            db.playlist.push(newSong);
            await saveData();
            showToast("歌曲已添加");
            addSongModal.classList.remove('visible');
            renderPlaylistPanel();
            if (currentSongIndex === -1) updatePlayerUI();
            editingSongIndex = null;
        }
    });

    shareBtn.addEventListener('click', () => {
        if (currentSongIndex === -1) { showToast("请先播放一首歌曲再分享"); return; }
        renderShareModal();
        shareMusicModal.classList.add('visible');
    });
    
    confirmShareBtn.addEventListener('click', async () => {
        const checkboxes = shareMusicModal.querySelectorAll('input[type="checkbox"]');
        const song = db.playlist[currentSongIndex];
        let newShares = new Set();
        
        for (const cb of checkboxes) {
            if (cb.checked) {
                newShares.add(cb.value);
                if (!sharedWithChatIds.has(cb.value)) await sendMusicCard(cb.value, song);
            }
        }
        sharedWithChatIds = newShares;
        await notifyAiOfSongChange();
        
        shareMusicModal.classList.remove('visible');
        showToast("分享设置已更新");
    });

    audioPlayer.addEventListener('ended', () => { if (!audioPlayer.loop) playNext(); });
    audioPlayer.addEventListener('play', () => { isPlaying = true; updatePlayerUI(); });
    audioPlayer.addEventListener('pause', () => { isPlaying = false; updatePlayerUI(); });
    audioPlayer.addEventListener('timeupdate', () => { updateLyrics(audioPlayer.currentTime); });
    audioPlayer.addEventListener('error', async () => {
        const mediaError = audioPlayer.error;
        if (!mediaError) return;
        if (mediaError.code === 4) {
            const song = db.playlist[currentSongIndex];
            if (!song || !isCloudSong(song)) {
                isPlaying = false;
                updatePlayerUI();
                return;
            }
            const retryCount = song.refreshRetryCount || 0;
            if (retryCount >= 1) {
                showToast("该音源目前不可用");
                isPlaying = false;
                updatePlayerUI();
                return;
            }
            console.log("检测到链接失效，正在重新检索");
            showToast("正在修复音源...");
            song.refreshRetryCount = retryCount + 1;
            const refreshed = await refreshSongLink(song.name, song.artist);
            if (!refreshed) {
                showToast("该音源目前不可用");
                isPlaying = false;
                updatePlayerUI();
                await saveData();
                return;
            }
            song.url = refreshed.url;
            song.albumArt = refreshed.cover;
            song.lyrics = refreshed.lyrics;
            song.fetchTime = refreshed.fetchTime;
            song.isCloud = true;
            song.refreshRetryCount = 0;
            await saveData();
            audioPlayer.src = song.url;
            audioPlayer.load();
            try {
                await audioPlayer.play();
                isPlaying = true;
            } catch (error) {
                isPlaying = false;
                showToast("该音源目前不可用");
            }
            updatePlayerUI();
            return;
        }
    });

    [musicModal, playlistPanel, addSongModal, shareMusicModal, cloudSearchModal].forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target !== el) return;
            el.classList.remove('visible');
            if (el === cloudSearchModal) renderPlaylistPanel();
        });
    });
    
    updatePlayerUI();
    if (db.playlist.length > 0) playSong(0);
}

function playMusic(index) { return playSong(index); }
function togglePlay() { return togglePlayPause(); }
function nextTrack() { return playNext(); }
function prevTrack() { return playPrev(); }
function updateProgress() { if (audioPlayer) updateLyrics(audioPlayer.currentTime); }
function renderPlaylist() { return renderPlaylistPanel(); }
window.searchAndPlaySong = searchAndPlaySong;
window.playSong = playSong;
window.refreshSongLink = refreshSongLink;

if (window.displayDispatcher && typeof window.displayDispatcher.register === 'function') {
    window.displayDispatcher.register('music', (songData) => {
        const titleText = ((songData && songData.name) ? songData.name : '').trim();
        const artistText = ((songData && songData.artist) ? songData.artist : '').trim();
        const title = escapeHTML(titleText || '未命名歌曲');
        const artist = escapeHTML(artistText || '未知歌手');
        const coverRaw = resolveMusicCover(songData && (songData.cover || songData.albumArt));
        const urlRaw = (songData && songData.url) ? songData.url : '';
        const cover = escapeHTML(coverRaw);
        const url = escapeHTML(urlRaw);
        const fallbackCover = escapeHTML(window.defaultMusicCoverUrl);
        return `<div class="music-card ai-music-card" data-song-name="${title}" data-song-artist="${artist}" data-song-url="${url}" data-song-cover="${cover}"><img src="${cover}" alt="album cover" class="music-card-icon" onerror="this.src='${fallbackCover}';this.onerror=null;"><div class="music-card-info"><p class="music-card-title">${title}</p><p class="music-card-artist">${artist}</p></div><button class="music-card-play-btn" type="button" aria-label="播放"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></button></div>`;
    });
}
