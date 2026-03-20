// Chat page logic

let chatHistory = [];

// Initialize chat page
async function initChatPage() {
  const session = await requireAuth();
  if (!session) return;

  initChatForm();
}

// Initialize chat form
function initChatForm() {
  const form = document.getElementById('chat-form');
  form?.addEventListener('submit', handleChatSubmit);

  // Allow Enter to send
  const input = document.getElementById('chat-input');
  input?.focus();
}

// Handle chat submit
async function handleChatSubmit(e) {
  e.preventDefault();

  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  // Add user message to UI
  appendMessage('user', message);
  input.value = '';

  // Show typing indicator
  const typingEl = showTypingIndicator();

  // Add to history
  chatHistory.push({ role: 'user', content: message });

  try {
    const response = await chatApi.send(message, chatHistory.slice(-10));

    // Remove typing indicator
    typingEl.remove();

    // Add assistant message
    appendMessage('assistant', response.reply);
    chatHistory.push({ role: 'assistant', content: response.reply });

  } catch (error) {
    typingEl.remove();
    appendMessage('assistant', 'Sorry, I had trouble processing that. Please try again.');
    console.error('Chat error:', error);
  }
}

// Append message to chat
function appendMessage(role, content) {
  const container = document.getElementById('chat-messages');
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${role}`;
  messageEl.innerHTML = `<div class="chat-bubble">${escapeHtml(content)}</div>`;
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-message assistant typing';
  typingEl.innerHTML = `
    <div class="chat-bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  container.appendChild(typingEl);
  container.scrollTop = container.scrollHeight;
  return typingEl;
}

// Helper
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize
initChatPage();
