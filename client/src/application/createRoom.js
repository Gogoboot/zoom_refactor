/**
 * createRoom.js — Сценарий использования (use case) создания комнаты
 * Знает ЧТО делать, но не знает КАК (не знает о WebSocket и UI напрямую)
 */

/**
 * @param {Object} deps — зависимости
 * @param {Function} deps.sendSignaling — функция отправки сообщения
 * @param {Function} deps.onSuccess — что делать когда комната создана
 */
export function createRoom({ sendSignaling, onSuccess }) {
    sendSignaling({ type: 'create_room' });
}
