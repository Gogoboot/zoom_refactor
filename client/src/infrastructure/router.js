/* ==========================================
   РОУТЕР — управление URL через history API
   Позволяет делиться ссылкой на комнату
   ========================================== */

const BASE_URL = window.location.origin;

/* Извлекает roomId из текущего URL
   meet.gohub.su/room/abc-123 → 'abc-123'
   meet.gohub.su/ → null */
export function getRoomIdFromUrl() {
    const match = window.location.pathname.match(/^\/room\/(.+)$/);
    return match ? match[1] : null;
}

/* Меняет URL когда комната создана или вошли */
export function setRoomUrl(roomId) {
    const url = `${BASE_URL}/room/${roomId}`;
    window.history.pushState({ roomId }, '', url);
}

/* Сбрасывает URL когда вышли из комнаты */
export function clearRoomUrl() {
    window.history.pushState({}, '', '/');
}

/* Возвращает полную ссылку для отправки другу */
export function getRoomLink(roomId) {
    return `${BASE_URL}/room/${roomId}`;
}
