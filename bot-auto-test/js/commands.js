var commandData = {
  commands: [],
  responses: [],
  lastId: 0,
  currentIndex: 0,
  currentState: 'hold',
}


function toTitleCase(str) {
  return str.replace(/^(.{1})(.*)$/, (a, b, c) => {
    return b.toUpperCase() + (c && c.toLowerCase() || '');
  });
}

class Command {
  constructor(title, scriptContainer, toolContainer) {
    this.name = title.toLowerCase();
    this.buttonTitle = toTitleCase(title);
    this.commandTitle = title.toUpperCase();
    this.scriptContainer = scriptContainer;
    this.toolContainer = toolContainer;
  }

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
    
    const createCtrl = (src, ...classes) => {
      const btn = this.createScriptElement('div', commandId, container, 'cmd-ctrl-btn', ...classes);
      const img = this.createScriptElement('img', commandId, btn, 'cmd-ctrl-img', ...classes);
      img.setAttribute("src", src);
    }

    createCtrl("assets/svg/circle-up.svg", "up");
    createCtrl("assets/svg/circle-down.svg", "down");
    createCtrl("assets/svg/circle-remove.svg", "delete");
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

  run(scriptItem, chatObject,callback) {
    console.log(scriptItem.cmd.name, scriptItem.params);
    callback('next');
  }

  addToScript() {
    const commandId = this.createId();
    const view = this.createScriptView(commandId);
    commandData.commands.push({
      commandId,
      cmd: this,
      params: {},
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

class ResetCmd extends Command {
  constructor(scriptContainer, toolContainer) {
    super('Reset', scriptContainer, toolContainer);
  }
  
  run(scriptItem, chatObject,callback) {
    chatObject.sendMessage('reset');
    scriptItem.onSuccess();
    callback('wait');
  }
}

class SendCmd extends Command {
  constructor(scriptContainer, toolContainer) {
    super('Send', scriptContainer, toolContainer);
  }
  
  run(scriptItem, chatObject,callback) {
    chatObject.sendMessage(scriptItem.params.text);
    scriptItem.onSuccess();
    callback('wait');
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

class ExpectTextEqCmd extends Command {
  constructor(scriptContainer, toolContainer) {
    super('Expect text equal', scriptContainer, toolContainer);
  }
  
  run(scriptItem, chatObject, callback) {
    const msg = commandData.responses.find(e => e.message == scriptItem.params.text );
    if (msg) {
      scriptItem.onSuccess();
      callback('next');
    } else {
      scriptItem.onFail();
      callback('failed');
    }
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

class ExpectTextContainsCmd extends Command {
  constructor(scriptContainer, toolContainer) {
    super('Expect text contains', scriptContainer, toolContainer);
  }
  
  run(scriptItem, chatObject, callback) {
    const msg = commandData.responses.find(e => e.message && e.message.indexOf(scriptItem.params.text) >= 0);
    if (msg) {
      scriptItem.onSuccess();
      callback('next');
    } else {
      scriptItem.onFail();
      callback('failed');
    }
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

class ExpectQuickRepliesContainCmd extends Command {
  constructor(scriptContainer, toolContainer) {
    super('Expect Quick Reply contains', scriptContainer, toolContainer);
  }
  
  run(scriptItem, chatObject, callback) {
    const lastResp = commandData.responses[commandData.responses.length-1];
    const success = !!(lastResp.quickReplies?.replies || []).find(q => q.title == scriptItem.params.text);
    if (success) {
      scriptItem.onSuccess();
      callback('next');
    } else {
      scriptItem.onFail();
      callback('failed');
    }
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



class ExpectQuickRepliesCountCmd extends Command {
  constructor(scriptContainer, toolContainer) {
    super('Expect quick replies count', scriptContainer, toolContainer);
  }
  
  run(scriptItem, chatObject, callback) {
    const lastResp = commandData.responses[commandData.responses.length-1];
    const count = (lastResp.quickReplies?.replies || []).length;
    const success = count == scriptItem.params.count;
    if (success) {
      scriptItem.onSuccess();
      callback('next');
    } else {
      scriptItem.onFail();
      console.error(`Expected QR count ${scriptItem.params.count}, received ${count}`);
      callback('failed');
    }
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