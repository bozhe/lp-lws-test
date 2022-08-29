function buildCommands() {
  const scriptContainer = window.document.getElementById('script-window-content');
  const toolContainer = window.document.getElementById('script-window-buttons-command');
  const commands = [
    new ResetCmd(scriptContainer, toolContainer),
    new SendCmd(scriptContainer, toolContainer),
    new ExpectTextEqCmd(scriptContainer, toolContainer),
    new ExpectTextContainsCmd(scriptContainer, toolContainer),
    new ExpectQuickRepliesContainCmd(scriptContainer, toolContainer),
    new ExpectQuickRepliesCountCmd(scriptContainer, toolContainer),
  ]
  commands.forEach(c => c.createButtonView())
}

function buildSystemButtons() {
  const systemContainer = window.document.getElementById('script-window-buttons-system');
  
  function createBtn(title, onClick) {
    const btn = window.document.createElement('div');
    btn.classList.add('script-window-tool-btn', title.toLowerCase());
    btn.innerText = title;
    systemContainer.appendChild(btn);
    btn.onclick = onClick;
  }

  createBtn('Run', () => { runCommands(); });
  createBtn('Clear', () => { clearCommands(); });
  createBtn('Save', () => { saveToJson() });
  createBtn('Load', () => { alert('TODO:') });
  createBtn('Stop', () => { alert('TODO:') });
  
}