/**
 * fileTransfer.js — Use case передачи файлов
 * Знает о протоколе передачи, не знает о DataChannel и UI
 */

const CHUNK_SIZE = 16 * 1024; // 16KB
const BUFFER_THRESHOLD = 256 * 1024; // 256KB — пауза при переполнении
const BUFFER_CHECK_INTERVAL = 50; // ms

export function createFileTransfer({
  sendData,
  getBufferedAmount,
  onProgress,
  onFileReceived,
  onError,
}) {
  // Входящие файлы: id → { name, size, received, chunks[] }
  const incoming = new Map();

  // Ждём пока буфер освободится
  async function waitForBuffer() {
    while (getBufferedAmount() > BUFFER_THRESHOLD) {
      await new Promise((resolve) =>
        setTimeout(resolve, BUFFER_CHECK_INTERVAL)
      );
    }
  }

  async function send(file) {
    const id = crypto.randomUUID();

    // Отправляем метаданные текстом
    sendData(
      JSON.stringify({
        type: "file_meta",
        id,
        name: file.name,
        size: file.size,
      })
    );

    let offset = 0;

    while (offset < file.size) {
      // Пауза если буфер переполнен
      await waitForBuffer();

      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunk.arrayBuffer();

      // Отправляем заголовок чанка текстом
      sendData(JSON.stringify({ type: "file_chunk_meta", id, offset }));

      // Отправляем бинарные данные напрямую
      sendData(buffer);

      offset += buffer.byteLength;

      const percent = Math.round((offset / file.size) * 100);
      onProgress({ id, name: file.name, percent, direction: "upload" });
    }

    // Конец передачи
    sendData(JSON.stringify({ type: "file_end", id }));
  }

  function receive(data) {
    // Бинарные данные — это чанк файла
    if (data instanceof ArrayBuffer) {
      // Ищем файл который ждёт бинарный чанк
      for (const [id, file] of incoming) {
        if (file.pendingChunk) {
          file.chunks.push(new Uint8Array(data));
          file.received += data.byteLength;
          file.pendingChunk = false;

          const percent = Math.round((file.received / file.size) * 100);
          onProgress({ id, name: file.name, percent, direction: "download" });
          return;
        }
      }
      return;
    }

    // Текстовые данные — JSON метаданные
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      return; // не наше сообщение
    }

    if (msg.type === "file_meta") {
      incoming.set(msg.id, {
        name: msg.name,
        size: msg.size,
        received: 0,
        chunks: [],
        pendingChunk: false,
      });
      onProgress({ id: msg.id, name: msg.name, percent: 0, direction: "download" });
      return;
    }

    if (msg.type === "file_chunk_meta") {
      const file = incoming.get(msg.id);
      if (!file) {
        console.warn("file_chunk_meta без file_meta:", msg.id);
        return;
      }
      file.pendingChunk = true;
      return;
    }

    if (msg.type === "file_end") {
      const file = incoming.get(msg.id);
      if (!file) {
        console.warn("file_end без file_meta:", msg.id);
        return;
      }
      const blob = new Blob(file.chunks);
      onFileReceived({ name: file.name, blob });
      incoming.delete(msg.id);
      return;
    }

    // Не файловое сообщение — возвращаем null чтобы main.js обработал
    return msg;
  }

  return { send, receive };
}
