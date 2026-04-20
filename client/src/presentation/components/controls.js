/**
 * controls.js — Компонент кнопок управления звонком
 */

export function createControlsComponent({
    micBtn,
    camBtn,
    hangupBtn,
    swapBtn,
    fullscreenBtn,
    chatToggleBtn,
    volumeSlider,
    mainVideo,
}) {

    function setMicState(enabled) {
        micBtn.classList.toggle('muted', !enabled);
    }

    function setCamState(enabled) {
        camBtn.classList.toggle('muted', !enabled);
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

    function onFullscreenClick(appContainer) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                appContainer.requestFullscreen();
                fullscreenBtn.textContent = '✕';
                fullscreenBtn.title = 'Выйти из полного экрана';
            } else {
                document.exitFullscreen();
                fullscreenBtn.textContent = '⛶';
                fullscreenBtn.title = 'Полный экран';
            }
        });
    }

    function onVolumeChange() {
        volumeSlider.addEventListener('input', () => {
            if (mainVideo) mainVideo.volume = volumeSlider.value / 100;
        });
    }

    function reset() {
        micBtn.classList.remove('muted');
        camBtn.classList.remove('muted');
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
        onFullscreenClick,
        onVolumeChange,
        reset,
    };
}
