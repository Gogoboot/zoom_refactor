/**
 * auth.js — Получение и кэширование JWT токена
 * Единственное место где знают как получить токен
 */

let cachedToken = null;
let cachedServerUrl = null;

/**
 * Преобразует WS URL в HTTP URL
 * wss://meet.gohub.su/ws → https://meet.gohub.su
 * ws://localhost:9000/ws → http://localhost:9000
 */
export function wsUrlToHttpUrl(wsUrl) {
    return wsUrl
        .replace(/^wss:/, 'https:')
        .replace(/^ws:/, 'http:')
        .replace(/\/ws$/, '');
}

/**
 * Получает токен с нужного сервера.
 * Кэширует токен — повторный вызов с тем же сервером не делает новый запрос.
 * При смене сервера — получает новый токен.
 */
export async function fetchToken(wsUrl) {
    const httpUrl = wsUrlToHttpUrl(wsUrl);

    // Если сервер тот же и токен есть — возвращаем кэш
    if (cachedToken && cachedServerUrl === httpUrl) {
        return { token: cachedToken, httpUrl };
    }

    try {
        const res = await fetch(`${httpUrl}/auth/guest`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        cachedToken = data.token;
        cachedServerUrl = httpUrl;

        return { token: cachedToken, httpUrl };
    } catch (e) {
        console.warn('Не удалось получить токен:', e);
        cachedToken = null;
        cachedServerUrl = null;
        return { token: null, httpUrl };
    }
}

/**
 * Сбрасывает кэш токена — вызывать при logout или смене сервера
 */
export function clearToken() {
    cachedToken = null;
    cachedServerUrl = null;
}
