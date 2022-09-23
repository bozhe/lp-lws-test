const CmdStates = {
  HOLD: 0,
  WAIT: 10,
  NEXT: 20,
  RUN: 30,
  FAILED: 40,
  FINISHED: 50,
};

const TextOperators = {
  equals: 'Equals',
  notEquals: 'Not Equals',
  contains: 'Contains',
  notContains: 'Not Contains',
}
const QRSetOperators = {
  includesAnyOf: 'Includes Any Of',
  includesAllOf: 'Includes All Of',
  notincludesAnyOf: 'Not Includes Any of',
  notincludesOneOf: 'Not Includes One of',
}


class TestScriptModel {
  constructor(...commandClasses) {
    this.commandClasses = commandClasses;
    this.progressHanglers = { stop: [], start: [] };
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
    view.parent.scroll(0, view.parent.scrollHeight);
    this.commands.push({ command, view, id: command.id });
  }

  moveCommand(targetIndex, destIndex) {
    function replaceNodes(a, b) {
      a.parentNode.insertBefore(a, b);
      if (+a.dataset.index < +b.dataset.index) a.parentNode.insertBefore(b, a);
    }
    // Model Items
    const targetItem = this.commands[targetIndex];
    const destItem = this.commands[destIndex];
    // Move HTML Elements
    const targetContainer = targetItem.view.container;
    const destContainer = destItem.view.container;
    replaceNodes(targetContainer, destContainer);
    
    // Move model items
    this.commands.splice(targetIndex, 1);
    this.commands.splice(destIndex, 0, targetItem);

    // Update Indexes
    this.commands.forEach((c, index) => { c.view.container.dataset.index = index; });
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

  findHeader() {
    const value = this.commands.find(i => i.command instanceof HeaderCmd)?.command?.params?.value;
    return value && `${value}`.toUpperCase();
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
      } else if (deprecatedCommands[c.name]) {
        const { cls, defaultParams } = deprecatedCommands[c.name]
        const cmd = new cls(Object.assign(defaultParams, c.params));
        const view = cmd.createView(parent);
        this.append(cmd, view);
      } else {
        console.log(`Can not create command ${c.name}`);
      }
    })
  }

  run(index) {
    if (!this.isRunning()) {
      commandsModel.currentIndex = index || 0;
      this.commands.forEach((c, i) => { if (i >= commandsModel.currentIndex) c.command.reset(); } );
		  this.runNextStep();
    }
  }

  runById(id) {
    this.run(this.indexById(id));
  }

  runNextStep() {
    const item = this.commands[this.currentIndex];
    console.log('Run next step:', this.currentIndex, item?.command);
	  this.onState(CmdStates.RUN);
	  if (!item) return this.onState(CmdStates.FINISHED);
	  this.currentIndex += 1;
	  item.command.run(window.chat, state => this.onState(state));
  }

  onState(state) {
    console.log(`OnState(${state})`);
    const wasRunning = this.isRunning();
    commandsModel.currentState = state;
    
    if (wasRunning && !this.isRunning()) this.progressHanglers.stop.forEach(h => h());
    if (!wasRunning && this.isRunning()) this.progressHanglers.start.forEach(h => h());

    if (state === CmdStates.NEXT) return this.runNextStep();
    if (state === CmdStates.WAIT) this.responses = [];
  }

  onChatPause() {
    console.log('OnChatPause:', this.currentState);
    if (this.currentState === CmdStates.WAIT) this.runNextStep();
  }

  registerOnProgressStart(handler) {
    this.progressHanglers.start.push(handler);
  }

  registerOnProgressStop(handler) {
    this.progressHanglers.stop.push(handler);
  }

  onBotResponse(response) {
    this.responses.push(response);
  }
}

// TODO REGISTER: chat? / onProgressStart, onProgressStop, 


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


class VerticalDragAndDropController {
  constructor(model) {
    this.pivotY = null;
    this.dropPlace = null;
    this.currentDropTarget = null;
    this.cmdModel = model;
    this.containerList = [];
    this.dragIndex = null;
  }

  createDropPlace(container) {
    this.dropPlace = window.document.createElement('div');
    this.dropPlace.classList.add('drop-place', 'hidden');
    // this.dropPlace.dataset.hidden = true;
    container.parentNode.appendChild(this.dropPlace);
  }

  removeDropPlace() {
    this.dropPlace.remove();
    this.dropPlace = null;
  }

  resetCurrentDropTarget() {
    if (this.currentDropTarget) {
      this.currentDropTarget.classList.remove('drag-over');
      delete this.currentDropTarget.dataset.dragOver;
      
      this.dropPlace.classList.add('hidden');
      // this.dropPlace.dataset.hidden = true;

      this.currentDropTarget = null;
    }
  }

  markAsDropTarget(target) {
    this.resetCurrentDropTarget();
    this.currentDropTarget = target;
    target.classList.add('drag-over');
    target.dataset.dragOver = true;
    this.dropPlace.parentNode.insertBefore(this.dropPlace, target);
    if (+target.dataset.index > this.dragIndex) this.dropPlace.parentNode.insertBefore(target, this.dropPlace);
    this.dropPlace.classList.remove('hidden');
    // delete this.dropPlace.dataset.hidden;
  }

  onStart(event, point, container) {
    // point.classList.add("grabbing");

    event = event || window.event;
    event.preventDefault();
    this.createDropPlace(container);
    this.dragIndex = +container.dataset.index;

    var top = /\d+px/.test(container.style.top) ? parseInt(container.style.top.replace('px', '')) : 0;
    this.pivotY = top - event.clientY;
    container.classList.add('drag');
    container.dataset.draggable = true;
    
    document.onmousemove = (e) => { this.onDrag(e || window.event, point, container ) };
    document.onmouseup = (e) => { this.onDrop(point, container) };
    
    this.containerList = this.cmdModel.commands.map(c => c.view.container);
  }

  onDrag(event, point, container) {
    // if (!this.isDragMove) {
    //   this.isDragMove = true;
    //   document.body.classList.add('hide-cursor');
    //   point.classList.remove("grabbing");
    // }
    event = event || window.event;
    container.style.top = `${event.clientY + this.pivotY}px`;

    var dragTop = container.getBoundingClientRect().top;

    this.containerList.forEach(target => {
      if (!target.dataset.draggable) { // Do not update if target already merked as drop target;
        var targetRect = target.getBoundingClientRect();
        var overTarget = dragTop < targetRect.bottom && dragTop > targetRect.top; // Check if our drag point is over target rect (Y only)
        if (overTarget) {
        // If so, mark target as drop target
          if (!target.dataset.dragOver) this.markAsDropTarget(target);
        
        // Poit out of target:
        } else if (target.dataset.dragOver) { 
          var pPlaceRect = this.dropPlace.getBoundingClientRect();
          var top = Math.min(pPlaceRect.top, targetRect.top);
          var bottom = Math.max(pPlaceRect.bottom, targetRect.bottom);
          var overTargetOrPlace = dragTop < bottom && dragTop > top; // Check if point still over the [grop placeholder + target] 
          // If point out of target and placeholder -> reset target;
          if (!overTargetOrPlace) this.resetCurrentDropTarget();
        }
      }
    })

    event.preventDefault();
  }

  onDrop(point, container) {
    // document.body.classList.remove('hide-cursor');
    // point.classList.remove("grabbing");
    // this.isDragMove = false;
    delete container.dataset.draggable;
    if (this.currentDropTarget) this.cmdModel.moveCommand(+container.dataset.index, +this.currentDropTarget.dataset.index);
    this.resetCurrentDropTarget();
    container.classList.remove('drag');
    container.style.top = '';
    document.onmouseup = null;
    document.onmousemove = null;
    this.removeDropPlace();
  }

  register(point, container) {
    point.onmousedown = (event) => { this.onStart(event, point, container); }
  }
}

function editableDivPasteHandler(event) {
  // Filter out everything except simple text and allowable HTML elements
  const regex = /<(?!(\/\s*)?(b|i|em|strong|u)[>,\s])([^>])*>/g;
  // Get user's pasted data
  const data = (event.clipboardData.getData('text/html') || event.clipboardData.getData('text/plain')).replace(regex, '');
  // Insert the filtered content
  document.execCommand('insertHTML', false, data);
  // Prevent the standard paste behavior
  event.preventDefault();
}

/** VIEW CLASSES  **/
class CmdViewBase {
  constructor(parent, name, params, id) {
    this.id = id;
    this.container = this.createContainer(parent);
    this.labelAndParams = this.createLabelAndParams();
    this.createHeader(name);
    this.paramView = this.createParamView(params);
    this.parent = parent;
    this.container.dataset.index = commandsModel.commands.length;
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

  createDiv(parent, ...classes) { return this.createElement('div', parent, ...classes); }

  createContainer(parent) { return this.createDiv(parent, 'command-container'); }

  // CMD Header
  createHeader(name) {
    const header = this.createDiv(this.labelAndParams, 'command-header');
    const left = this.createDiv(header, 'command-header-left');
    const right = this.createDiv(header, 'command-header-right');
    this.createDragButton(left);
    this.createLabel(name, header);
    this.createDotsMenu(right);
  }

  createDotsMenu(parrent) {
    let top, content;
    
    function showMenu() {
      // delete content.dataset.hidden;
      content.classList.remove('hidden');
      top.onclick = hideMenu;
    }

    function hideMenu() {
      // content.dataset.hidden = true;
      content.classList.add('hidden');
      top.onclick = showMenu;
    }

    const menu = this.createDiv(parrent, 'command-menu'); 
    
    top = this.createElement('img', menu, 'command-menu-top');
    top.setAttribute('src', 'assets/svg/dots.svg');
    top.onclick = showMenu
  
    content = this.createDiv(menu, 'command-menu-content', 'hidden');
    // content.dataset.hidden = true;
  
    const removeItem = this.createDiv(content, 'command-menu-item');
    removeItem.innerText = 'Remove';
    removeItem.onclick = () => { hideMenu(); commandsModel.removeCommand(this.id); }

    const cloneItem = this.createDiv(content, 'command-menu-item');
    cloneItem.innerText = 'Clone';
    cloneItem.onclick = () => { hideMenu(); alert('ToDo'); }

    const runItem = this.createDiv(content, 'command-menu-item');
    runItem.innerText = 'Run this';
    runItem.onclick = () => { hideMenu(); commandsModel.runById(this.id); }

    window.addEventListener('click', function(e) { if (!menu.contains(e.target)) { hideMenu(); } })
  }

  createLabelAndParams() {
    return this.createDiv(this.container, 'command-lable-and-params');
  }

  createParamView(params) {
    const view = this.createDiv(this.labelAndParams, 'command-params');
    return view;
  }

  createDragButton(parrent) {
    const img = this.createElement('img', parrent, 'command-drag');
    img.setAttribute('src', 'assets/svg/draggable.svg');
    verticalDragAndDropController.register(img, this.container);
    return img;
  }

  createLabel(name, header) {
    // const header = this.createDiv(header, 'command-label-container'); // TODO: Mage Draggable
    // this.createDragButton(header);
    const lbl = this.createElement('label', header, 'command-label');
    lbl.innerText = name;
    return lbl;
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
    const div = this.createDiv(parent);
    
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
  
  createCheckBoxGroup(parent, name, checked, onChange) {
    const group = this.createDiv(parent, 'param-check-group');
      const check = this.createElement('input', group, 'command-param-check', 'box')
      check.setAttribute('type', 'checkbox');
      check.checked = !!checked;
      check.id = `${name.replace(/\W/g, '-')}-${this.id}`;
      check.addEventListener('change', () => { onChange(check.checked); });
      
      const label = this.createElement('label', group, 'command-param-check', 'lbl')
      label.innerText = name;
      label.setAttribute('for', check.id);
    return check;
  }
}


class ResetView extends CmdViewBase {

}


class HeaderView extends CmdViewBase {
  createParamView(params) { 
    const view = super.createParamView(params);
    const input = this.createElement('input', view, 'command-param-header-input');
    const onChange = this.defaultUpdater(params, 'value');

    input.setAttribute('type', 'text');
    input.value = params.value;
    input.addEventListener('focusout', () => { onChange(input.value) });
    input.addEventListener('keypress', event => { if (event.code === 'Enter') onChange(input.value); });
  }
}


class SendView extends CmdViewBase {
  createParamView(params) { 
    const view = super.createParamView(params);
    this.createTextArea(view, params.text, this.defaultUpdater(params, 'text'));
  }
}

class PressRichButtonByMaskAndIndexView extends CmdViewBase {
  createText(parent, text, onChange) {
    const container = this.createDiv(parent, 'param-text-with-button');
      const input = this.createDiv(container, 'editable-text-single');
      input.innerText = text;
      input.setAttribute('contenteditable', true);
      input.addEventListener('focusout', () => onChange(input.innerText));
      input.addEventListener('paste', editableDivPasteHandler);
  }

  createParamView(params) { 
    const view = super.createParamView(params);
    const maskTextLine = this.createDiv(view, 'param-exp-text-line');
      const maskLbl = this.createElement('div', maskTextLine, 'tbd'); // Lable
      maskLbl.innerText = 'Mask:';
      this.createDiv(maskTextLine, 'h-separator');
      this.createText(maskTextLine, params.mask, this.defaultUpdater(params, 'mask'));
    const indexTextLine = this.createDiv(view, 'param-exp-text-line');
      const indexLbl = this.createElement('div', indexTextLine, 'tbd'); // Lable
      indexLbl.innerText = 'Index:';
      this.createDiv(indexTextLine, 'h-separator');
      this.createText(indexTextLine, params.index, this.defaultUpdater(params, 'index'));
    const boxes = this.createDiv(view, 'param-check-boxes');
      this.createCheckBoxGroup(boxes, 'Case sensitive', params.caseSensitive, this.defaultUpdater(params, 'caseSensitive'));
  }
}


class ExpectQRView extends CmdViewBase {
  createParamView(params) { 
    const view = super.createParamView(params);
    this.createTextArea(view, params.text, this.defaultUpdater(params, 'text'));
    this.createCheckBox(view, 'Case sensitive', params.caseSensitive, this.defaultUpdater(params, 'caseSensitive'));
  }
}


class ExpectTextView extends CmdViewBase {
  createDropDown(parent, items, selected, onChange) {
    let dropDownTop, dropDownContent;
    function hideDropDownContent() {
      dropDownTop.onclick = showDropDownContent;
      // dropDownContent.dataset.hidden = true;
      dropDownContent.classList.add('hidden');
    };
    function showDropDownContent() {
      dropDownTop.onclick = hideDropDownContent;
      // delete dropDownContent.dataset.hidden;
      dropDownContent.classList.remove('hidden');
    };
    
    const dropDown = this.createDiv(parent, 'param-dropdown');
      dropDownTop = this.createDiv(dropDown, 'param-dropdown-top');
      dropDownContent = this.createDiv(dropDown, 'param-dropdown-content');
      items.forEach(i => {
        const dropDownItem = this.createDiv(dropDownContent, 'param-dropdown-item');
        dropDownItem.innerText = i;
        dropDownItem.onclick = () => {
          hideDropDownContent();
          onChange(i);
          dropDownTop.innerText = i;
        }
      });
      dropDownTop.innerText = selected || "- Select -";
      hideDropDownContent();
      window.addEventListener('click', function(e) { if (!dropDown.contains(e.target)) { hideDropDownContent(); } })
    return dropDown;
  }

  createCheckBoxGroup(parent, name, checked, onChange) {
    const group = this.createDiv(parent, 'param-check-group');
      const check = this.createElement('input', group, 'command-param-check', 'box')
      check.setAttribute('type', 'checkbox');
      check.checked = !!checked;
      check.id = `${name.replace(/\W/g, '-')}-${this.id}`;
      check.addEventListener('change', () => { onChange(check.checked); });
      
      const label = this.createElement('label', group, 'command-param-check', 'lbl')
      label.innerText = name;
      label.setAttribute('for', check.id);
    return check;
  }

  createParamView(params) {
    const operators = Object.keys(TextOperators).map(k => TextOperators[k]);
    const view = super.createParamView(params);
      const textLine = this.createDiv(view, 'param-exp-text-line');
        this.createDropDown(textLine, operators, params.operator, this.defaultUpdater(params, 'operator'));
        
        this.createDiv(textLine, 'h-separator');
        
        const textArea = this.createDiv(textLine, 'editable-text');
        textArea.innerText = params.text;
        textArea.setAttribute('contenteditable', true);
        textArea.addEventListener('focusout', () => { params.text = textArea.innerText });
        textArea.addEventListener('paste', editableDivPasteHandler);

      const boxes = this.createDiv(view, 'param-check-boxes');
        this.createCheckBoxGroup(boxes, 'Case sensitive', params.caseSensitive, this.defaultUpdater(params, 'caseSensitive'));
        this.createCheckBoxGroup(boxes, 'Ignore apostrophes', params.ignoreApostrophes, this.defaultUpdater(params, 'ignoreApostrophes'));
        this.createCheckBoxGroup(boxes, 'Ignore line-breaks', params.ignoreLineBreaks, this.defaultUpdater(params, 'ignoreLineBreaks'));
  }
}


class ExpectQRSetView extends CmdViewBase {
  createDropDown(parent, items, selected, onChange) {
    let dropDownTop, dropDownContent;
    function hideDropDownContent() {
      dropDownTop.onclick = showDropDownContent;
      // dropDownContent.dataset.hidden = true;
      dropDownContent.classList.add('hidden');
    };
    function showDropDownContent() {
      dropDownTop.onclick = hideDropDownContent;
      // delete dropDownContent.dataset.hidden;
      dropDownContent.classList.remove('hidden');
    };
    
    const dropDown = this.createDiv(parent, 'param-dropdown');
      dropDownTop = this.createDiv(dropDown, 'param-dropdown-top');
      dropDownContent = this.createDiv(dropDown, 'param-dropdown-content');
      items.forEach(i => {
        const dropDownItem = this.createDiv(dropDownContent, 'param-dropdown-item');
        dropDownItem.innerText = i;
        dropDownItem.onclick = () => {
          hideDropDownContent();
          onChange(i);
          dropDownTop.innerText = i;
        }
      });
      dropDownTop.innerText = selected || "- Select -";
      hideDropDownContent();
      window.addEventListener('click', function(e) { if (!dropDown.contains(e.target)) { hideDropDownContent(); } })
    return dropDown;
  }


  actualizeButtonsVisability() {
    function applyVisability(btn, visible) {
      if (visible) {
        btn.classList.remove('hidden');
      } else { 
        btn.classList.add('hidden');
      }
    }

    if (this.titleInputs.length === 1) {
      const { addBtn, delBtn } = this.titleInputs[0];
      applyVisability(addBtn, true);
      applyVisability(delBtn, false);
    } else {
      const lastIndex = this.titleInputs.length-1;
      this.titleInputs.forEach((item, index) => {
        applyVisability(item.addBtn, index === lastIndex);
        applyVisability(item.delBtn, true);
      });
    }
  }

  createTextWithAddButton(parent, text, onChange) {
    const container = this.createDiv(parent, 'param-text-with-button');
      const input = this.createDiv(container, 'editable-text-single');
      input.innerText = text;
      input.setAttribute('contenteditable', true);
      input.addEventListener('focusout', onChange);
      input.addEventListener('paste', editableDivPasteHandler);
      
      this.createDiv(container, 'h-separator');

      const addBtn = this.createDiv(container, 'param-add-button');
      addBtn.onclick = () => this.createTextWithAddButton(parent, '', onChange);
        const addImg = this.createElement('img', addBtn, 'param-button-img', 'add');
        addImg.setAttribute('src', 'assets/svg/circle-plus.svg');

      const delBtn = this.createDiv(container, 'param-del-button');
      delBtn.onclick = () => {
        const index = this.titleInputs.findIndex(i => i.container === container);
        this.titleInputs.splice(index, 1);
        container.remove();
        this.actualizeButtonsVisability();
        onChange();
      };
      const delImg = this.createElement('img', delBtn, 'param-button-img', 'del');
      delImg.setAttribute('src', 'assets/svg/circle-remove.svg');
    
    this.titleInputs.push({ container, input, addBtn, delBtn });
    this.actualizeButtonsVisability();
  }

  createParamView(params) {
    this.titleInputs = [];
    const onTitleInputChange = () => {
      params.titles = this.titleInputs.map(t => t.input.innerText)
      console.log('params.titles', params.titles);
    }

    const operators = Object.keys(QRSetOperators).map(k => QRSetOperators[k]);
    const view = super.createParamView(params);
      const textLine = this.createDiv(view, 'param-exp-text-line');
        this.createDropDown(textLine, operators, params.operator, this.defaultUpdater(params, 'operator'));
        
        this.createDiv(textLine, 'h-separator');
        
        const oneOfTextsContainer = this.createDiv(textLine, 'param-one-of-texts-container');
          params.titles.forEach(t => this.createTextWithAddButton(oneOfTextsContainer, t, onTitleInputChange));
        
      const boxes = this.createDiv(view, 'param-check-boxes');
        this.createCheckBoxGroup(boxes, 'Case sensitive', params.caseSensitive, this.defaultUpdater(params, 'caseSensitive'));
        this.createCheckBoxGroup(boxes, 'Full title match', params.fullTitleMatch, this.defaultUpdater(params, 'fullTitleMatch'));
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

  reset() { this.view.reset() }
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

// == System == //
class HeaderCmd extends CmdModelBase {
  static commandName = 'Header';
  static readableName = 'System: Header';
  static viewClass = HeaderView;
  constructor(params) {
    const defaultParams = { value: '' };
    super(Object.assign(defaultParams, params));
    this.succesState = CmdStates.NEXT;
  }
  run(chat, callback) {
    this.onSuccess();
    callback(this.succesState);
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

class PressRichButtonByMaskAndIndex extends UserMessageCmd {
  static commandName = 'PressRichButtonByMaskAndIndex';
  static readableName = 'Press R.Button By Mask';
  static viewClass = PressRichButtonByMaskAndIndexView;

  constructor(params) {
    const defaultParams = { mask: ".*", index: 0, caseSensitive: false };
    super(Object.assign(defaultParams, params));
    this.failedState = CmdStates.FAILED;
  }

  findRichButtonsByTitleMask(mask, caseSensitive) {
    console.log('findRichButtonsByTitleMask', mask, caseSensitive);
    const { responses } = commandsModel;
    const regex = new RegExp(mask, caseSensitive ? '' : 'i');
    console.log(regex);
    const result = [];
    function deepFind(element) {
      if (element.type === 'button' && regex.test(element.title)) return result.push(element);
      if (element.elements) element.elements.forEach(deepFind);
    }
    responses.filter(r => r.type == "RichContentEvent" && r.content?.elements)
      .forEach(r => r.content.elements.forEach(deepFind));
    console.log(result);
    return result;
  }

  run(chat, callback) {
    const buttons = this.findRichButtonsByTitleMask(this.params.mask, this.params.caseSensitive);
    const targetButton = buttons && buttons[this.params.index];
    const { actions, metadata } = targetButton && targetButton.click || {};
    if (!actions) {
      this.onFail(); callback(this.failedState);
    } else {
      let textSent = false;
      actions.forEach(a => {
        if (a.type == "publishText") {
          textSent = true;
          return chat.sendMessage(a.text, metadata);
        }
        if (a.type == "link") return window.open(a.uri, '_blank');//.focus();
      })
      this.onSuccess(); callback(textSent ? CmdStates.WAIT : CmdStates.NEXT);
    }
  }
}


// == Expect Implementation == //
class ExpectText extends ExpectCmd {
  static commandName = 'ExpectText';
  static readableName = 'Expect Text';
  static viewClass = ExpectTextView;
  
  constructor(params) {
    const defaultParams = {
      caseSensitive: false,
      ignoreApostrophes: true,
      ignoreLineBreaks: false,
      text: "",
      operator: TextOperators.contains,
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
  
  contains() {
    const expected = this.prepareValue(this.params.text); 
    const found = commandsModel.responses.find(e => this.extractText(e).indexOf(expected) >= 0);
    return !!found;
  }

  equals() {
    const expected = this.prepareValue(this.params.text); 
    const found = commandsModel.responses.find(e => this.extractText(e) === expected);
    return !!found;
  }

  checkCondition() {
    if (this.params.operator === TextOperators.contains) return this.contains();
    if (this.params.operator === TextOperators.notContains) return !this.contains();
    if (this.params.operator === TextOperators.equals) return this.equals();
    if (this.params.operator === TextOperators.notEquals) return !this.equals();
  }
}


class ExpectQRSet extends ExpectCmd {
  static commandName = 'ExpectQRSet';
  static readableName = 'Expect QR Set';
  static viewClass = ExpectQRSetView;
  
  constructor(params) {
    const defaultParams = {
      caseSensitive: false,
      fullTitleMatch: true,
      titles: [''],
      operator: QRSetOperators.includesAnyOf,
    };
    super(Object.assign(defaultParams, params));
  }

  initMatch() {
    const { fullTitleMatch, caseSensitive } = this.params;
    let match
    if (fullTitleMatch && caseSensitive) match = (exp, rcvd) => { return exp === rcvd; };
    if (fullTitleMatch && !caseSensitive) match = (exp, rcvd) => { return exp.toLowerCase() === rcvd.toLowerCase(); };
    if (!fullTitleMatch && caseSensitive) match = (exp, rcvd) => { return rcvd.indexOf(exp) >= 0 };
    if (!fullTitleMatch && !caseSensitive) match = (exp, rcvd) => { return rcvd.toLowerCase().indexOf(exp.toLowerCase) >= 0 };
    return (exp, rcvd) => match(exp.trim(), rcvd.trim());
  }

  // Rturns true if received includes at least one of expected
  includesAnyOf(expectedTitles, receivedTitles, match) {
    return !!(receivedTitles.find(r => !!expectedTitles.find(e => match(e, r))));
  }
  
  // Rturns true if received includes all of expected
  includesAllOf(expectedTitles, receivedTitles, match) {
    return !(expectedTitles.find(e => !receivedTitles.find(r => match(e, r))));
  }

  // Return true if at least one on expected doesn't match any of received
  notIncludesOneOf(expectedTitles, receivedTitles, match) {
    return !!(expectedTitles.find(e => !receivedTitles.find(r => match(e, r))));
  }

  // Returns false if at least one of received matches with at lest one of expected
  notincludesAnyOf(expectedTitles, receivedTitles, match) {
    return !(receivedTitles.find(r => expectedTitles.find(e => match(e, r))));
  }

  checkCondition() {
    const { operator, titles } = this.params;
    const receivedTitles = (commandsModel.lastResponse()?.quickReplies?.replies || []).map(r => r.title);

    if (operator === QRSetOperators.includesAllOf) return this.includesAllOf(titles, receivedTitles, this.initMatch());
    if (operator === QRSetOperators.includesAnyOf) return this.includesAnyOf(titles, receivedTitles, this.initMatch());
    if (operator === QRSetOperators.notincludesAnyOf) return this.notincludesAnyOf(titles, receivedTitles, this.initMatch());
    if (operator === QRSetOperators.notincludesOneOf) return this.notincludesOneOf(titles, receivedTitles, this.initMatch());
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
  HeaderCmd
  , ResetCmd
  , SendCmd
  , PressRichButtonByMaskAndIndex
  , ExpectText
  , ExpectQRSet
  , ExpectQRExistsCmd
  , ExpectQRContainsCmd
);
const verticalDragAndDropController = new VerticalDragAndDropController(commandsModel);

const deprecatedCommands = {
  'ExpectTextContains': { cls: ExpectText, defaultParams: { operator: TextOperators.contains } },
  'ExpectTextEqCmd': { cls: ExpectText, defaultParams: { operator: TextOperators.equals } },
}