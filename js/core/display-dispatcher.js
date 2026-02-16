(function () {
    window.displayDispatcher = {
        registry: {},
        register: function (type, renderFn, postInitFn) {
            if (!type) return;
            this.registry[type] = { renderFn, postInitFn };
            console.log(`[Dispatcher] 注册成功: ${type}`);
        },
        dispatchRender: function (type, data, message) {
            const entry = this.registry[type];
            if (!entry || typeof entry.renderFn !== 'function') return '';
            const payload = data !== undefined ? data : message;
            return entry.renderFn(payload);
        },
        dispatchPostInit: function (type, element) {
            const entry = this.registry[type];
            if (!entry || typeof entry.postInitFn !== 'function') return;
            entry.postInitFn(element);
        },
        runPostInits: function (root) {
            const scope = root || document;
            Object.keys(this.registry).forEach(type => {
                const elements = scope.querySelectorAll(`[data-display-type="${type}"]`);
                elements.forEach(el => {
                    if (el.getAttribute('data-display-inited') === '1') return;
                    this.dispatchPostInit(type, el);
                    el.setAttribute('data-display-inited', '1');
                });
            });

            const calendarPending = scope.querySelectorAll('.cal-v5-wrapper.pending-init');
            calendarPending.forEach(el => {
                if (el.getAttribute('data-display-inited') === '1') return;
                this.dispatchPostInit('calendar', el);
                el.setAttribute('data-display-inited', '1');
            });
        }
    };
    if (Array.isArray(window.displayDispatcherPending) && window.displayDispatcherPending.length > 0) {
        const pending = window.displayDispatcherPending.slice();
        window.displayDispatcherPending = [];
        pending.forEach(fn => { try { fn(); } catch (e) { } });
    }
})();
