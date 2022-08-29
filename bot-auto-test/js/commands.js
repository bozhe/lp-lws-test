var commandData = {
  commands: [],
  responses: [],
  lastId: 0,
  currentIndex: 0,
  currentState: 'hold',
}

/* == HELPERS == */
function toTitleCase(str) {
  return str.replace(/^(.{1})(.*)$/, (a, b, c) => {
    return b.toUpperCase() + (c && c.toLowerCase() || '');
  });
}

function clearCommands() {
  commandData.commands.forEach(c => c.view.containerDiv.remove());
  commandData.commands = [];
}

function saveToJson() {
  const commands = commandData.commands.map(c => { return { command: c.cmd.toJson(), params: c.params }; });
  console.log(commands);
}

/* == Commands == */

// == Base Clases == //
class Command {
  constructor(title, scriptContainer, toolContainer) {
    this.name = title.toLowerCase();
    this.buttonTitle = toTitleCase(title);
    this.commandTitle = title.toUpperCase();
    this.scriptContainer = scriptContainer;
    this.toolContainer = toolContainer;
    this.succesState = 'next';
    this.failedState = 'failed';
    this.defaultParams = {};
  }

  toJson() { return { name: this.name }; }

  createId() { return commandData.lastId += 1; }

  createButtonView () {
    const btn = window.document.createElement('div');
    btn.classList.add('script-window-tool-btn');
    btn.innerText = this.buttonTitle;
    this.toolContainer.appendChild(btn);
    btn.onclick = () => { this.addToScript() };
    return btn;
  }

  createScriptElement(type, commandId, parrent, ...classes) {
    const el = window.document.createElement(type);
    el.dataset.commandId = commandId;
    el.classList.add(...classes);
    el.id = `${classes.join('-')}_${commandId}`;
    parrent.appendChild(el);
    return el;
  }

  createScriptViewContainer (commandId) {
    return this.createScriptElement('div', commandId, this.scriptContainer, 'command-container');
  }

  createScriptCmndControls (parrent, commandId) {
    const container = this.createScriptElement('div', commandId, parrent, 'cmd-controls-container');
    
    const createCtrl = (src, title, onClick) => {
      const btn = this.createScriptElement('div', commandId, container, 'cmd-ctrl-btn', title);
      const img = this.createScriptElement('img', commandId, btn, 'cmd-ctrl-img', title);
      img.setAttribute("src", src);
      btn.onclick = onClick;
    }

    createCtrl("assets/svg/circle-up.svg", "up", () => { this.moveUp(commandId) });
    createCtrl("assets/svg/circle-down.svg", "down",  () => { this.moveDown(commandId) });
    createCtrl("assets/svg/circle-remove.svg", "delete",  () => { this.removeFromScript(commandId) });
  }

  createScriptCmndView (parrent, commandId) {
    const cmnd = this.createScriptElement('div', commandId, parrent, 'cell', 'command');
    cmnd.innerText = this.commandTitle;
    return cmnd;
  }

  createScriptParamsView (parrent, commandId) {
    const prms = this.createScriptElement('div', commandId, parrent, 'cell', 'params');
    prms.innerText = '';
    return prms;
  }

  createScriptView (commandId) {
    const containerDiv = this.createScriptViewContainer(commandId);
    const commandDiv = this.createScriptCmndView(containerDiv, commandId);
    const parametersDiv = this.createScriptParamsView(containerDiv, commandId);
    const controlsDiv = this.createScriptCmndControls(containerDiv, commandId);
    
    return { containerDiv, commandDiv, parametersDiv };
  }

  getScriptItem(commandId) {
    return commandData.commands.find(c => c.commandId == commandId);
  }

  run(scriptItem, chatObject, callback) {
    scriptItem.onSuccess();
    callback(this.succesState);
  }

  moveCommand(indToBeMoved, indToBeInsertBefore) {
    // Move HTML Elements
    const containerToBeMoved = commandData.commands[indToBeMoved].view.containerDiv;
    const containerToInsertBefore = commandData.commands[indToBeInsertBefore].view.containerDiv;
    containerToBeMoved.parentNode.insertBefore(containerToBeMoved, containerToInsertBefore);
    // Move model items
    const element = commandData.commands[indToBeMoved];
    commandData.commands.splice(indToBeMoved, 1);
    commandData.commands.splice(indToBeInsertBefore, 0, element);
  }

  moveUp(commandId) {
    const index = commandData.commands.findIndex(item => item.commandId == commandId);
    if (index === 0) return;
    this.moveCommand(index, index-1);
  }

  moveDown(commandId) {
    const index = commandData.commands.findIndex(item => item.commandId == commandId);
    if (index === commandData.commands.length-1) return;
    this.moveCommand(index+1, index);
  }

  removeFromScript(commandId) {
    const index = commandData.commands.findIndex(item => item.commandId == commandId);
    const container = commandData.commands[index].view.containerDiv;
    commandData.commands.splice(index, 1);
    container.remove();
  }

  addToScript() {
    const commandId = this.createId();
    const view = this.createScriptView(commandId);
    commandData.commands.push({
      commandId,
      cmd: this,
      params: Object.assign({}, this.defaultParams || {}),
      view,
      onFail: () => {
        view.containerDiv.classList.remove('success');
        view.containerDiv.classList.add('failed');
      },
      onSuccess: () => {
        view.containerDiv.classList.add('success');
        view.containerDiv.classList.remove('failed');
      },
      reset: () => {
        view.containerDiv.classList.remove('success');
        view.containerDiv.classList.remove('failed');
      }
    });
  }
}

class UserMessageCmd extends Command {
  constructor(name, scriptContainer, toolContainer) {
    super(name, scriptContainer, toolContainer);
    this.succesState = 'wait';
  }

  run(scriptItem, chatObject, callback) {
    chatObject.sendMessage(scriptItem.params.text);
    scriptItem.onSuccess();
    callback('wait');
  }
}

class ExpectCmd extends Command {
  constructor(name, scriptContainer, toolContainer) {
    super(name, scriptContainer, toolContainer);
  }
  
  checkCondition(scriptItem) {
    return true;
  }

  run(scriptItem, chatObject, callback) {
    if (this.checkCondition(scriptItem)) {
      scriptItem.onSuccess(); callback(this.succesState);
    } else {
      scriptItem.onFail(); callback(this.failedState);
    }
  }
}

// == Implementatoins == //
class ResetCmd extends UserMessageCmd {
  constructor(scriptContainer, toolContainer) {
    super('Reset', scriptContainer, toolContainer);
    this.defaultParams = { text: 'reset' };
  }
}

class SendCmd extends UserMessageCmd {
  constructor(scriptContainer, toolContainer) {
    super('Send', scriptContainer, toolContainer);
  }

  createScriptParamsView(parrent, commandId) {
    const prms = super.createScriptParamsView(parrent, commandId);
    const input = this.createScriptElement('textarea', commandId, prms, 'send-text-command');

    const onChange = () => {
      const scriptItem = this.getScriptItem(commandId);
      scriptItem.params.text = input.text || input.value;
    }

    input.setAttribute('placeholder', 'text');
    input.addEventListener('focusout', () => { onChange() });
    input.addEventListener('keypress', event => { if (event.code === 'Enter') onChange(); });
    return prms;
  }
}

class ExpectTextEqCmd extends ExpectCmd {
  constructor(scriptContainer, toolContainer) {
    super('Expect text equal', scriptContainer, toolContainer);
  }
  
  checkCondition(scriptItem) {
    return !!commandData.responses.find(e => e.message == scriptItem.params.text );
  }

  createScriptParamsView(parrent, commandId) {
    const prms = super.createScriptParamsView(parrent, commandId);
    const input = this.createScriptElement('textarea', commandId, prms, 'expect-text-command');

    const onChange = () => {
      const scriptItem = this.getScriptItem(commandId);
      scriptItem.params.text = input.text || input.value;
    }

    input.setAttribute('placeholder', 'text');
    input.addEventListener('focusout', () => { onChange() });
    input.addEventListener('keypress', event => { if (event.code === 'Enter') onChange(); });
    return prms;
  }
}

class ExpectTextContainsCmd extends ExpectCmd {
  constructor(scriptContainer, toolContainer) {
    super('Expect text contains', scriptContainer, toolContainer);
  }
  
  checkCondition(scriptItem) {
    return !!commandData.responses.find(e => e.message && e.message.indexOf(scriptItem.params.text) >= 0);
  }

  createScriptParamsView(parrent, commandId) {
    const prms = super.createScriptParamsView(parrent, commandId);
    const input = this.createScriptElement('textarea', commandId, prms, 'expect-text-command');

    const onChange = () => {
      const scriptItem = this.getScriptItem(commandId);
      scriptItem.params.text = input.text || input.value;
    }

    input.setAttribute('placeholder', 'text');
    input.addEventListener('focusout', () => { onChange() });
    input.addEventListener('keypress', event => { if (event.code === 'Enter') onChange(); });
    return prms;
  }
}

class ExpectQuickRepliesContainCmd extends ExpectCmd {
  constructor(scriptContainer, toolContainer) {
    super('Expect Quick Reply contains', scriptContainer, toolContainer);
  }
  
  checkCondition(scriptItem) {
    const lastResp = commandData.responses[commandData.responses.length-1];
    return !!(lastResp.quickReplies?.replies || []).find(q => q.title == scriptItem.params.text);
  }

  createScriptParamsView(parrent, commandId) {
    const prms = super.createScriptParamsView(parrent, commandId);
    const input = this.createScriptElement('textarea', commandId, prms, 'expect-qr-command');

    const onChange = () => {
      const scriptItem = this.getScriptItem(commandId);
      scriptItem.params.text = input.text || input.value;
    }

    input.setAttribute('placeholder', 'title');
    input.addEventListener('focusout', () => { onChange() });
    input.addEventListener('keypress', event => { if (event.code === 'Enter') onChange(); });
    return prms;
  }
}

class ExpectQuickRepliesCountCmd extends ExpectCmd {
  constructor(scriptContainer, toolContainer) {
    super('Expect quick replies count', scriptContainer, toolContainer);
  }
  
  checkCondition(scriptItem) {
    const lastResp = commandData.responses[commandData.responses.length-1];
    const count = (lastResp.quickReplies?.replies || []).length;
    const success = count == scriptItem.params.count;
    if (!success) console.error(`Expected QR count ${scriptItem.params.count}, received ${count}`);
    return success;
  }

  createScriptParamsView(parrent, commandId) {
    const prms = super.createScriptParamsView(parrent, commandId);
    const input = this.createScriptElement('input', commandId, prms, 'expect-qr-command');

    const onChange = () => {
      const scriptItem = this.getScriptItem(commandId);
      scriptItem.params.count = input.text || input.value;
    }

    input.setAttribute('placeholder', 'number');
    input.addEventListener('focusout', () => { onChange() });
    input.addEventListener('keypress', event => { if (event.code === 'Enter') onChange(); });
    return prms;
  }
}