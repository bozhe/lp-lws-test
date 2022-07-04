function onGenerateClick() {
  const objRegex = /\{.*title:\s*['"`](.*)['"`]\s*(,\s.*|\s*)\},?/;
  const strRegex = /^['"`](.*)['"`],?$/;

  const yesPattern = '(yes|right|of course|by all means|sure|certainly|absolutely|indeed|agreed|aye|yeah|yah|yep|yup|okay|ok|okey-dokey|okey-doke|surely)(([\\s.,-]*)?th.*nk.*)?';
  const noPattern = '(absolut.*|total.*)?((no(t)?.*(way|right|really|entirely|exactly|thank.*)?|nah|nope|wrong|disagree|doubt.*))';
  const allSetPattern = '(i(\\s+am|.{0,1}m)\\s+)?(all\\s+)?(done|good|ok|set)';
  const chatPattern = '(chat|talk|speak|connect)\\s(with|to).*(associate|human|agent)';
  const menuPattern = '(main\\s+?)?menu';

  const yesRegex = /(yes|right|of course|by all means|sure|certainly|absolutely|indeed|agreed|aye|yeah|yah|yep|yup|okay|ok|okey-dokey|okey-doke|surely)(([\s.,-]*)?th.*nk.*)?/i;
  const noRegex = /(absolut.*|total.*)?((no(t)?.*(way|right|really|entirely|exactly|thank.*)?|nah|nope|wrong|disagree|doubt.*))/i;
  const allSetRegex = /(i(\s+am|.{0,1}m)\s+)?(all\s+)?(done|good|ok|set)/i;
  const chatRegex = /(chat|talk|speak|connect)\s(with|to).*(associate|human|agent)/i;
  const menuRegex = /(main\s+?)?menu/i;

  const textArea = window.document.getElementById('regex-options-text');
  const regexes = (textArea.value || '').split('\n')
    .map(l => {
      let line = l.trim().replace(/^.*\[/, '').replace(/\].*$/, '');
      if (objRegex.test(line)) line = line.match(objRegex)[1];
      if (strRegex.test(line)) line = line.match(strRegex)[1];
      return line.replace(/^([a-z1-9]\W{1,3})?/i, '')
        .replace(/\\['"`]/g, '.')
        .replace(/[^a-z0-9 ]/ig, '.')
        .replace(/\.{2,}/g, '.+')
        .toLowerCase()
        .trim();
    })
    .filter(v => !!v)
    .map((opt, index) => {
      const char = 'abcdefghij'[index];
      const optPattern = yesRegex.test(opt) ? yesPattern :
        (noRegex.test(opt) ? noPattern : 
        (allSetRegex.test(opt) ? allSetPattern :
        (chatRegex.test(opt) ? chatPattern :
        (menuRegex.test(opt) ? menuPattern :
        opt))));
      return `(?i)^([${char}${index+1}]\\W{0,3})?(${optPattern})?$`
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
    row.classList.add('row');
    parent.appendChild(row);

    const buttonCell = document.createElement('div');
    buttonCell.classList.add('cell');
    row.appendChild(buttonCell);

    const button = document.createElement('img');
    button.classList.add('copy-icon');
    button.setAttribute('src', 'copy.svg');
    button.onclick = () => { copyRegex(r, textarea); };
    buttonCell.appendChild(button);
    
    const valueCell = document.createElement('div');
    valueCell.classList.add('cell', 'code');
    valueCell.innerText = r;
    valueCell.ondblclick = () => { copyRegex(r, textarea); };
    row.appendChild(valueCell);
  });
}

function copyRegex(value, textarea) {
  textarea.select();
  navigator.clipboard.writeText(value);
}
