/**
 * room.js — Сущность комнаты
 * Фабричная функция — чистые данные без методов
 */

/**
 * @param {string} id — ID комнаты
 * @param {string} participantId — твой ID в комнате
 * @returns {Object}
 */
export function createRoom({ id, participantId }) {
    return Object.freeze({ id, participantId });
}

export function roomFromServer(data) {
    return createRoom({
        id:            data.room_id,
        participantId: data.participant_id,
    });
}
