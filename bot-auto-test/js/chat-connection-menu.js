function __createElement(type, parent, ...classes) {
  const el = window.document.createElement(type);
  if (classes) el.classList.add(...classes);
  parent.appendChild(el);
  return el;
}

function createUL(parrent, level) {
  const ul = window.document.createElement('ul');
  ul.classList.add("connection-menu", `level-${level}`);
  parrent.appendChild(ul);
  return ul
}

function createLI(parrent, title) {
  const li = window.document.createElement('li');
  li.innerText = title;
  parrent.appendChild(li);
  return li
}

function createMenu() {
  const root = window.document.getElementById('chat-header-rigth');

  const menu = __createElement('div', root);
    const mainnav = __createElement('ul', menu, 'connect-menu');
      const connectLI = __createElement('li', mainnav, 'hassubs');
        const connectA = __createElement('a', connectLI);
        connectA.innerText = 'Connect';
        connectA.setAttribute('href', '#'); // TODO: Move to helper;

        const connectImg = __createElement('img', connectLI, 'chat-ctrl-img');
        connectImg.setAttribute('src', 'assets/svg/connect.svg');

        const devUL = __createElement('ul', connectLI, 'dropdown');
          const devLI = __createElement('li', devUL, 'hassubs');
            const devA = __createElement('a', devLI);
            devA.innerText = 'DEV';
            devA.setAttribute('href', '#'); // TODO: Move to helper;

  // const accMenu = createUL(root, 1);
  // accounts.forEach(acc => {
  //   const accItem = createLI(accMenu, acc.name);
  //   const channelMenu = createUL(accItem, 2);
  //   acc.channels.forEach(channel => {
  //     const channelItem = createLI(channelMenu, channel.name);
  //     const pageMenu = createUL(channelItem, 3);
  //     channel.pages.forEach(page => {
  //       const pageItem = createLI(pageMenu, page.name);
  //       pageItem.onClick = () => { console.log(page); }
  //     })
  //   });
  // });
// }
}

{/* <div class="main">
  <ul class="mainnav">
    <li class="hassubs"><a href="#">Connect</a>
      <ul class="dropdown">
          <li class="hassubs"><a href="#">Dev</a>
              <ul class="dropdown">
                  <li class="subs hassubs"><a href="#">WEB</a>
                      <ul class="dropdown">
                          <li class="subs"><a href="#">Home page</a></li>
                          <li class="subs"><a href="#">Kitchen</a></li>
                          <li class="subs"><a href="#">Price match</a></li>
                      </ul>
                  </li>
                  <li class="subs hassubs"><a href="#">SMS</a>
                      <ul class="dropdown">
                          <li class="subs"><a href="#">Main</a></li>
                      </ul>
                  </li>
              </ul>
          </li>
          <li class="hassubs"><a href="#">Stage</a>
              <ul class="dropdown">
                  <li class="subs hassubs"><a href="#">WEB</a>
                      <ul class="dropdown">
                          <li class="subs"><a href="#">Home page</a></li>
                          <li class="subs"><a href="#">Kitchen</a></li>
                          <li class="subs"><a href="#">Price match</a></li>
                      </ul>
                  </li>
                  <li class="subs hassubs"><a href="#">SMS</a>
                      <ul class="dropdown">
                          <li class="subs"><a href="#">Main</a></li>
                      </ul>
                  </li>
              </ul>
          </li>
      </ul>
    </ul>
  <br style="clear: both;">
</div> */}