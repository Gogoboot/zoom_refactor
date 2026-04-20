/**
 * message.js — Сущность сообщения чата
 * Фабричная функция — чистые данные без методов
 */

/**
 * @param {string} text — текст сообщения
 * @param {boolean} isOwn — моё сообщение или собеседника
 * @param {string} sender — имя отправителя
 * @param {Date} timestamp — время отправки
 * @returns {Object}
 */
export function createMessage({ text, isOwn = false, sender = '', timestamp = new Date() }) {
    return Object.freeze({ text, isOwn, sender, timestamp });
}