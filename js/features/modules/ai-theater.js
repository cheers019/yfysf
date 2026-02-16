(() => {
    window.normalizeAiTheaterHtml = function(fullResponse) {
        if (!fullResponse || !fullResponse.includes('ai-theater')) return fullResponse;
        let output = fullResponse;
        if ((output.match(/<div/g) || []).length > (output.match(/<\/div>/g) || []).length) {
            output += '</div>';
        }
        output = output.replace(/<div\s+class=["']ai-theater["']\s*(.*?)>/g, '<div class="ai-theater" $1>');
        return output;
    };

    const rootSelectors = ['.ai-theater', '.ai-generated-theater', '.message-content', '.message-bubble', '.message-bubble-row', '.message-wrapper'];

    const resolveSourceElement = (element) => {
        if (element && element.target) return element.target;
        if (element && element.currentTarget) return element.currentTarget;
        return element;
    };

    const findRoot = (sourceElement) => {
        const tried = [];
        for (const selector of rootSelectors) {
            tried.push(selector);
            if (sourceElement && typeof sourceElement.closest === 'function') {
                const root = sourceElement.closest(selector);
                if (root) return { root, tried, selector };
            }
        }
        return { root: null, tried, selector: null };
    };

    const normalizeActionName = (action) => {
        const raw = action == null ? '' : String(action);
        const cleaned = raw.replace(/\s+/g, '').toLowerCase();
        const map = {
            'toggleclass': 'toggle-class',
            'addclass': 'add-class',
            'removeclass': 'remove-class',
            'settext': 'set-text',
            'switchtab': 'switch-tab',
            'show': 'show',
            'hide': 'hide'
        };
        return map[cleaned] || cleaned;
    };

    const parseDurationMs = (duration) => {
        if (!duration) return 0;
        const parts = duration.split(',').map(part => part.trim()).filter(Boolean);
        let maxMs = 0;
        for (const part of parts) {
            if (part.endsWith('ms')) {
                maxMs = Math.max(maxMs, parseFloat(part));
            } else if (part.endsWith('s')) {
                maxMs = Math.max(maxMs, parseFloat(part) * 1000);
            }
        }
        return Number.isFinite(maxMs) ? maxMs : 0;
    };

    const resolveTransitionInfo = (el) => {
        const style = window.getComputedStyle(el);
        const durationMs = parseDurationMs(style.transitionDuration);
        const properties = style.transitionProperty.split(',').map(prop => prop.trim().toLowerCase());
        const hasTransition = durationMs > 0 && properties.length > 0 && properties[0] !== 'none';
        const supportsOpacity = properties.includes('opacity') || properties.includes('all');
        return { hasTransition, supportsOpacity, durationMs };
    };

    const setVisibility = (el, visible) => {
        const transition = resolveTransitionInfo(el);
        if (visible) {
            if (window.getComputedStyle(el).display === 'none') {
                el.style.display = el.dataset.theaterDisplay || 'block';
            }
            if (transition.hasTransition && transition.supportsOpacity) {
                const currentOpacity = window.getComputedStyle(el).opacity;
                if (currentOpacity === '0') {
                    el.style.opacity = '0';
                    requestAnimationFrame(() => {
                        el.style.opacity = '';
                        el.style.pointerEvents = '';
                    });
                } else {
                    el.style.opacity = '';
                    el.style.pointerEvents = '';
                }
            }
            return;
        }
        if (transition.hasTransition && transition.supportsOpacity) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            const token = String(Date.now());
            el.dataset.theaterHideToken = token;
            setTimeout(() => {
                if (el.dataset.theaterHideToken === token) {
                    el.style.display = 'none';
                }
            }, transition.durationMs || 0);
        } else {
            el.style.display = 'none';
        }
    };

    const resolveTarget = (theaterRoot, targetSelector) => {
        const log = [];
        if (!targetSelector || typeof targetSelector !== 'string') {
            return { target: null, log: log.concat('invalid-selector') };
        }
        log.push(`query:${targetSelector}`);
        let targetElement = theaterRoot.querySelector(targetSelector);
        if (targetElement) return { target: targetElement, log };

        const suffixMatch = theaterRoot.innerHTML.match(/id=["']([a-zA-Z0-9_-]+?)_([a-zA-Z0-9]{6})["']/);
        if (suffixMatch) {
            const suffix = suffixMatch[2];
            const selectorWithoutHash = targetSelector.replace('#', '');
            const newSelector = `#${selectorWithoutHash}_${suffix}`;
            log.push(`query:${newSelector}`);
            targetElement = theaterRoot.querySelector(newSelector);
            if (targetElement) return { target: targetElement, log };
        }
        return { target: null, log };
    };

    const performAction = (el, actionName, value) => {
        const act = normalizeActionName(actionName);
        const transition = resolveTransitionInfo(el);
        if (transition.hasTransition) {
            void el.offsetWidth;
        }
        switch (act) {
            case 'toggle-class':
                el.classList.toggle(value);
                return true;
            case 'add-class':
                el.classList.add(value);
                return true;
            case 'remove-class':
                el.classList.remove(value);
                return true;
            case 'set-text':
                el.textContent = value == null ? '' : String(value);
                return true;
            case 'show':
                setVisibility(el, true);
                return true;
            case 'hide':
                setVisibility(el, false);
                return true;
            case 'switch-tab':
                if (!value) return false;
                const container = el.parentElement;
                if (container) {
                    const allTabs = container.querySelectorAll('.' + value);
                    allTabs.forEach(tab => setVisibility(tab, false));
                    setVisibility(el, true);
                    return true;
                }
                return false;
            default:
                return false;
        }
    };

    window.handleTheaterClick = function(element, action, targetSelector, value) {
        try {
            const sourceElement = resolveSourceElement(element);
            if (!sourceElement || sourceElement.nodeType !== 1) {
                console.warn('小剧场交互：无有效点击源', { element });
                return;
            }

            const rootResult = findRoot(sourceElement);
            if (!rootResult.root) {
                console.warn('小剧场交互：未找到根容器', { element: sourceElement, tried: rootResult.tried });
                return;
            }

            const targetResult = resolveTarget(rootResult.root, targetSelector);
            if (!targetResult.target) {
                console.warn('小剧场交互：未找到目标元素', { element: sourceElement, rootSelector: rootResult.selector, tries: targetResult.log, targetSelector });
                return;
            }

            const success = performAction(targetResult.target, action, value);
            if (!success) {
                console.warn('小剧场交互：执行动作失败', { action, targetSelector, value, element: sourceElement });
            }
        } catch (e) {
            console.warn('小剧场交互：异常', { error: e, element });
        }
    };
})();
