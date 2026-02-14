
// [NEW] Call Detail Modal Logic
window.showCallDetail = function(callLogId) {
    try {
        console.log("【UI追踪】开始打开详情页，当前 ID:", callLogId);
        const modal = document.getElementById('call-detail-modal');
        if (!modal) {
            console.error("【UI警报】call-detail-modal 未找到");
            return;
        }
        if (modal.dataset.movedToBody !== 'true') {
            document.body.appendChild(modal);
            modal.dataset.movedToBody = 'true';
        }
        const metaDiv = document.getElementById('call-detail-meta');
        const transcriptDiv = document.getElementById('call-detail-transcript');
        const bgDiv = document.getElementById('call-detail-bg');
        const returnArea = document.getElementById('call-detail-return');
        if (!metaDiv || !transcriptDiv || !bgDiv || !returnArea) {
            console.error("【UI警报】详情页渲染容器缺失");
            return;
        }
        
        const managerScreen = document.getElementById('call-log-manager-screen');
        const wasManagerActive = managerScreen && managerScreen.classList.contains('active');
        
        if (wasManagerActive) {
            managerScreen.classList.remove('active');
            modal.dataset.returnToManager = 'true';
        } else {
            modal.dataset.returnToManager = 'false';
        }
        
        if (!window.db) window.db = {};
        window.db.callLogs = window.db.callLogs || [];
        const log = window.db.callLogs.find(l => l.id === callLogId);
        
        if (!log) {
            if (window.showToast) window.showToast('找不到该通话记录');
            return;
        }
        
        modal.style.display = 'block';
        if (returnArea) {
            const newReturn = returnArea.cloneNode(true);
            returnArea.parentNode.replaceChild(newReturn, returnArea);
            newReturn.onclick = () => {
                modal.style.display = 'none';
                if (modal.dataset.returnToManager === 'true' && managerScreen) {
                    managerScreen.classList.add('active');
                }
            };
        }

        const dateStr = new Date(log.timestamp).toLocaleString();
        metaDiv.innerHTML = `
            <div class="call-detail-meta-title">${log.title || '通话记录'}</div>
            <div class="call-detail-meta-sub">${log.targetName || '未知'} · ${dateStr} · ${log.duration || ''}</div>
        `;
        const bgKey = log.charId || log.targetId;
        if (window.db.callBackgrounds && bgKey && window.db.callBackgrounds[bgKey]) {
            bgDiv.style.backgroundImage = `url(${window.db.callBackgrounds[bgKey]})`;
        } else {
            bgDiv.style.backgroundImage = '';
        }
        
        transcriptDiv.innerHTML = '';
        if (log.transcript && log.transcript.length > 0) {
            log.transcript.forEach(line => {
                const item = document.createElement('div');
                item.className = 'call-detail-line';
                const isUser = line.sender === 'user';
                const senderName = isUser ? '我' : (log.targetName || 'AI');
                const rawText = line.text == null ? '' : String(line.text);
                const trimmedText = rawText.trim();
                const isDescription = /^\(.*\)$/.test(trimmedText);
                const textClass = isDescription ? 'call-detail-text call-detail-text--desc' : 'call-detail-text';
                item.innerHTML = `
                    <div class="call-detail-speaker">${senderName}</div>
                    <div class="${textClass}">${rawText}</div>
                `;
                transcriptDiv.appendChild(item);
            });
        } else {
            transcriptDiv.innerHTML = '<div class="call-detail-text" style="text-align:center; color: rgba(255,255,255,0.7);">无对话记录</div>';
        }
    } catch (error) {
        console.error('TB_CallDetail.showCallDetail error:', error);
    }
}
