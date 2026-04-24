/**
 * webrtc.js — Адаптер WebRTC
 * Управляет PeerConnection и DataChannel
 */

const ICE_SERVERS_URL = 'https://gohub.su/api/ice-servers';

async function fetchIceServers() {
    try {
        const res = await fetch(ICE_SERVERS_URL);
        if (!res.ok) throw new Error('Failed to fetch ICE servers');
        const data = await res.json();
        return data.iceServers;
    } catch (e) {
        console.warn('Не удалось получить ICE серверы, используем fallback:', e);
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
}

export function createWebRTCAdapter({ onRemoteStream, onIceCandidate, onDataMessage, onConnectionState }) {
    let pc = null;
    let dataChannel = null;
    let iceCandidateBuffer = [];

    async function init() {
        // Защита от двойного вызова
        if (pc) { pc.close(); pc = null; }

        const iceServers = await fetchIceServers();
        pc = new RTCPeerConnection({ iceServers });

        // DataChannel — создаёт тот кто делает offer
        dataChannel = pc.createDataChannel('chat');
        setupDataChannel(dataChannel);

        // Принимаем DataChannel от собеседника
        pc.ondatachannel = (e) => {
            dataChannel = e.channel;
            setupDataChannel(dataChannel);
        };

        pc.onicecandidate = (e) => {
            if (!e.candidate) return;
            if (!pc.remoteDescription) {
                iceCandidateBuffer.push(e.candidate);
            } else {
                onIceCandidate(e.candidate);
            }
        };

        pc.ontrack = (e) => {
            if (e.streams && e.streams[0]) {
                onRemoteStream(e.streams[0]);
            }
        };

        pc.onconnectionstatechange = () => {
            onConnectionState(pc.connectionState);
        };
    }

    function setupDataChannel(channel) {
        channel.onopen    = () => onDataMessage({ type: 'channel_open' });
        channel.onclose   = () => onDataMessage({ type: 'channel_close' });
        channel.onmessage = (e) => {
            try {
                onDataMessage(JSON.parse(e.data));
            } catch (err) {
                console.warn('Ошибка парсинга сообщения DataChannel:', err);
            }
        };
    }

    function addTracks(stream) {
        if (!stream || !pc) return;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
    }

    async function createOffer() {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        return offer.sdp;
    }

    async function handleOffer(sdpStr) {
        await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'offer', sdp: sdpStr })
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        flushIceBuffer();
        return answer.sdp;
    }

    async function handleAnswer(sdpStr) {
        await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: sdpStr })
        );
        flushIceBuffer();
    }

    async function handleIceCandidate(candidateStr) {
        try {
            await pc.addIceCandidate(
                new RTCIceCandidate(JSON.parse(candidateStr))
            );
        } catch (e) {
            console.warn('Ошибка ICE:', e);
        }
    }

    function flushIceBuffer() {
        while (iceCandidateBuffer.length > 0) {
            onIceCandidate(iceCandidateBuffer.shift());
        }
    }

    function sendData(data) {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(data);
        }
    }

    async function getStats() {
        if (!pc) return null;
        return await pc.getStats();
    }

    function close() {
        iceCandidateBuffer = [];
        if (dataChannel) { dataChannel.close(); dataChannel = null; }
        if (pc) { pc.close(); pc = null; }
    }

    return { init, addTracks, createOffer, handleOffer, handleAnswer, handleIceCandidate, sendData, getStats, close };
}
