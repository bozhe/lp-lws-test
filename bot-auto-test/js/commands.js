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

  createTextArea(parrent, commandId, paramName) {
    const div = this.createScriptElement('div', commandId, parrent, 'cell');
    const input = this.createScriptElement('textarea', commandId, div);
    
    const onChange = () => {
      const scriptItem = this.getScriptItem(commandId);
      scriptItem.params[paramName] = input.text || input.value;
    }

    input.setAttribute('placeholder', 'text');
    input.addEventListener('focusout', () => { onChange() });
    input.addEventListener('keypress', event => { if (event.code === 'Enter') onChange(); });

    return input
  }

  createCheckBox(parrent, commandId, paramName, label, checked) {
    const div = this.createScriptElement('div', commandId, parrent, 'cell');
    // Create Checkbox
    const input = this.createScriptElement('input', commandId, div);
    input.setAttribute('type', 'checkbox');
    input.setAttribute('name', paramName);
    input.checked = !!checked;

    // Create label
    const lbl = this.createScriptElement('label', commandId, div);
    lbl.setAttribute('for', paramName);
    lbl.innerText = label;
    
    const onChange = () => {
      const scriptItem = this.getScriptItem(commandId);
      scriptItem.params[paramName] = input.checked;
      console.log(paramName, input.checked);
    }

    input.addEventListener('change', () => { onChange(); });

    return input
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
    const paramView = super.createScriptParamsView(parrent, commandId);
    this.createTextArea(paramView, commandId, 'text');
    return paramView;
  }
}

class ExpectTextBase extends ExpectCmd {
  constructor(name, scriptContainer, toolContainer) {
    super(name, scriptContainer, toolContainer);
    this.defaultParams = { ignoreApostrophes: true };
  }

  removeApostrophes(value) {
    // For some reasone the s.replace(/[`"'ʼʻ’]/ig, '') doesn't work
    const codes = [ 96, 34, 39, 700, 699, 8217 ]; // apostrophes `"'ʼʻ’
    let res = value;
    codes.forEach(c => { res = res.replaceAll(String.fromCharCode(c), ''); });
    return res;
  }

  prepareValue(value, params) {
    let res = value.replace(/\<\/?(b|i)\>/ig, ''); // Remove bold, italic tags;
    if (params.ignoreApostrophes) res = this.removeApostrophes(res);
    if (!params.caseSensitive) res = res.toLowerCase();
    return res;
  }

  createScriptParamsView(parrent, commandId) {
    const paramView = super.createScriptParamsView(parrent, commandId);
    this.createTextArea(paramView, commandId, 'text');
    this.createCheckBox(paramView, commandId, 'caseSensitive', 'Case sensitive');
    this.createCheckBox(paramView, commandId, 'ignoreApostrophes', 'Ignore apostrophes', true);
    return paramView;
  }
}

class ExpectTextEqCmd extends ExpectTextBase {
  constructor(scriptContainer, toolContainer) {
    super('Expect text equal', scriptContainer, toolContainer);
  }
  
  checkCondition(scriptItem) {
    const { params } = scriptItem;
    const expected = this.prepareValue(params.text, params); 
    const found = commandData.responses.find(e => this.prepareValue(e.message, params) == expected);
    return !!found;
  }
}

class ExpectTextContainsCmd extends ExpectTextBase {
  constructor(scriptContainer, toolContainer) {
    super('Expect text contains', scriptContainer, toolContainer);
  }
  
  checkCondition(scriptItem) {
    const { params } = scriptItem;
    const expected = this.prepareValue(params.text, params); 
    const found = commandData.responses.find(e => {
      console.log(`"${this.prepareValue(e.message, params)}".indexOf("${expected}") = ${this.prepareValue(e.message, params).indexOf(expected)}`);
      return this.prepareValue(e.message, params).indexOf(expected) >= 0
    });
    return !!found;
  }
}

class ExpectQuickReplyExistsCmd extends ExpectCmd {
  constructor(scriptContainer, toolContainer) {
    super('Expect Quick Reply exists', scriptContainer, toolContainer);
  }
  
  checkCondition(scriptItem) {
    const lastResp = commandData.responses[commandData.responses.length-1];
    const replies = lastResp.quickReplies?.replies || [];
    const caseSensitive = scriptItem.params.caseSensitive;
    const expected = caseSensitive ?
      scriptItem.params.text :
      scriptItem.params.text.toLowerCase();
    const received = replies.find(q => expected == (caseSensitive ? q.title : q.title.toLowerCase()));
    return !!received;
  }

  createScriptParamsView(parrent, commandId) {
    const paramView = super.createScriptParamsView(parrent, commandId);
    this.createTextArea(paramView, commandId, 'text');
    this.createCheckBox(paramView, commandId, 'caseSensitive', 'Case sensitive');
    return paramView;
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