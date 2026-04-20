/**
 * chat.js — Компонент чата
 */

export function createChatComponent({ chatMessages, chatInput, chatSendBtn, chatPanel, chatToggleBtn }) {

    function addMessage({ text, isOwn = false, sender = '', timestamp = new Date() }) {
        // Убираем системное сообщение при первом реальном сообщении
        const systemMsg = chatMessages.querySelector('.chat-message--system');
        if (systemMsg) systemMsg.remove();

        const wrapper = document.createElement('div');
        wrapper.className = `chat-message ${isOwn ? 'chat-message--own' : ''}`;

        const meta = document.createElement('div');
        meta.className = 'chat-message-meta';
        meta.textContent = isOwn
            ? new Date(timestamp).toLocaleTimeString()
            : `${sender} · ${new Date(timestamp).toLocaleTimeString()}`;

        const content = document.createElement('div');
        content.textContent = text;

        wrapper.appendChild(meta);
        wrapper.appendChild(content);
        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-message chat-message--system';
        div.textContent = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function toggle() {
        const isHidden = chatPanel.classList.toggle('hidden');
        chatToggleBtn.classList.toggle('active', !isHidden);
    }

    function enableInput(enabled) {
        chatSendBtn.disabled = !enabled;
        chatInput.disabled   = !enabled;
    }

    function reset() {
        chatMessages.innerHTML = '<div class="chat-message chat-message--system">Чат начнётся когда собеседник подключится</div>';
        chatInput.value = '';
        enableInput(false);
    }

    function getValue() {
        return chatInput.value.trim();
    }

    function clearInput() {
        chatInput.value = '';
    }

    return { addMessage, addSystemMessage, toggle, enableInput, reset, getValue, clearInput };
}
