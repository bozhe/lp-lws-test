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