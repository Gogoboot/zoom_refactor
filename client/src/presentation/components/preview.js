/* preview.js — Компонент превью перед входом в комнату */

/* Иконки для кнопок микрофона и камеры */
import { iconMic, iconMicOff, iconVideo, iconVideoOff } from '../../infrastructure/icons.js';

export function createPreviewComponent({
  previewModal,
  previewVideo,
  previewMicBtn,
  previewCamBtn,
  previewStartBtn,
  previewCancelBtn,
  previewNoCamera,

  modeVideoBtn,
  modeAudioBtn,
  modeDataBtn,
}) {
  let micEnabled = true;
  let camEnabled = true;
  let onStartCallback = null;
  let mode = 'video';

  async function show(action) {
    micEnabled = true;
    camEnabled = true;

let stream = null;

try {
  stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  previewVideo.srcObject = stream;
  previewNoCamera.classList.add("hidden");

} catch (err) {
  console.warn("Нет доступа к медиа:", err);

  previewVideo.srcObject = null;
  previewNoCamera.classList.remove("hidden");
}

    previewModal.style.display = "flex";
    return action;
  }

  function close() {
    if (previewVideo.srcObject) {
      previewVideo.srcObject.getTracks().forEach((t) => t.stop());
      previewVideo.srcObject = null;
    }
    previewModal.style.display = "none";
  }

  function getStream() {
    return previewVideo.srcObject;
  }

  function getMicEnabled() {
    return micEnabled;
  }
  function getCamEnabled() {
    return camEnabled;
  }

  
  // Обработчики кнопок превью
  /* Микрофон — переключение с иконкой */
  previewMicBtn.addEventListener("click", () => {
    micEnabled = !micEnabled;
    const track = previewVideo.srcObject?.getAudioTracks()[0];
    if (track) track.enabled = micEnabled;
    previewMicBtn.classList.toggle("btn-control--muted", !micEnabled);
    /* Меняем иконку */
    previewMicBtn.innerHTML = "";
    previewMicBtn.appendChild(micEnabled ? iconMic() : iconMicOff());
  });

  /* Камера — переключение с иконкой */
  previewCamBtn.addEventListener("click", () => {
    camEnabled = !camEnabled;
    const track = previewVideo.srcObject?.getVideoTracks()[0];
    if (track) track.enabled = camEnabled;
    previewCamBtn.classList.toggle("btn-control--muted", !camEnabled);
    previewNoCamera.classList.toggle("hidden", camEnabled);
    /* Меняем иконку */
    previewCamBtn.innerHTML = "";
    previewCamBtn.appendChild(camEnabled ? iconVideo() : iconVideoOff());
  });

  previewCancelBtn.addEventListener("click", () => {
    close();
  });

  previewStartBtn.addEventListener("click", () => {
    if (onStartCallback)
      onStartCallback({
        stream: previewVideo.srcObject,
        micEnabled,
        camEnabled,
      });
    previewVideo.srcObject = null;
    previewModal.style.display = "none";
  });

  function onStart(callback) {
    onStartCallback = callback;
  }

  return { show, close, getStream, getMicEnabled, getCamEnabled, onStart };
}
