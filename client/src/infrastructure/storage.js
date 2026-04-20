/**
 * storage.js — Адаптер localStorage
 * Изолирует работу с хранилищем браузера
 */

export function createStorage(prefix = 'webrtc_') {
    function get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(prefix + key);
            return value !== null ? value : defaultValue;
        } catch (e) {
            console.warn('Ошибка чтения localStorage:', e);
            return defaultValue;
        }
    }

    function set(key, value) {
        try {
            localStorage.setItem(prefix + key, value);
        } catch (e) {
            console.warn('Ошибка записи localStorage:', e);
        }
    }

    function remove(key) {
        try {
            localStorage.removeItem(prefix + key);
        } catch (e) {
            console.warn('Ошибка удаления localStorage:', e);
        }
    }

    return { get, set, remove };
}
