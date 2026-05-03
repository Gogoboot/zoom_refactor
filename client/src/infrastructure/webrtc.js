/**
 * webrtc.js — Адаптер WebRTC (Perfect Negotiation)
 */
export function createWebRTCAdapter({
  onRemoteStream,
  onIceCandidate,
  onLocalDescription,
  onDataMessage,
  onDataChannelMessage,
  onConnectionState,
  token,
  serverUrl,
}) {
  async function fetchIceServers() {
    try {
      const url = `${serverUrl}/api/ice-servers`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.iceServers;
    } catch (e) {
      console.warn("Не удалось получить ICE серверы, используем fallback:", e);
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  }

  let pc = null;
  let dataChannel = null;
  let iceCandidateBuffer = [];
  let makingOffer = false;
  let isPolite = false;
  let remoteStream = null;

  async function init() {
    if (pc) {
      pc.close();
      pc = null;
    }

    makingOffer = false;
    isPolite = false;
    remoteStream = new MediaStream();

    const iceServers = await fetchIceServers();
    pc = new RTCPeerConnection({ iceServers });

    dataChannel = pc.createDataChannel("chat");
    setupDataChannel(dataChannel);

    pc.ondatachannel = (e) => {
      dataChannel = e.channel;
      setupDataChannel(dataChannel);
    };

    // Perfect Negotiation: автоматический offer при изменении медиа
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        onLocalDescription({ type: "offer", sdp: pc.localDescription.sdp });
      } catch (e) {
        console.error("onnegotiationneeded error:", e);
      } finally {
        makingOffer = false;
      }
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      if (!pc.remoteDescription) {
        iceCandidateBuffer.push(e.candidate);
      } else {
        onIceCandidate(e.candidate);
      }
    };

    // Собираем remoteStream вручную — e.streams[0] пустой при recvonly
    pc.ontrack = (e) => {
      console.log("ONTRACK:", e.track.kind);
      remoteStream.addTrack(e.track);
      onRemoteStream(remoteStream);
    };

    pc.onconnectionstatechange = () => {
      console.log("STATE", pc.connectionState);
      onConnectionState(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE STATE", pc.iceConnectionState);
      if (
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed"
      ) {
        pc.getStats().then((report) => {
          report.forEach((pair) => {
            if (
              pair.type === "candidate-pair" &&
              pair.state === "succeeded" &&
              pair.nominated
            ) {
              let localCandidate = null;
              let remoteCandidate = null;
              report.forEach((r) => {
                if (r.id === pair.localCandidateId) localCandidate = r;
                if (r.id === pair.remoteCandidateId) remoteCandidate = r;
              });
              console.log("LOCAL CANDIDATE", localCandidate);
              console.log("REMOTE CANDIDATE", remoteCandidate);
            }
          });
        });
      }
    };
  }

  function setupDataChannel(channel) {
    channel.binaryType = "arraybuffer";
    channel.onopen = () => onDataMessage({ type: "channel_open" });
    channel.onclose = () => onDataMessage({ type: "channel_close" });
    channel.onmessage = (e) => {
      const result = onDataChannelMessage(e.data);
      if (result !== undefined) {
        onDataMessage(result);
      }
    };
  }

  function addTracks(stream) {
    if (!stream || !pc) return;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    // addTrack триггерит onnegotiationneeded автоматически
  }

  // Вызывается если нет камеры — гарантирует что SDP содержит медиа секции
  function ensureReceive() {
    if (!pc) return;
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });
    // addTransceiver триггерит onnegotiationneeded автоматически
  }

  // Устанавливает роль для Perfect Negotiation
  function setRole(role) {
    isPolite = role === "polite";
    console.log("ROLE:", role, "isPolite:", isPolite);
  }

  async function handleOffer(sdpStr) {
    const offerCollision = makingOffer || pc.signalingState !== "stable";

    if (!isPolite && offerCollision) {
      console.warn("Impolite: ignoring colliding offer");
      return;
    }

    await pc.setRemoteDescription({ type: "offer", sdp: sdpStr });
    await pc.setLocalDescription();
    flushIceBuffer();
    // answer уходит через onnegotiationneeded? Нет — answer генерируем здесь
    onLocalDescription({ type: "answer", sdp: pc.localDescription.sdp });
  }

  async function handleAnswer(sdpStr) {
    await pc.setRemoteDescription({ type: "answer", sdp: sdpStr });
    flushIceBuffer();
  }

  async function handleIceCandidate(candidateStr) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidateStr)));
    } catch (e) {
      console.warn("Ошибка ICE:", e);
    }
  }

  function flushIceBuffer() {
    while (iceCandidateBuffer.length > 0) {
      onIceCandidate(iceCandidateBuffer.shift());
    }
  }

  function sendData(data) {
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(data);
    }
  }

  async function getStats() {
    if (!pc) return null;
    return await pc.getStats();
  }

  function close() {
    iceCandidateBuffer = [];
    remoteStream = null;
    makingOffer = false;
    isPolite = false;
    if (dataChannel) {
      dataChannel.close();
      dataChannel = null;
    }
    if (pc) {
      pc.close();
      pc = null;
    }
  }

  // Явный триггер negotiation — нужен когда треки добавлены до появления remote peer
  async function triggerNegotiation() {
    if (!pc) return;
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      onLocalDescription({ type: "offer", sdp: pc.localDescription.sdp });
    } catch (e) {
      console.error("triggerNegotiation error:", e);
    } finally {
      makingOffer = false;
    }
  }

  return {
    init,
    addTracks,
    getBufferedAmount: () => dataChannel?.bufferedAmount ?? 0,
    ensureReceive,
    setRole,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    sendData,
    getStats,
    triggerNegotiation,
    close,
  };
}
