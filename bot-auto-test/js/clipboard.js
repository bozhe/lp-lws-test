function getOrCreateClipboardTextArea() {
  let textarea = window.document.getElementById('clipboard');
  if (!textarea) {
    textarea = window.document.createElement('textarea');
    textarea.id = 'clipboard';
    textarea.name = 'clipboard';
    textarea.classList.add('hidden');
  }
  return textarea;
}

function getOrCreateCBAnimation() {
  let container = window.document.getElementById('popup-container-copied');
  let message = window.document.getElementById('popup-message-copied');
  if (!container) {
    container = window.document.createElement('div');
    container.id = 'popup-container-copied';
    container.classList.add('popup-container-copied');
    window.document.body.appendChild(container);
    
    message = window.document.createElement('div');
    message.id = 'popup-message-copied';
    message.classList.add('popup-message-copied');
    container.appendChild(message);
  }
  return { container, message }
}

function showCBAnimation(type) {
  const { container, message } = getOrCreateCBAnimation()
  message.innerText = `${type || ''} coppied!`;
  container.style.display = 'block';
  setTimeout(() => { container.style.opacity = 1; }, 10);
  setTimeout(() => { container.style.opacity = 0; }, 700);
  setTimeout(() => { container.style.display = 'none' }, 1000);
}

function copyTextToClipboard(text, type) {
  getOrCreateClipboardTextArea().select();
  navigator.clipboard.writeText(text);
  showCBAnimation(type);
}
