/**
 * preview.js — Компонент превью перед входом в комнату
 */

export function createPreviewComponent({
    previewModal,
    previewVideo,
    previewMicBtn,
    previewCamBtn,
    previewStartBtn,
    previewCancelBtn,
    previewNoCamera,
}) {
    let micEnabled = true;
    let camEnabled = true;
    let onStartCallback = null;

    async function show(action) {
        micEnabled = true;
        camEnabled = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            previewVideo.srcObject = stream;
            previewMicBtn.classList.remove('muted');
            previewCamBtn.classList.remove('muted');
            previewNoCamera.classList.add('hidden');
        } catch (err) {
            throw new Error(`Нет доступа к камере: ${err.message}`);
        }

        previewModal.style.display = 'flex';
        return action;
    }

    function close() {
        if (previewVideo.srcObject) {
            previewVideo.srcObject.getTracks().forEach(t => t.stop());
            previewVideo.srcObject = null;
        }
        previewModal.style.display = 'none';
    }

    function getStream() {
        return previewVideo.srcObject;
    }

    function getMicEnabled() { return micEnabled; }
    function getCamEnabled() { return camEnabled; }

    // Обработчики кнопок превью
    previewMicBtn.addEventListener('click', () => {
        micEnabled = !micEnabled;
        const track = previewVideo.srcObject?.getAudioTracks()[0];
        if (track) track.enabled = micEnabled;
        previewMicBtn.classList.toggle('muted', !micEnabled);
    });

    previewCamBtn.addEventListener('click', () => {
        camEnabled = !camEnabled;
        const track = previewVideo.srcObject?.getVideoTracks()[0];
        if (track) track.enabled = camEnabled;
        previewCamBtn.classList.toggle('muted', !camEnabled);
        previewNoCamera.classList.toggle('hidden', camEnabled);
    });

    previewCancelBtn.addEventListener('click', () => {
        close();
    });

    previewStartBtn.addEventListener('click', () => {
        if (onStartCallback) onStartCallback({
            stream:     previewVideo.srcObject,
            micEnabled,
            camEnabled,
        });
        previewVideo.srcObject = null;
        previewModal.style.display = 'none';
    });

    function onStart(callback) {
        onStartCallback = callback;
    }

    return { show, close, getStream, getMicEnabled, getCamEnabled, onStart };
}
