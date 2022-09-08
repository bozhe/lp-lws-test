const CmdStates = {
  HOLD: 0,
  WAIT: 10,
  NEXT: 20,
  RUN: 30,
  FAILED: 40,
  FINISHED: 50,
};

class TestScriptModel {
  constructor(...commandClasses) {
    this.commandClasses = commandClasses;
    this.reset();
  }

  reset () {
    this.commands = [];
    this.responses = [];
    this.currentIndex = 0;
    this.currentState = CmdStates.HOLD;
    return this;
  }

  indexById (id) {
    return this.commands.findIndex(item => item.id == id);
  }

  isRunning() {
    return [CmdStates.WAIT, CmdStates.NEXT, CmdStates.RUN].includes(this.currentState);
  }

  lastResponse() {
    return this.responses[this.responses.length-1];
  }

  append(command, view) {
    // const id = this.commands.length;
    // view.id = id;
    view.parent.scroll(0, view.parent.scrollHeight);
    this.commands.push({ command, view, id: command.id });
  }

  moveCommand(targetIndex, destIndex) {
    // Model Items
    const targetItem = this.commands[targetIndex];
    const destItem = this.commands[destIndex];
    // Move HTML Elements
    const targetContainer = targetItem.view.container;
    const destContainer = destItem.view.container;
    targetContainer.parentNode.insertBefore(targetContainer, destContainer);
    // Move model items
    this.commands.splice(targetIndex, 1);
    this.commands.splice(destIndex, 0, targetItem);
  }
  
  moveCommandUp(id) {
    if (this.isRunning()) return alert('Test can\'t be updated while is running');
    const index = this.indexById(id);
    if (index > 0) return this.moveCommand(index, index - 1);
  }

  moveCommandDown(id) {
    if (this.isRunning()) return alert('Test can\'t be updated while is running');
    const index = this.indexById(id);
    if (index < this.commands.length - 1) return this.moveCommand(index + 1, index);
  }

  removeCommand(id) {
    if (this.isRunning()) return alert('Test can\'t be updated while is running');
    const index = this.indexById(id);
    if (index >= 0) {
      const { command, view } = this.commands[index];
      
      const msg = "Are you sure you want to delete the following?\n\n" +
        command.constructor.readableName + "\n" +
        Object.keys(command.params).map(k => `    ${k}: ${command.params[k]}`).join("\n");

      if (confirm(msg)) {
        view.remove();
        this.commands.splice(index, 1);
      }
    };
  }

  clearCommands(forceConfirm) {
    if (this.isRunning()) {
      alert('Test can\'t be updated while is running');
      return false
    };
    const msg = "Are you sure you want to clean the test script?";
    if (forceConfirm || confirm(msg)) {
      this.commands.forEach(i => i.view.remove());
      this.reset();
      return true;
    }
    return false;``
  }
  
  toJsonString() {
    return JSON.stringify(this.commands.map(i => i.command.toObject()), null, 2);
  }
  
  fromJsonString(str, parent) {
    if (!this.clearCommands(true)) return;
    const obj = JSON.parse(str);
    obj.forEach(c => {
      const cls = this.commandClasses.find(rc => rc.commandName == c.name);
      if (cls) {
        const cmd = new cls(c.params);
        const view = cmd.createView(parent);
        this.append(cmd, view);
      } else {
        console.log(`Can not create command ${c.name}`);
      }
    })
  }
}

class IdGenerator {
  constructor(base) {
    this.base = base;
    this.index = 0;
  }
  generate(){
    this.index += 1;
    return `${this.base}${this.index}`;
  }
}

/** VIEW CLASSES  **/
class CmdViewBase {
  constructor(parent, name, params, id) {
    this.id = id;
    this.container = this.createContainer(parent);
    this.labelAndParams = this.createLabelAndParams();
    this.label = this.createLabel(name);
    this.paramView = this.createParamView(params);
    this.controls = this.createControls();
    this.parent = parent;
  }

  remove() {
    this.container.remove();
  }

  onSuccess() {
    this.container.classList.remove('failed');
    this.container.classList.add('success');
  }

  onFail() {
    this.container.classList.add('failed');
    this.container.classList.remove('success');
  }

  reset() {
    this.container.classList.remove('failed');
    this.container.classList.remove('success');
  }

  defaultUpdater(params, name) {
    return function(value) {
      params[name] = value;
      // console.log('TODO: ', name, value, params);
      // console.log(commandsModel.commands);
    }
  }

  // Base elements
  createElement(type, parent, ...classes) {
    const el = window.document.createElement(type);
    if (classes && classes.length) el.classList.add(...classes);
    parent.appendChild(el);
    return el;
  }
  createContainer(parent) { return this.createElement('div', parent, 'command-container'); }

  createLabelAndParams() {
    return this.createElement('div', this.container, 'command-lable-and-params');
  }

  createParamView(params) {
    const view = this.createElement('div', this.labelAndParams, 'command-params');
    return view;
  }
  createLabel(name) {
    const cnt = this.createElement('div', this.labelAndParams, 'command-label-container');
    const lbl = this.createElement('label', cnt, 'command-label');
    lbl.innerText = name;
    return lbl;
  }
  createControls() {
    const view = this.createElement('div', this.container, 'command-controll');

    const btnRemove = this.createElement('div', view, 'cmd-ctrl-btn', 'remove');
    const imgRemove = this.createElement('img', btnRemove, 'cmd-ctrl-img', 'remove');
    imgRemove.setAttribute('src', 'assets/svg/circle-remove.svg');
    btnRemove.onclick = () => { commandsModel.removeCommand(this.id); };
    
    const btnUp = this.createElement('div', view, 'cmd-ctrl-btn', 'up');
    const imgUp = this.createElement('img', btnUp, 'cmd-ctrl-img', 'up');
    imgUp.setAttribute('src', 'assets/svg/circle-up.svg');
    btnUp.onclick = () => { commandsModel.moveCommandUp(this.id); };

    const btnDown = this.createElement('div', view, 'cmd-ctrl-btn', 'down');
    const imgDown = this.createElement('img', btnDown, 'cmd-ctrl-img', 'down');
    imgDown.setAttribute('src', 'assets/svg/circle-down.svg');
    btnDown.onclick = () => { commandsModel.moveCommandDown(this.id); };
    
    return view;
  }

  // Param Elements
  createTextArea(parent, value, updateParamCallback) {
    const input = this.createElement('textarea', parent, 'command-param');
    const onChange = () => { updateParamCallback(input.value); }
    input.value = value;
    input.setAttribute('placeholder', 'text');
    input.addEventListener('focusout', () => { onChange() });
    input.addEventListener('keypress', event => { if (event.code === 'Enter') onChange(); });
    return input
  }
  createCheckBox(parent, label, checked, updateParamCallback) {
    const name = label.replace(/\s/g, '-');
    const div = this.createElement('div', parent);
    
    // Create Checkbox
    const input = this.createElement('input', div, 'command-param-check', 'box');
    input.setAttribute('type', 'checkbox');
    input.setAttribute('name', name);
    input.checked = !!checked;
    input.id = `${name}-${this.id}`;

    // Create label
    const lbl = this.createElement('label', div, 'command-param-check', 'lbl');
    lbl.setAttribute('for', input.id);
    lbl.innerText = label;
    
    // On Update
    const onChange = () => { updateParamCallback(input.checked); }
    input.addEventListener('change', () => { onChange(); });

    return input
  }
}
class ResetView extends CmdViewBase {}
class SendView extends CmdViewBase {
  createParamView(params) { 
    const view = super.createParamView(params);
    this.createTextArea(view, params.text, this.defaultUpdater(params, 'text'));
  }
}
class ExpectTextView extends CmdViewBase {
  createParamView(params) { 
    const view = super.createParamView(params);
    this.createTextArea(view, params.text, this.defaultUpdater(params, 'text'));
    this.createCheckBox(view, 'Case sensitive', params.caseSensitive, this.defaultUpdater(params, 'caseSensitive'));
    this.createCheckBox(view, 'Ignore apostrophes', params.ignoreApostrophes, this.defaultUpdater(params, 'ignoreApostrophes'));
    this.createCheckBox(view, 'Ignore line-breaks', params.ignoreLineBreaks, this.defaultUpdater(params, 'ignoreLineBreaks'));
  }
}
class ExpectQRView extends CmdViewBase {
  createParamView(params) { 
    const view = super.createParamView(params);
    this.createTextArea(view, params.text, this.defaultUpdater(params, 'text'));
    this.createCheckBox(view, 'Case sensitive', params.caseSensitive, this.defaultUpdater(params, 'caseSensitive'));
  }
}

/** MODEL CLASSES **/
class CmdModelBase {
  static commandName = 'BaseCommand';
  static readableName = 'Base Command';
  static viewClass = CmdViewBase;
  constructor(params) {
    this.id = idGen.generate();
    this.params = params;
    this.succesState = CmdStates.NEXT;
    this.failedState = CmdStates.FAILED;
  }

  onSuccess() { this.view.onSuccess() };
  
  onFail() {  this.view.onFail(); };

  toObject() {
    return { name: this.constructor.commandName, params: this.params }
  }

  createView(parent) {
    const viewClass = this.constructor.viewClass;
    this.view = new viewClass(parent, this.constructor.readableName, this.params, this.id);
    return this.view;
  }

  run(chat, callback) {}
}

// == Send Bases == //
class UserMessageCmd extends CmdModelBase {
  constructor(params) {
    super(params);
    this.succesState = CmdStates.WAIT;
  }

  run(chat, callback) {
    chat.sendMessage(this.params.text);
    this.onSuccess();
    callback(this.succesState);
  }
}

// == Expect Bases == //
class ExpectCmd extends CmdModelBase {
  checkCondition() { return true; }
  
  run(chat, callback) {
    if (this.checkCondition()) {
      this.onSuccess(); callback(this.succesState);
    } else {
      this.onFail(); callback(this.failedState);
    }
  }
}

class ExpectTextBase extends ExpectCmd {
  static viewClass = ExpectTextView;
  constructor(params) {
    const defaultParams = {
      caseSensitive: false,
      ignoreApostrophes: true,
      ignoreLineBreaks: false,
      text: "",
    };
    super(Object.assign(defaultParams, params))
  }

  extractText(response) {
    if (response.message) return this.prepareValue(response.message);
    if (response.type === "RichContentEvent") return this.prepareValue(this.richToText(response.content));
  }

  richToText(content) {
    if (content && content.type === "vertical") {
      return content.elements.filter(e => e.type === 'text').map(e => e.text.replace(/\n$/, '')).join('\n');
    }
    return null
  }

  removeApostrophes(value) {
    // For some reasone the s.replace(/[`"'ʼʻ’]/ig, '') doesn't work
    const codes = [ 96, 34, 39, 700, 699, 8217 ]; // apostrophes `"'ʼʻ’
    let res = value;
    codes.forEach(c => { res = res.replaceAll(String.fromCharCode(c), ''); });
    return res;
  }

  prepareValue(value) {
    if (!value) return '';
    let res = value.replace(/\<\/?(b|i)\>/ig, ''); // Remove bold, italic tags;
    if (this.params.ignoreApostrophes) res = this.removeApostrophes(res);
    if (!this.params.caseSensitive) res = res.toLowerCase();
    if (this.params.ignoreLineBreaks) res = res.replaceAll('\n', '').replaceAll('\r', '');
    return res;
  }
}

class ExpectQRBaseCmd extends ExpectCmd {
  static viewClass = ExpectQRView;
  constructor(params) {
    const defaultParams = {
      caseSensitive: false,
      text: "",
    };
    super(Object.assign(defaultParams, params))
  }

  prepareValue(value) {
    return this.params.caseSensitive ? value : value.toLowerCase();
  }
}

// == Send == //
class ResetCmd extends UserMessageCmd {
  static commandName = 'Reset';
  static readableName = 'Reset';
  static viewClass = ResetView;
  constructor(params) {
    const defaultParams = { text: 'reset' };
    super(Object.assign(defaultParams, params));
  }
}

class SendCmd extends UserMessageCmd {
  static commandName = 'Send';
  static readableName = 'Send';
  static viewClass = SendView;

  constructor(params) {
    const defaultParams = { text: "" };
    super(Object.assign(defaultParams, params));
  }
}

// == Expect Implementation == //
class ExpectTextEqCmd extends ExpectTextBase {
  static commandName = 'ExpectTextEqual';
  static readableName = 'Expect Text Equal';
  
  checkCondition() {
    const expected = this.prepareValue(this.params.text);
    const found = commandsModel.responses.find(e => this.extractText(e) == expected);
    return !!found;
  }
}

class ExpectTextContainsCmd extends ExpectTextBase {
  static commandName = 'ExpectTextContains';
  static readableName = 'Expect Text Contains';

  checkCondition() {
    const expected = this.prepareValue(this.params.text); 
    const found = commandsModel.responses.find(e => this.extractText(e).indexOf(expected) >= 0);
    return !!found;
  }
}

class ExpectQRExistsCmd extends ExpectQRBaseCmd {
  static commandName = 'ExpectQRExists';
  static readableName = 'Expect QR Exists';

  checkCondition() {
    const replies = commandsModel.lastResponse()?.quickReplies?.replies || [];
    const expected = this.prepareValue(this.params.text);
    const found = replies.find(q => expected == this.prepareValue(q.title));
    return !!found;
  }
}

class ExpectQRContainsCmd extends ExpectQRBaseCmd {
  static commandName = 'ExpectQRContains';
  static readableName = 'Expect QR Contains';

  checkCondition() {
    const replies = commandsModel.lastResponse()?.quickReplies?.replies || [];
    const expected = this.prepareValue(this.params.text);
    const found = replies.find(q => this.prepareValue(q.title).indexOf(expected) >= 0);
    return !!found;
  }
}

const idGen = new IdGenerator('cmd');
const commandsModel = new TestScriptModel(
  ResetCmd
  , SendCmd
  , ExpectTextEqCmd
  , ExpectTextContainsCmd
  , ExpectQRExistsCmd
  , ExpectQRContainsCmd
);
