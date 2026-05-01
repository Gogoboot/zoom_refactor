/**
 * websocket.js — Адаптер WebSocket
 * Знает КАК отправлять сообщения, не знает о бизнес-логике
 */

const DEFAULT_WS = "wss://meet.gohub.su/ws";
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY = 30000;

export function createWebSocketAdapter({ onMessage, onStatusChange }) {
  let ws = null;
  let reconnectAttempts = 0;
  let reconnectDelay = 1000;
  let reconnectTimer = null;
  let wsConnectTimer = null;
  let messageBuffer = [];
  let isManualDisconnect = false;

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      messageBuffer.push(msg);
    }
  }

  function flushBuffer() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (messageBuffer.length > 0) {
      const msg = messageBuffer.shift();
      ws.send(JSON.stringify(msg));
    }
  }

  async function connect(url = DEFAULT_WS) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (wsConnectTimer) {
      clearTimeout(wsConnectTimer);
      wsConnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }

    // Принудительно wss на HTTPS
    if (window.location.protocol === "https:" && !url.startsWith("wss")) {
      url = url.replace("ws:", "wss:");
    }
    if (!url.endsWith("/ws")) url = url.replace(/\/+$/, "") + "/ws";

    // Сначала получаем токен
    let token = null;
    try {
      const res = await fetch("https://meet.gohub.su/auth/guest");
      const data = await res.json();
      token = data.token;
    } catch (e) {
      console.warn("Не удалось получить токен:", e);
    }

    onStatusChange("connecting");
    const wsUrl = token ? `${url}?token=${token}` : url;
    ws = new WebSocket(wsUrl); // ← wsUrl с токеном!

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (wsConnectTimer) {
      clearTimeout(wsConnectTimer);
      wsConnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }

    // Принудительно wss на HTTPS
    if (window.location.protocol === "https:" && !url.startsWith("wss")) {
      url = url.replace("ws:", "wss:");
    }
    if (!url.endsWith("/ws")) url = url.replace(/\/+$/, "") + "/ws";

    onStatusChange("connecting");
    const wsUrl = token ? `${url}?token=${token}` : url;
    ws = new WebSocket(wsUrl);

    // Тайм-аут подключения
    wsConnectTimer = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        onStatusChange("error", "Тайм-аут подключения");
      }
    }, 10000);

    ws.onopen = () => {
      if (wsConnectTimer) {
        clearTimeout(wsConnectTimer);
        wsConnectTimer = null;
      }
      reconnectAttempts = 0;
      reconnectDelay = 1000;
      isManualDisconnect = false;
      onStatusChange("connected");
      flushBuffer();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage(msg);
      } catch (e) {
        console.warn("Невалидное сообщение от сервера:", e);
      }
    };

    ws.onclose = (event) => {
      if (wsConnectTimer) {
        clearTimeout(wsConnectTimer);
        wsConnectTimer = null;
      }
      ws = null;
      if (!isManualDisconnect) scheduleReconnect(url);
      else onStatusChange("disconnected");
    };

    ws.onerror = () => {
      onStatusChange("error", "Ошибка сокета");
    };
  }

  function scheduleReconnect(url) {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      onStatusChange("error", "Соединение потеряно");
      return;
    }
    reconnectAttempts++;
    const delay = Math.min(reconnectDelay, MAX_RECONNECT_DELAY);
    reconnectDelay *= 2;
    onStatusChange("reconnecting", `Переподключение... (${delay / 1000}с)`);
    reconnectTimer = setTimeout(() => connect(url), delay);
  }

  function disconnect() {
    isManualDisconnect = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (wsConnectTimer) {
      clearTimeout(wsConnectTimer);
      wsConnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    messageBuffer = [];
    onStatusChange("disconnected");
  }

  return { connect, disconnect, send };
}
