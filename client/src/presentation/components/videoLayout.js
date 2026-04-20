/**
 * videoLayout.js — Компонент раскладки видео (Main + PiP)
 */

export function createVideoLayout({ mainVideo, pipVideo, pipOverlay }) {
    let isRemoteOnMain = true;

    function update({ localStream, remoteStream }) {
        const hasLocal  = !!localStream;
        const hasRemote = !!remoteStream;

        if (hasLocal && hasRemote) {
            mainVideo.srcObject = isRemoteOnMain ? remoteStream : localStream;
            pipVideo.srcObject  = isRemoteOnMain ? localStream  : remoteStream;
            pipOverlay.classList.remove('hidden');
        } else if (hasLocal) {
            mainVideo.srcObject = localStream;
            pipVideo.srcObject  = null;
            pipOverlay.classList.add('hidden');
            isRemoteOnMain = true;
        } else {
            mainVideo.srcObject = null;
            pipVideo.srcObject  = null;
            pipOverlay.classList.add('hidden');
        }
    }

    function swap() {
        isRemoteOnMain = !isRemoteOnMain;
        return isRemoteOnMain;
    }

    function reset() {
        mainVideo.srcObject = null;
        pipVideo.srcObject  = null;
        pipOverlay.classList.add('hidden');
        isRemoteOnMain = true;
    }

    return { update, swap, reset };
}
