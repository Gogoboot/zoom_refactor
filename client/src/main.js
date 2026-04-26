/**
 * main.js — Точка входа приложения
 * Собирает все слои вместе через dependency injection
 */

import { createWebSocketAdapter } from "./infrastructure/websocket.js";
import { createWebRTCAdapter } from "./infrastructure/webrtc.js";
import { createStorage } from "./infrastructure/storage.js";

import { createRoom } from "./application/createRoom.js";
import { joinRoom } from "./application/joinRoom.js";
import { leaveRoom } from "./application/leaveRoom.js";
import { sendMessage } from "./application/sendMessage.js";

import { roomFromServer } from "./domain/room.js";
import { participantFromServer } from "./domain/participant.js";
import { createMessage } from "./domain/message.js";

import { createAppState } from "./presentation/state.js";
import { createVideoLayout } from "./presentation/components/videoLayout.js";
import { createChatComponent } from "./presentation/components/chat.js";
import { createControlsComponent } from "./presentation/components/controls.js";
import { createStatsComponent } from "./presentation/components/stats.js";
import { createPreviewComponent } from "./presentation/components/preview.js";
// Импортируем компонент drawer — выдвижная панель логов и настроек
import { createDrawerComponent } from "./presentation/components/drawer.js";
/* Роутер — управление URL */
import { getRoomIdFromUrl, setRoomUrl, clearRoomUrl, getRoomLink } from './infrastructure/router.js';

/* Иконки */
import {
    iconMic, iconMicOff,
    iconVideo, iconVideoOff,
    iconPhoneOff, iconSwap,
    iconChat, iconMaximize,
    iconCopy, iconPlus,
    iconJoin, iconLeave,
    iconSend, iconSettings,
} from './infrastructure/icons.js';

// ==========================================
// 1. ПРОВЕРКА ПОДДЕРЖКИ WEBRTC
// ==========================================
if (!window.RTCPeerConnection) {
  alert(
    "Ваш браузер не поддерживает WebRTC. Используйте Chrome, Firefox или Safari.",
  );
  throw new Error("WebRTC не поддерживается");
}

// ==========================================
// 2. DOM ЭЛЕМЕНТЫ
// ==========================================
const $ = (id) => document.getElementById(id);

const els = {
  // Видео
  localVideo: $("localVideo"),
  remoteVideo: $("remoteVideo"),
  mainVideo: $("mainVideo"),
  pipVideo: $("pipVideo"),
  pipOverlay: $("pipOverlay"),
  appContainer: document.querySelector(".app-container"),

  // Controls bar
  micBtn: $("micBtn"),
  camBtn: $("camBtn"),
  hangupBtn: $("hangupBtn"),
  swapBtn: $("swapBtn"),
  chatToggleBtn: $("chatToggleBtn"),
  fullscreenBtn: $("fullscreenBtn"),
  drawerBtn:      $("drawerBtn"),       // кнопка шестерёнки в controls-bar
  drawer:         $("drawer"),          // сама панель drawer
  drawerOverlay:  $("drawerOverlay"),   // затемнение фона
  drawerCloseBtn: $("drawerCloseBtn"),  // кнопка закрытия внутри drawer
  volumeSlider: $("volumeSlider"),

  // Чат
  chatPanel: $("chatPanel"),
  chatMessages: $("chatMessages"),
  chatInput: $("chatInput"),
  chatSendBtn: $("chatSendBtn"),

  // Статистика
  statInbound: $("statInbound"),
  statOutbound: $("statOutbound"),
  statRtt: $("statRtt"),
  statLoss: $("statLoss"),

  // Комната
  createBtn: $("createBtn"),
  joinBtn: $("joinBtn"),
  leaveBtn: $("leaveBtn"),
  roomIdInput: $("roomIdInput"),
  copyRoomBtn: $("copyRoomBtn"),

  // Превью
  previewModal: $("previewModal"),
  previewVideo: $("previewVideo"),
  previewMicBtn: $("previewMicBtn"),
  previewCamBtn: $("previewCamBtn"),
  previewStartBtn: $("previewStartBtn"),
  previewCancelBtn: $("previewCancelBtn"),
  previewNoCamera: $("previewNoCamera"),

  // Статус сервера
  serverStatus: $("serverStatus"),
  serverUrlInput: $("serverUrlInput"),
  saveServerBtn: $("saveServerBtn"),
  connectBtn: $("connectBtn"),

  // Модальное окно
  errorModal: $("errorModal"),
  modalTitle: $("modalTitle"),
  modalMessage: $("modalMessage"),
  modalCloseBtn: $("modalCloseBtn"),
  modalOkBtn: $("modalOkBtn"),

  // Тема и вкладки
  statusLog: $("statusLog"),
};

// ==========================================
// 3. ИНИЦИАЛИЗАЦИЯ СЛОЁВ
// ==========================================
const storage = createStorage();
const state = createAppState();

const videoLayout = createVideoLayout({
  mainVideo: els.mainVideo,
  pipVideo: els.pipVideo,
  pipOverlay: els.pipOverlay,
});

const chat = createChatComponent({
  chatMessages: els.chatMessages,
  chatInput: els.chatInput,
  chatSendBtn: els.chatSendBtn,
  chatPanel: els.chatPanel,
  chatToggleBtn: els.chatToggleBtn,
});

const controls = createControlsComponent({
  micBtn: els.micBtn,
  camBtn: els.camBtn,
  hangupBtn: els.hangupBtn,
  swapBtn: els.swapBtn,
  fullscreenBtn: els.fullscreenBtn,
  chatToggleBtn: els.chatToggleBtn,
  drawerBtn:     els.drawerBtn, 
  volumeSlider: els.volumeSlider,
  mainVideo: els.mainVideo,
});

const stats = createStatsComponent({
  statInbound: els.statInbound,
  statOutbound: els.statOutbound,
  statRtt: els.statRtt,
  statLoss: els.statLoss,
});

const preview = createPreviewComponent({
  previewModal: els.previewModal,
  previewVideo: els.previewVideo,
  previewMicBtn: els.previewMicBtn,
  previewCamBtn: els.previewCamBtn,
  previewStartBtn: els.previewStartBtn,
  previewCancelBtn: els.previewCancelBtn,
  previewNoCamera: els.previewNoCamera,
});

// Создаём компонент drawer — передаём ему его DOM элементы
const drawer = createDrawerComponent({
    drawerEl:        els.drawer,
    drawerOverlayEl: els.drawerOverlay,
    drawerCloseBtn:  els.drawerCloseBtn,
    controlsBar:     document.querySelector('.controls-bar'), // передаём панель кнопок

});

// ==========================================
// 4. ВСПОМОГАТЕЛЬНЫЕ UI ФУНКЦИИ
// ==========================================
function addStatus(msg, isError = false) {
  const div = document.createElement("div");
  div.className = isError ? "log-item error" : "log-item system";
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  els.statusLog.appendChild(div);
  els.statusLog.scrollTop = els.statusLog.scrollHeight;
}

function showModal(title, message) {
  els.modalTitle.textContent = title;
  els.modalMessage.textContent = message;
  els.errorModal.style.display = "flex";
}

function hideModal() {
  els.errorModal.style.display = "none";
}

function updateServerStatus(status, text) {
  const dot = els.serverStatus.querySelector(".dot");
  const txt = els.serverStatus.querySelector(".text");
  const map = {
    connected: { cls: "status-connected", icon: "🟢", txt: "Подключено" },
    connecting: { cls: "status-connecting", icon: "🟡", txt: "Подключение..." },
    reconnecting: {
      cls: "status-connecting",
      icon: "🔄",
      txt: "Переподключение...",
    },
    error: { cls: "status-error", icon: "🔴", txt: "Ошибка" },
    disconnected: { cls: "", icon: "⚪", txt: "Отключено" },
  };
  const cfg = map[status] || map.disconnected;
  els.serverStatus.className = `server-status ${cfg.cls}`;
  dot.textContent = cfg.icon;
  txt.textContent = text || cfg.txt;
}

function enableRoomButtons(isInRoom) {
  els.createBtn.disabled = isInRoom;
  els.joinBtn.disabled = isInRoom;
  els.leaveBtn.disabled = !isInRoom;
  els.roomIdInput.readOnly = isInRoom;
  els.copyRoomBtn.disabled = !isInRoom;
}

// ==========================================
// 5. WEBRTC АДАПТЕР
// ==========================================
let webrtc = null;
let remoteParticipantId = null;

async function initWebRTC() {
  webrtc = createWebRTCAdapter({
    onRemoteStream: (stream) => {
      els.remoteVideo.srcObject = stream;
      state.set({ remoteStream: stream });
      videoLayout.update(state.get());
      controls.enableCallControls(true);
      stats.start(() => webrtc.getStats());
      addStatus("🎥 Получен удалённый поток");
    },
    onIceCandidate: (candidate) => {
      if (remoteParticipantId) {
        ws.send({
          type: "ice_candidate",
          target_id: remoteParticipantId,
          candidate: JSON.stringify(candidate),
        });
      }
    },
    onDataMessage: (msg) => {
      if (msg.type === "channel_open") {
        chat.enableInput(true);
        addStatus("💬 Чат доступен");
      } else if (msg.type === "channel_close") {
        chat.enableInput(false);
        addStatus("💬 Чат закрыт");
      } else if (msg.type === "chat") {
        chat.addMessage(
          createMessage({
            text: msg.text,
            isOwn: false,
            sender: "Собеседник",
          }),
        );
      }
    },
    onConnectionState: (connectionState) => {
      addStatus(`🔌 WebRTC: ${connectionState}`);
    },
  });

  await webrtc.init();
}

// ==========================================
// 6. WEBSOCKET АДАПТЕР
// ==========================================
const ws = createWebSocketAdapter({
  onStatusChange: (status, text) => {
    updateServerStatus(status, text);
    addStatus(text || status);
    state.set({ isConnected: status === "connected" });
  },
  onMessage: async (msg) => {
    addStatus(`📥 Получено: ${msg.type}`);

    switch (msg.type) {
case 'room_created': {
    const room = roomFromServer(msg);
    state.set({ room, isInRoom: true });
    els.roomIdInput.value = room.id;
    enableRoomButtons(true);
    /* Меняем URL — теперь можно скинуть ссылку другу */
    setRoomUrl(room.id);
    addStatus(`✅ Комната создана: ${room.id}`);
    addStatus(`🔗 Ссылка: ${getRoomLink(room.id)}`);
    break;
}
      case "room_joined": {
        const room = roomFromServer(msg);
        state.set({ room, isInRoom: true });
        enableRoomButtons(true);
        addStatus(`✅ Вы вошли в комнату. Ваш ID: ${room.participantId}`);
        break;
      }
      case "participant_joined": {
        const participant = participantFromServer(msg.participant);
        const { room } = state.get();
        addStatus(`👤 Новый участник: ${participant.id}`);
        if (
          !remoteParticipantId &&
          room &&
          participant.id !== room.participantId
        ) {
          remoteParticipantId = participant.id;
          const sdp = await webrtc.createOffer();
          ws.send({ type: "offer", target_id: remoteParticipantId, sdp });
          addStatus(`📞 Offer отправлен участнику ${remoteParticipantId}`);
        }
        break;
      }
      case "offer": {
        const { room } = state.get();
        if (msg.from_id !== room?.participantId) {
          remoteParticipantId = msg.from_id;
          const sdp = await webrtc.handleOffer(msg.sdp);
          ws.send({ type: "answer", target_id: msg.from_id, sdp });
          addStatus(`✅ Answer отправлен участнику ${msg.from_id}`);
        }
        break;
      }
      case "answer": {
        const { room } = state.get();
        if (msg.from_id !== room?.participantId) {
          await webrtc.handleAnswer(msg.sdp);
          addStatus("✅ Remote description установлен");
        }
        break;
      }
      case "ice_candidate": {
        const { room } = state.get();
        if (
          msg.from_id !== room?.participantId &&
          remoteParticipantId === msg.from_id
        ) {
          await webrtc.handleIceCandidate(msg.candidate);
        }
        break;
      }
      case "participant_left": {
        addStatus(`👋 Участник ${msg.participant_id} покинул комнату`);
        if (remoteParticipantId === msg.participant_id) {
          remoteParticipantId = null;
          els.remoteVideo.srcObject = null;
          state.set({ remoteStream: null });
          webrtc.close();
          videoLayout.update(state.get());
          controls.enableCallControls(false);
          stats.reset();
          addStatus("Соединение разорвано");
        }
        break;
      }
      case "error": {
        addStatus(`⚠️ Ошибка сервера: ${msg.message}`, true);
        if (
          msg.message.includes("не найдена") ||
          msg.message.includes("NotFound")
        ) {
          showModal(
            "Комната не найдена",
            "Эта комната уже удалена. Создайте новую.",
          );
          handleReset();
        } else {
          showModal("Ошибка", msg.message);
        }
        break;
      }
      default:
        addStatus(`⚠️ Неизвестный тип сообщения: ${msg.type}`, true);
    }
  },
});

// ==========================================
// 7. СБРОС СОСТОЯНИЯ
// ==========================================
function handleReset() {
  /* Сбрасываем URL при выходе из комнаты */
  clearRoomUrl();

  remoteParticipantId = null;

  if (state.get().localStream) {
    state
      .get()
      .localStream.getTracks()
      .forEach((t) => t.stop());
  }

  if (webrtc) {
    webrtc.close();
    webrtc = null;
  }

  els.localVideo.srcObject = null;
  els.remoteVideo.srcObject = null;

  state.reset();
  videoLayout.reset();
  controls.reset();
  chat.reset();
  stats.reset();
  enableRoomButtons(false);

  els.roomIdInput.value = "";
  addStatus("🧹 Состояние сброшено");
}

// ==========================================
// 8. ОБРАБОТЧИКИ КНОПОК КОМНАТЫ
// ==========================================
preview.onStart(async ({ stream, micEnabled, camEnabled }) => {
  const audioTrack = stream.getAudioTracks()[0];
  const videoTrack = stream.getVideoTracks()[0];
  if (audioTrack) audioTrack.enabled = micEnabled;
  if (videoTrack) videoTrack.enabled = camEnabled;

  els.localVideo.srcObject = stream;
  state.set({ localStream: stream });

  controls.setMicState(micEnabled);
  controls.setCamState(camEnabled);
  controls.enableMediaControls(true);

  videoLayout.update(state.get());

  await initWebRTC();
  webrtc.addTracks(stream);

  const { pendingAction, room } = state.get();
  if (pendingAction === "create") {
    createRoom({ sendSignaling: ws.send });
  } else if (pendingAction === "join") {
    joinRoom({
      roomId: els.roomIdInput.value,
      sendSignaling: ws.send,
    });
  }
});

els.createBtn.addEventListener("click", async () => {
  state.set({ pendingAction: "create" });
  try {
    await preview.show("create");
  } catch (err) {
    showModal("Нет доступа к камере", "Разрешите доступ в браузере.");
  }
});

els.joinBtn.addEventListener("click", async () => {
  const roomId = els.roomIdInput.value.trim();
  if (!roomId) {
    showModal("Ошибка", "Введите ID комнаты");
    return;
  }
  state.set({ pendingAction: "join" });
  try {
    await preview.show("join");
  } catch (err) {
    showModal("Нет доступа к камере", "Разрешите доступ в браузере.");
  }
});

els.leaveBtn.addEventListener("click", () => {
  leaveRoom({
    sendSignaling: ws.send,
    onLeave: handleReset,
  });
  addStatus("🚪 Вы покинули комнату");
  setTimeout(() => ws.connect(els.serverUrlInput.value.trim()), 100);
});

// ==========================================
// 9. ОБРАБОТЧИКИ CONTROLS-BAR
// ==========================================
controls.onMicClick(() => {
  const { localStream } = state.get();
  if (!localStream) return;
  const track = localStream.getAudioTracks()[0];
  if (track) {
    track.enabled = !track.enabled;
    controls.setMicState(track.enabled);
    addStatus(track.enabled ? "🎤 Микрофон ВКЛ" : "🔇 Микрофон ВЫКЛ");
  }
});

controls.onCamClick(() => {
  const { localStream } = state.get();
  if (!localStream) return;
  const track = localStream.getVideoTracks()[0];
  if (track) {
    track.enabled = !track.enabled;
    controls.setCamState(track.enabled);
    addStatus(track.enabled ? "📷 Камера ВКЛ" : "⬛ Камера ВЫКЛ");
  }
});

controls.onHangupClick(() => {
  leaveRoom({
    sendSignaling: ws.send,
    onLeave: handleReset,
  });
  addStatus("📵 Звонок завершён");
  setTimeout(() => ws.connect(els.serverUrlInput.value.trim()), 100);
});

controls.onSwapClick(() => {
  const isRemoteOnMain = videoLayout.swap();
  videoLayout.update(state.get());
  addStatus(
    `🔄 Экраны переключены (основной: ${isRemoteOnMain ? "удалённый" : "локальный"})`,
  );
});

controls.onChatToggleClick(() => {
    chat.toggle();

    els.appContainer.classList.toggle('chat-open');
});

// По клику на шестерёнку — открываем/закрываем drawer
controls.onDrawerClick(() => drawer.toggle());

controls.onFullscreenClick(els.appContainer);
controls.onVolumeChange();

// ==========================================
// 10. ЧАТ
// ==========================================
els.chatSendBtn.addEventListener("click", () => {
  try {
    sendMessage({
      text: chat.getValue(),
      sendData: (data) => webrtc.sendData(data),
      onSent: (text) => {
        chat.addMessage(createMessage({ text, isOwn: true }));
        chat.clearInput();
      },
    });
  } catch (err) {
    addStatus(`❌ ${err.message}`, true);
  }
});

els.chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    els.chatSendBtn.click();
  }
});

// ==========================================
// 11. КОПИРОВАНИЕ ID КОМНАТЫ
// ==========================================
els.copyRoomBtn.addEventListener("click", () => {
  const roomId = els.roomIdInput.value.trim();
  if (!roomId) return;
  navigator.clipboard
    .writeText(roomId)
    .then(() => {
      els.copyRoomBtn.textContent = "✅";
      addStatus("📋 ID комнаты скопирован");
      setTimeout(() => {
        els.copyRoomBtn.textContent = "📋";
      }, 2000);
    })
    .catch(() => {
      addStatus("❌ Не удалось скопировать ID", true);
    });
});

// ==========================================
// 12. ТЕМА
// ==========================================
/* ==========================================
   ТЕМА — переключение через data-theme
   ========================================== */
function initTheme() {
  const saved = storage.get("theme", "glass");
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  storage.set("theme", theme);

  // Подсвечиваем активную кнопку
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

// Вешаем обработчик на каждую кнопку темы
document.querySelectorAll(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => setTheme(btn.dataset.theme));
});

// ==========================================
// 13. ВКЛАДКИ
// ==========================================

// Логика вкладок теперь живёт внутри drawer.js

// ==========================================
// 14. МОДАЛЬНОЕ ОКНО
// ==========================================
els.modalCloseBtn.addEventListener("click", hideModal);
els.modalOkBtn.addEventListener("click", hideModal);
els.errorModal.addEventListener("click", (e) => {
  if (e.target === els.errorModal) hideModal();
});

// ==========================================
// 15. ПАНЕЛЬ СЕРВЕРА
// ==========================================
els.serverUrlInput.value = storage.get(
  "ws_server_url",
  "wss://meet.gohub.su/ws",
);

els.saveServerBtn.addEventListener("click", () => {
  const url = els.serverUrlInput.value.trim();
  if (url) {
    storage.set("ws_server_url", url);
    addStatus(`💾 Сервер сохранён: ${url}`);
    ws.connect(url);
  }
});

els.connectBtn.addEventListener("click", () => {
  ws.connect(els.serverUrlInput.value.trim());
});

/* ==========================================
   ИКОНКИ — расставляем SVG по кнопкам
   ========================================== */
function initIcons() {
    // Controls bar
    els.micBtn.appendChild(iconMic());
    els.camBtn.appendChild(iconVideo());
    els.hangupBtn.appendChild(iconPhoneOff());
    els.swapBtn.appendChild(iconSwap());
    els.chatToggleBtn.appendChild(iconChat());
    els.fullscreenBtn.appendChild(iconMaximize());
    els.drawerBtn.appendChild(iconSettings());  // шестерёнка на кнопке drawer

    // Панель комнаты
    els.createBtn.prepend(iconPlus());
    els.joinBtn.prepend(iconJoin());
    els.leaveBtn.prepend(iconLeave());
    els.copyRoomBtn.prepend(iconCopy());

    // Чат
    els.chatSendBtn.innerHTML = '';
    els.chatSendBtn.appendChild(iconSend());

    /* Превью */
    els.previewMicBtn.appendChild(iconMic());
    els.previewCamBtn.appendChild(iconVideo());
}
// ==========================================
// 16. ЗАПУСК
// ==========================================
initIcons();
initTheme();
videoLayout.reset();
controls.reset();
chat.reset();
// Автоподключение при загрузке страницы
ws.connect(els.serverUrlInput.value.trim());

/* Проверяем URL — если есть roomId, автоматически входим в комнату */
const roomIdFromUrl = getRoomIdFromUrl();
if (roomIdFromUrl) {
    els.roomIdInput.value = roomIdFromUrl;
    addStatus(`🔗 Вход по ссылке в комнату: ${roomIdFromUrl}`);
}
