/**
 * leaveRoom.js — Сценарий выхода из комнаты
 */

/**
 * @param {Object} deps — зависимости
 * @param {Function} deps.sendSignaling — функция отправки сообщения
 * @param {Function} deps.onLeave — что делать после выхода
 */
export function leaveRoom({ sendSignaling, onLeave }) {
    sendSignaling({ type: 'leave_room' });
    onLeave();
}
