/**
 * joinRoom.js — Сценарий входа в комнату
 */

/**
 * @param {Object} deps — зависимости
 * @param {string} deps.roomId — ID комнаты
 * @param {string} deps.displayName — имя пользователя
 * @param {Function} deps.sendSignaling — функция отправки сообщения
 */
export function joinRoom({ roomId, displayName = 'User', sendSignaling }) {
    if (!roomId || roomId.trim() === '') {
        throw new Error('ID комнаты не может быть пустым');
    }

    sendSignaling({
        type: 'join_room',
        room_id: roomId.trim(),
        display_name: displayName,
    });
}
