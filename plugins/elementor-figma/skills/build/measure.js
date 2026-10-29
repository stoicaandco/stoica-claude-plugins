/* Elementor page measuring helper.
   Paste into the page (browser JS) once, then call:
     __measure('<sectionDataId>')  → layout + typography of one section (y relative to section top)
     __checks()                    → overflow + basic a11y checks for the whole page
   Run at 1440 / 1025 / 768 / 375. */
(() => {
  // remove cookie banners without consenting
  document.querySelectorAll('#hs-eu-cookie-confirmation, .cky-consent-container, #cookie-law-info-bar').forEach(e => e.remove());
  [...document.querySelectorAll('body > div')].filter(d => /cookies? (are|is) used|cookie policy/i.test(d.textContent) && d.textContent.length < 2000).forEach(d => d.remove());
  document.documentElement.style.scrollBehavior = 'auto';

  const rgb = c => c.replace(/rgba?\(([^)]+)\)/, (_, v) => v.split(',').slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('').replace(/^/, '#'));

  window.__measure = (id) => {
    const sec = document.querySelector(`[data-id="${id}"]`);
    if (!sec) return `no element with data-id ${id}`;
    const t0 = sec.getBoundingClientRect().top;
    const R = e => { const r = e.getBoundingClientRect(); return [r.left, r.top - t0, r.width, r.height].map(Math.round).join(','); };
    const cs = getComputedStyle(sec);
    return {
      W: innerWidth,
      section: R(sec) + ' pad ' + [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat).join('/'),
      items: [...sec.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,img')]
        .filter(e => e.offsetParent && e.getBoundingClientRect().width)
        .slice(0, 60)
        .map(e => {
          const c = getComputedStyle(e);
          const txt = e.tagName === 'IMG' ? '[img ' + (e.alt ? 'alt' : 'NO ALT') + ']' : '"' + e.textContent.trim().slice(0, 24) + '"';
          return `${e.tagName.toLowerCase()}${e.dataset.id ? '#' + e.dataset.id : ''} ${R(e)} ${txt} ${c.fontFamily.split(',')[0]} ${c.fontSize}/${(parseFloat(c.lineHeight) / parseFloat(c.fontSize) || 0).toFixed(2)} ${c.fontWeight}${c.fontStyle === 'italic' ? 'i' : ''} ${rgb(c.color)}`;
        })
    };
  };

  window.__checks = () => {
    const W = document.documentElement.clientWidth;
    const clipped = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'clip') return true; } return false; };
    const overflow = [...document.querySelectorAll('[data-elementor-type] *')].filter(e => {
      if (e.closest('svg') !== null && e.tagName.toLowerCase() !== 'svg') return false;
      const r = e.getBoundingClientRect(); const p = getComputedStyle(e).position;
      return r.width && (r.right > W + 1 || r.left < -1) && p !== 'fixed' && !e.closest('.swiper, [aria-hidden="true"]') && !clipped(e);
    }).slice(0, 10).map(e => (e.closest('[data-id]')?.dataset.id || '') + ' ' + e.tagName.toLowerCase() + '.' + (e.getAttribute('class') || '').split(' ')[0]);
    const heads = [...document.querySelectorAll('main h1, main h2, main h3, main h4, .elementor h1, .elementor h2, .elementor h3, .elementor h4')].filter(h => h.offsetParent);
    const levels = heads.map(h => +h.tagName[1]);
    const skips = levels.map((l, i) => i && l - levels[i - 1] > 1 ? `${heads[i - 1].tagName}→${heads[i].tagName} "${heads[i].textContent.trim().slice(0, 20)}"` : null).filter(Boolean);
    return {
      W, scrollWidth: document.documentElement.scrollWidth, overflow,
      h1Count: document.querySelectorAll('h1').length,
      headingSkips: [...new Set(skips)].slice(0, 10),
      imgsNoAlt: [...document.querySelectorAll('img')].filter(i => i.offsetParent && !i.hasAttribute('alt')).map(i => i.src.split('/').pop()).slice(0, 10),
      vagueLinks: [...document.querySelectorAll('a')].filter(a => a.offsetParent && /^(click here|here|read more|more|learn more)$/i.test(a.textContent.trim()) && !a.getAttribute('aria-label')).length,
      emptyLinks: [...document.querySelectorAll('a')].filter(a => a.offsetParent && !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""]), svg title')).length
    };
  };
  return 'ready: __measure(id), __checks()';
})();
