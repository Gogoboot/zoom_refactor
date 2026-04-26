/**
 * controls.js — Компонент кнопок управления звонком
 */

/* Иконки для переключения состояния */
import { iconMic, iconMicOff, iconVideo, iconVideoOff, iconMaximize, iconMinimize } from '../../infrastructure/icons.js';

export function createControlsComponent({
    micBtn,
    camBtn,
    hangupBtn,
    swapBtn,
    fullscreenBtn,
    chatToggleBtn,
    drawerBtn,        // кнопка открытия drawer (шестерёнка)
    volumeSlider,
    mainVideo,
}) {

    function setMicState(enabled) {
        micBtn.classList.toggle('btn-control--muted', !enabled);
        micBtn.innerHTML = '';
        micBtn.appendChild(enabled ? iconMic() : iconMicOff());
    }

    function setCamState(enabled) {
        camBtn.classList.toggle('btn-control--muted', !enabled);
        camBtn.innerHTML = '';
        camBtn.appendChild(enabled ? iconVideo() : iconVideoOff());
    }

    function enableMediaControls(enabled) {
        micBtn.disabled    = !enabled;
        camBtn.disabled    = !enabled;
        hangupBtn.disabled = !enabled;
    }

    function enableCallControls(enabled) {
        swapBtn.disabled = !enabled;
    }

    function onMicClick(callback) {
        micBtn.addEventListener('click', callback);
    }

    function onCamClick(callback) {
        camBtn.addEventListener('click', callback);
    }

    function onHangupClick(callback) {
        hangupBtn.addEventListener('click', callback);
    }

    function onSwapClick(callback) {
        swapBtn.addEventListener('click', callback);
    }

    function onChatToggleClick(callback) {
        chatToggleBtn.addEventListener('click', callback);
    }
    // Вешаем обработчик на кнопку drawer (шестерёнка)
    function onDrawerClick(callback) {
        drawerBtn.addEventListener('click', callback);
    }

    function onFullscreenClick(appContainer) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                appContainer.requestFullscreen();
                fullscreenBtn.innerHTML = '';
                fullscreenBtn.appendChild(iconMinimize());
            } else {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '';
                fullscreenBtn.appendChild(iconMaximize());
            }
        });
    }

    function onVolumeChange() {
        volumeSlider.addEventListener('input', () => {
            if (mainVideo) mainVideo.volume = volumeSlider.value / 100;
        });
    }

    function reset() {
        micBtn.classList.remove('btn-control--muted');
        camBtn.classList.remove('btn-control--muted');
        enableMediaControls(false);
        enableCallControls(false);
    }

    return {
        setMicState,
        setCamState,
        enableMediaControls,
        enableCallControls,
        onMicClick,
        onCamClick,
        onHangupClick,
        onSwapClick,
        onChatToggleClick,
        onDrawerClick, 
        onFullscreenClick,
        onVolumeChange,
        reset,
    };
}
