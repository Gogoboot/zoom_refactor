/**
 * sendMessage.js — Сценарий отправки сообщения в чат
 */

/**
 * @param {Object} deps
 * @param {string} deps.text — текст сообщения
 * @param {Function} deps.sendData — функция отправки через DataChannel
 * @param {Function} deps.onSent — что делать после отправки
 */
export function sendMessage({ text, sendData, onSent }) {
    if (!text || text.trim() === '') {
        throw new Error('Сообщение не может быть пустым');
    }

    sendData(JSON.stringify({ type: 'chat', text: text.trim() }));
    onSent(text.trim());
}
