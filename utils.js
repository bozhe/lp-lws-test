function setChatWindowSize(w, h) {
  function normalizeValue(v) {
    if (!v) return '80%'
    if (typeof v === 'string') return v;
    if (v <= 1.0) return `${v * 100.0}%`;
    if (v <= 100) return `${v}%`;
    return `${v}px`;
  }
  const elem = window.document.querySelector(".lp_maximized");
  if (elem) {
    elem.style.height = normalizeValue(h);
    elem.style.width = normalizeValue(w);
    console.log(`W: ${elem.style.width}, H: ${elem.style.height}`);
  }
}

function initChatWindowSliders() {
  const wSlider = window.document.getElementById('chat-window-width-slider');
  const hSlider = window.document.getElementById('chat-window-height-slider');
  let chatWindow;
  function updateAttribute(attr, innerAttr, min) { 
    return function(ev) {
      chatWindow = window.document.querySelector(".lp_maximized");
      if (!chatWindow) return;
      const value = (min + (window[innerAttr] - min) * ev.target.value / 100) * 0.93;
      chatWindow.style[attr] = value;
    }
  }
  wSlider.addEventListener('input', updateAttribute('width', 'innerWidth', 340));
  hSlider.addEventListener('input', updateAttribute('height', 'innerHeight', 580));
}
