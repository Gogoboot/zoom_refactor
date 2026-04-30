/**
 * webrtc.js — Адаптер WebRTC
 * Управляет PeerConnection и DataChannel
 */

const ICE_SERVERS_URL = "https://gohub.su/api/ice-servers";

async function fetchIceServers() {
  try {
    const res = await fetch(ICE_SERVERS_URL);
    if (!res.ok) throw new Error("Failed to fetch ICE servers");
    const data = await res.json();
    return data.iceServers;
  } catch (e) {
    console.warn("Не удалось получить ICE серверы, используем fallback:", e);
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

export function createWebRTCAdapter({
  onRemoteStream,
  onIceCandidate,
  onDataMessage,
  onConnectionState,
}) {
  let pc = null;
  let dataChannel = null;
  let iceCandidateBuffer = [];

  async function init() {
    // Защита от двойного вызова
    if (pc) {
      pc.close();
      pc = null;
    }

    const iceServers = await fetchIceServers();
    pc = new RTCPeerConnection({ iceServers });

    // если нет медиа — создаём "пустой" transceiver
    pc.addTransceiver("video", { direction: "recvonly" });

    // DataChannel — создаёт тот кто делает offer
    dataChannel = pc.createDataChannel("chat");
    setupDataChannel(dataChannel);

    // Принимаем DataChannel от собеседника
    pc.ondatachannel = (e) => {
      dataChannel = e.channel;
      setupDataChannel(dataChannel);
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;

      console.log("ICE", e.candidate.candidate);

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
              console.log("ACTIVE PAIR", pair);

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

  let incomingFiles = {};
  function setupDataChannel(channel) {
    channel.onopen = () => onDataMessage({ type: "channel_open" });
    channel.onclose = () => onDataMessage({ type: "channel_close" });
    channel.onmessage = (e) => {
      console.log("RAW MESSAGE RECEIVED", e.data);
      try {
        const msg = JSON.parse(e.data);

        // === ФАЙЛ: meta ===
        if (msg.type === "file_meta") {
          incomingFiles[msg.id] = {
            name: msg.name,
            chunks: [],
          };
          return;
        }

        // === ФАЙЛ: chunk ===
        if (msg.type === "file_chunk") {
          incomingFiles[msg.id].chunks.push(new Uint8Array(msg.chunk));
          return;
        }

        // === ФАЙЛ: завершение ===
        if (msg.type === "file_end") {
          const file = incomingFiles[msg.id];

          const blob = new Blob(file.chunks);
          const url = URL.createObjectURL(blob);

          onDataMessage({
            type: "file",
            name: file.name,
            url,
          });

          delete incomingFiles[msg.id];
          return;
        }

        // === обычные сообщения ===
        onDataMessage(msg);
      } catch (err) {
        console.warn("Ошибка DataChannel:", err);
      }
    };
  }

  function addTracks(stream) {
    if (!stream || !pc) return;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  }

  async function createOffer() {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer.sdp;
  }

  async function handleOffer(sdpStr) {
    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: "offer", sdp: sdpStr }),
    );
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    flushIceBuffer();
    return answer.sdp;
  }

  async function handleAnswer(sdpStr) {
    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: "answer", sdp: sdpStr }),
    );
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

  

  async function sendFile(file) {
    console.log("SEND FILE START", file.name);
    const chunkSize = 16 * 1024;
    const id = crypto.randomUUID();

    // meta
    dataChannel.send(
      JSON.stringify({
        type: "file_meta",
        id,
        name: file.name,
        size: file.size,
      }),
    );

    let offset = 0;

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      const buffer = await chunk.arrayBuffer();

      dataChannel.send(
        JSON.stringify({
          type: "file_chunk",
          id,
          chunk: Array.from(new Uint8Array(buffer)), // простой вариант
        }),
      );

      offset += chunkSize;
    }

    // 3. конец
    dataChannel.send(
      JSON.stringify({
        type: "file_end",
        id,
      }),
    );
    console.log("SEND CHUNK", offset);
  }

  async function getStats() {
    if (!pc) return null;
    return await pc.getStats();
  }

  function close() {
    iceCandidateBuffer = [];
    if (dataChannel) {
      dataChannel.close();
      dataChannel = null;
    }
    if (pc) {
      pc.close();
      pc = null;
    }
  }

  return {
    init,
    addTracks,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    sendData,
    getStats,
    sendFile,
    close,
  };
}
