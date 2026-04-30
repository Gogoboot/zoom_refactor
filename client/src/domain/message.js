/**
 * message.js — Сущность сообщения чата
 * Фабричная функция — чистые данные без методов
 */

/**
 * @param {string} text — текст сообщения
 * @param {boolean} isOwn — моё сообщение или собеседника
 * @param {string} sender — имя отправителя
 * @param {Date} timestamp — время отправки
 * @param {string|null} fileUrl — ссылка на файл (если это файл)
 * @returns {Object}
 */
export function createMessage({ 
  text, 
  isOwn = false, 
  sender = '', 
  timestamp = new Date(),
  fileUrl = null  // ← добавили параметр
}) {
    return Object.freeze({ 
      text, 
      isOwn, 
      sender, 
      timestamp,
      fileUrl  // ← добавили в возвращаемый объект
    });
}
