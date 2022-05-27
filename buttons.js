function displayTitle(name) {
  var catTitle = document.createElement('div');
  catTitle.classList.add('top-title');
  catTitle.innerText = name;
  document.getElementById('cat-title').appendChild(catTitle);
}

function createGroup(parent, name) {
  const group = document.createElement('div');
  const button = document.createElement('button');
  const content = document.createElement('div');

  group.classList.add('top-menu-group');
  button.classList.add('top-menu-group-button');
  content.classList.add('top-menu-group-content');

  button.innerText = name;
  
  parent.appendChild(group);
  group.appendChild(button);
  group.appendChild(content);
  
  return content;
}

function createGroupItem(parent, name, section) {
  const element = document.createElement('a');
  element.setAttribute('href', '?section=' + section);
  element.setAttribute('id', 'category-btn-' + section);
  element.classList.add('top-menu-item');
  element.innerText = name;
  parent.appendChild(element);
}

function createMenu() {
  const topMenu = document.getElementById('top-menu');
  categories.forEach(e => {
    if (e.items && e.items.length) {
      const group = createGroup(topMenu, e.name);
      e.items.forEach(ei => createGroupItem(group, ei.name, ei.section))
    }
  })
};
