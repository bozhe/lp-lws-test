
function getChatWindowContainer() {
  return window.document.getElementById('chat-window-content');
}

/**
 * @param {string} className 
 * @param {string} elementType 
 * @returns {HTMLElement}
 */
function createElementWithClass(className, elementType) {
  const el = window.document.createElement(elementType || 'div');
  el.classList.add(className);
  return el;
}

function createTextMsg(msg, bot) {
  const msgText = createElementWithClass(bot ? "chat-bot-msg-text" : "chat-user-msg-text");
  if (/ERROR/.test(msg)) msgText.classList.add('error');
  if (/^DBG:/.test(msg)) msgText.classList.add('debug');
  msgText.innerHTML = msg;
  msgText.ondblclick = (e) => { e.preventDefault(); copyTextToClipboard(msg, 'Message');};
  return msgText
}

function createMsgContainer() { return createElementWithClass('msg-container'); }
function createQRsContainer() { return createElementWithClass('chat-bot-msg-qrs'); }

function creareQuickReply(title) { 
  const qr = createElementWithClass('quick-reply');
  qr.innerText = title;
  qr.ondblclick = () => { copyTextToClipboard(title, 'QR Title'); };
  return qr;
}

function appendMessage(element) {
  const cwc = getChatWindowContainer();
  cwc.appendChild(element);
  cwc.scroll(0, cwc.scrollHeight);
}

function onUserMessage(msg) { 
  const msgContainer = createMsgContainer();
  msgContainer.appendChild(createTextMsg(msg, false));
  appendMessage(msgContainer);
}

function onBotTextMessage(msg, quickReplies) { 
  const msgContainer = createMsgContainer();
  msgContainer.appendChild(createTextMsg(msg, true));
  if (quickReplies && quickReplies.length) {
    const qrContainer = createQRsContainer();
    quickReplies.forEach(qr => qrContainer.appendChild(creareQuickReply(qr)));
    msgContainer.appendChild(qrContainer);
  }
  appendMessage(msgContainer);
}

function onBotImage(url) {
  const msgContainer = createMsgContainer();
  const img = createElementWithClass('chat-bot-msg-image', 'img');
  img.setAttribute('src', url);
  msgContainer.appendChild(img);
  appendMessage(msgContainer)
}

function onBotReachContent(content) {
  const json = JSON.stringify(content).replace(/,?"target":"blank"/ig, '');
  try {
    const msgContainer = createMsgContainer();
    msgContainer.appendChild(JsonPollock.render(json));
    appendMessage(msgContainer);
  } catch(e) {
    console.log(e.message);    // error message
    console.log(e.errors);     // validation errors
  }
}