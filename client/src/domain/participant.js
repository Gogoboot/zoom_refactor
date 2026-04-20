/**
 * participant.js — Сущность участника
 * Фабричная функция — чистые данные без методов
 */

/**
 * @param {string} id — ID участника
 * @param {string} displayName — имя участника
 * @returns {Object}
 */
export function createParticipant({ id, displayName = 'User' }) {
    return Object.freeze({ id, displayName });
}

export function participantFromServer(data) {
    return createParticipant({
        id:          data.id,
        displayName: data.display_name,
    });
}
