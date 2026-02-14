window.SoulBondLogic = {
    updateBondRoster(charId, action) {
        if (!window.db) return [];
        if (!Array.isArray(window.db.soul_bond_roster)) window.db.soul_bond_roster = [];
        try {
            let roster = window.db.soul_bond_roster;
            if (action === 'add') {
                if (!roster.includes(charId) && roster.length < 2) {
                    roster.push(charId);
                }
                window.db.soul_bond_roster = roster;
                if (typeof window.saveData === 'function') window.saveData();
                return roster;
            }
            if (action === 'remove') {
                roster = roster.filter(id => id !== charId);
                window.db.soul_bond_roster = roster;
                if (typeof window.saveData === 'function') window.saveData();
                return roster;
            }
            if (action === 'get') {
                return roster;
            }
            return roster;
        } catch (error) {
            console.error('更新伴侣名册时出错:', error);
            return [];
        }
    },
    getBondCharacter(index) {
        if (!window.db || !Array.isArray(window.db.characters)) return null;
        const roster = Array.isArray(window.db.soul_bond_roster) ? window.db.soul_bond_roster : [];
        if (roster.length === 0) return null;
        let resolvedIndex = Number.isInteger(index) ? index : null;
        if (resolvedIndex === null) {
            const screen = document.getElementById('soul-bond-screen');
            const screenCharacterId = screen && screen.dataset ? screen.dataset.characterId : null;
            if (screenCharacterId) {
                const screenIndex = roster.indexOf(screenCharacterId);
                if (screenIndex >= 0) resolvedIndex = screenIndex;
            }
        }
        if (resolvedIndex === null) {
            const activeCharacter = window.db.characters.find(c => c.isSoulBound === true) || null;
            if (activeCharacter) {
                const activeIndex = roster.indexOf(activeCharacter.id);
                if (activeIndex >= 0) resolvedIndex = activeIndex;
            }
        }
        if (resolvedIndex === null || resolvedIndex < 0 || resolvedIndex >= roster.length) {
            resolvedIndex = 0;
        }
        const characterId = roster[resolvedIndex];
        const character = window.db.characters.find(c => c.id === characterId) || null;
        if (!character) return null;
        const name = character.name || character.realName || character.remarkName || '';
        const avatar = character.avatar || character.myAvatar || character.icon || '';
        if (!character.name && name) character.name = name;
        if (!character.avatar && avatar) character.avatar = avatar;
        return character;
    },
    findBoundCharacter() {
        if (!window.db || !Array.isArray(window.db.characters)) return null;
        return window.db.characters.find(c => c.isSoulBound === true) || null;
    }
};
window.updateBondRoster = window.SoulBondLogic.updateBondRoster;
window.findBoundCharacter = window.SoulBondLogic.findBoundCharacter;
