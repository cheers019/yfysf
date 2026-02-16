// ===============================================================
// START: 日历全局驱动器 (修复 innerHTML 不执行脚本的问题)
// ===============================================================
(function startCalendarDriver() {
    console.log("日历全局驱动器已启动...");

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ActiveCard_Calendar_Placeholder(raw) {
        const safe = escapeHtml(raw);
        return `<div class="cal-v5-wrapper pending-init" data-display-type="calendar"><textarea class="cal-raw-data" style="display:none;">${safe}</textarea><div class="cal-ui-view"></div></div>`;
    }

    function ActiveCard_Calendar_Render(root) {
        var rawEl = root.querySelector('.cal-raw-data');
        var viewEl = root.querySelector('.cal-ui-view');
        if (!rawEl || !viewEl) return;

        try {
            var raw = rawEl.value || '';
            // 数据清洗
            raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            raw = raw.replace(/：/g, ':');
            if (raw.endsWith(']')) raw = raw.slice(0, -1);

            var parts = raw.split('::');
            if (parts.length < 6) return; // 数据还没准备好

            // 解析数据
            var year = parts[0].trim();
            var month = parts[1].trim();
            var today = parseInt(parts[2]);
            var startDay = parseInt(parts[3]);
            var totalDays = parseInt(parts[4]);
            var dayList = parts[5].replace(/[\r\n]+/g, '').split('|');

            // 生成 HTML
            var uId = 'c' + Math.random().toString(36).substr(2, 6);
            var weeks = ['S','M','T','W','T','F','S'];
            
            var html = '<div style="padding:15px;text-align:center;font-weight:800;color:#1e293b;background:#f8fafc;border-bottom:1px solid #f1f5f9">' + year + '年 ' + month + '月</div>';
            html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;padding:10px 0;font-size:10px;color:#94a3b8;font-weight:bold">' + 
                    weeks.map(w => '<span>'+w+'</span>').join('') + '</div>';
            html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:0 12px 15px 12px">';

            for (var i = 0; i < startDay; i++) html += '<div></div>';

            for (var d = 1; d <= totalDays; d++) {
                var dayData = (dayList[d-1] || '^^^^').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
                var isToday = (d === today);
                var isFuture = (d > today);
                var bg = isToday ? '#3b82f6' : (isFuture ? '#fff' : '#f1f5f9');
                var col = isToday ? '#fff' : (isFuture ? '#cbd5e1' : '#475569');
                var border = isFuture ? '1px dashed #e2e8f0' : '1px solid transparent';
                var shadow = isToday ? '0 4px 10px rgba(59,130,246,0.3)' : 'none';

                html += '<div class="'+uId+'-btn" data-day="'+d+'" data-info="'+dayData+'" ' +
                    'style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:'+bg+';color:'+col+';border:'+border+';box-shadow:'+shadow+';transition:0.2s;">' + d + '</div>';
            }
            html += '</div>';
            html += '<div id="'+uId+'-panel" style="display:none;position:absolute;bottom:0;left:0;right:0;background:rgba(255,255,255,0.98);backdrop-filter:blur(5px);padding:15px;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;box-shadow:0 -4px 20px rgba(0,0,0,0.05);animation:slideUp 0.2s;"></div>';

            viewEl.innerHTML = html;

            // 绑定点击事件
            setTimeout(function() {
                var btns = root.querySelectorAll('.' + uId + '-btn');
                var panel = root.querySelector('#' + uId + '-panel');
                
                btns.forEach(function(btn) {
                    btn.onclick = function() {
                        btns.forEach(function(b) { b.style.transform = 'scale(1)'; });
                        this.style.transform = 'scale(1.1)';

                        var day = this.getAttribute('data-day');
                        var info = this.getAttribute('data-info').split('^');
                        var isFut = (parseInt(day) > today);
                        
                        var formatList = function(str, icon) {
                            if(!str || str.trim() === '') return '<div style="color:#cbd5e1;font-size:11px;font-style:italic">空空如也</div>';
                            return str.split('&').map(function(s) { return '<div style="margin-bottom:2px"><span style="margin-right:4px">'+icon+'</span>'+s+'</div>' }).join('');
                        };

                        panel.innerHTML = 
                            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-weight:bold;color:#334155">' +
                                '<span>'+month+'月'+day+'日 <span style="font-size:11px;font-weight:normal;color:#64748b;margin-left:5px">'+(info[4]||'')+' '+(info[2]||'')+'</span></span>' +
                                '<span style="cursor:pointer;padding:0 5px;color:#94a3b8" class="close-btn">✕</span>' +
                            '</div>' +
                            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;font-size:11px;color:#475569">' +
                                '<div style="background:#f8fafc;padding:8px;border-radius:6px"><div style="color:#1e293b;font-weight:bold;margin-bottom:4px">'+(isFut?'📅 计划':'✅ 完成')+'</div>'+formatList(info[0], '▫️')+'</div>' +
                                '<div style="background:#f8fafc;padding:8px;border-radius:6px"><div style="color:#1e293b;font-weight:bold;margin-bottom:4px">✨ 碎片</div>'+formatList(info[1], '▫️')+'</div>' +
                            '</div>' +
                            '<div style="font-size:11px;color:#334155;background:#f0f9ff;padding:8px;border-radius:6px;border-left:3px solid #3b82f6;line-height:1.4">' + (info[3] || '无日记记录') + '</div>';
                        
                        panel.querySelector('.close-btn').onclick = function() { panel.style.display = 'none'; };
                        panel.style.display = 'block';
                    };
                });
            }, 0);

            // 成功后移除标记，避免重复处理
            root.classList.remove('pending-init');
            root.classList.add('init-done');

        } catch (e) {
            console.error("日历渲染出错", e);
            viewEl.innerHTML = '<div style="color:red">渲染错误: ' + e.message + '</div>';
        }
    }

    if (window.displayDispatcher && typeof window.displayDispatcher.register === 'function') {
        window.displayDispatcher.register('calendar', ActiveCard_Calendar_Placeholder, ActiveCard_Calendar_Render);
    }

})();
// ===============================================================
// END: 日历全局驱动器
// ===============================================================
