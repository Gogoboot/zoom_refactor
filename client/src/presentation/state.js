/**
 * state.js — Состояние UI приложения
 * Единое место где хранится всё что нужно UI
 */

export function createAppState() {
    let state = {
        room:               null,   // объект Room из domain
        remoteParticipant:  null,   // объект Participant из domain
        localStream:        null,   // MediaStream локальный
        remoteStream:       null,   // MediaStream удалённый
        isConnected:        false,  // подключён к WebSocket
        isInRoom:           false,  // находится в комнате
    };

    function get() {
        return { ...state }; // возвращаем копию — никто не меняет напрямую
    }

    function set(partial) {
        state = { ...state, ...partial };
    }

    function reset() {
        state = {
            room:              null,
            remoteParticipant: null,
            localStream:       null,
            remoteStream:      null,
            isConnected:       false,
            isInRoom:          false,
        };
    }

    return { get, set, reset };
}
