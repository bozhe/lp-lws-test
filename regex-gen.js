function onGenerateClick() {
  const textArea = window.document.getElementById('regex-options-text');
  const regexes = (textArea.value || '').split('\n')
    .map(v => v.replace(/^([a-z1-9]\W{1,3})?/i, '').replace(/[^a-z0-9 ]/ig, '.').trim())
    .filter(v => !!v)
    .map((opt, index) => {
      const char = 'abcdefghij'[index];
      return `(?i)^([${char}${index+1}]\\W{0,3})?(${opt})?$`
    });
  createRegexLines(regexes);
}

function createRegexLines(regexes) {
  const parent = window.document.getElementById('regex-options-results');

  const textarea =  window.document.createElement('textarea');
  textarea.name = 'clipboard';
  textarea.classList.add('regex-clipboard');
  textarea.id = 'regex-clipboard';

  parent.innerHTML = '';
  regexes.forEach(r => {
    const row = document.createElement('div');
    const valueCell = document.createElement('div');
    const buttonCell = document.createElement('div');
    const button = document.createElement('img');

    row.classList.add('row');
    valueCell.classList.add('cell', 'code');
    buttonCell.classList.add('cell');

    valueCell.innerText = r;
    button.classList.add('copy-icon');
    button.setAttribute('src', 'copy.svg');
    button.onclick = () => { copyRegex(r, textarea); };

    parent.appendChild(row);
    row.appendChild(valueCell);
    row.appendChild(buttonCell);
    buttonCell.appendChild(button);
  });
}

function copyRegex(value, textarea) {
  textarea.select();
  navigator.clipboard.writeText(value);
}
