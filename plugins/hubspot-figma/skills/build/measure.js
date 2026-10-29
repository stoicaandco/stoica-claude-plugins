/* Page measuring helper for HubSpot (any site). Evaluate it in the page once, then call:
     __measure('<css selector of a module or section>', ['.extra', '.selectors'])
         → root box + padding/background, text/media items (box relative to the root's top-left, font, size/line-height, weight, color),
           and one line per extra selector (box, background, radius, padding, gap)
     __checks()  → horizontal overflow + basic a11y checks for the whole page
     await __measureAt([1440, 1025, 768, 375], '<root selector>', ['.extra'])
         → the same measurements at EXACT viewport widths, each reported with the frame's real innerWidth.
           Use this instead of resizing the browser window: some browser panes (e.g. the Claude desktop built-in browser)
           do not change the page viewport when the window is resized. It loads the current page in same-origin iframes.
     await __measureAt([1440, 375], '<root>', [], { expected: [ {sel:'h2', fontSize:36, color:'#ffffff'}, {sel:'.card', w:392, padding:'28/28/28/28'} ] })
         → LOW-TOKEN MODE: pass the Figma values and only the DIFFERENCES come back (plus a one-line issues summary).
           `expected` can also be keyed by width: { 1440: [...], 375: [...] }. Keys: x y w h fontSize lineHeight fontWeight color bg radius padding gap.
   Compare with the Figma values (positions within ~6px). */
(() => {
  const dropBanners = (doc) => {
    // remove cookie banners without consenting
    doc.querySelectorAll('#hs-eu-cookie-confirmation, .cky-consent-container, #cookie-law-info-bar').forEach((e) => e.remove());
    [...doc.querySelectorAll('body > div')].filter((d) => /cookies? (are|is) used|cookie policy/i.test(d.textContent) && d.textContent.length < 2000).forEach((d) => d.remove());
    doc.documentElement.style.scrollBehavior = 'auto';
  };
  dropBanners(document);

  const hex = (c) => c.replace(/rgba?\(([^)]+)\)/, (_, v) => {
    const p = v.split(',').map((n) => parseFloat(n));
    const h = '#' + p.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
    return p.length > 3 && p[3] < 1 ? `${h}@${p[3]}` : h;
  });
  const px = (v) => parseFloat(v) || 0;
  const four = (cs, p) => ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(cs[p + s])).join('/');

  // `win` = the window to measure (the page itself, or an iframe's window)
  const measure = (rootSel, extra, win) => {
    const doc = win.document;
    const root = doc.querySelector(rootSel);
    if (!root) return `no element matches ${rootSel}`;
    const r0 = root.getBoundingClientRect();
    const R = (e) => { const r = e.getBoundingClientRect(); return [r.left - r0.left, r.top - r0.top, r.width, r.height].map(Math.round).join(','); };
    const rcs = win.getComputedStyle(root);
    const items = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button,li,img,svg')]
      .filter((e) => e.getBoundingClientRect().width && !(e.tagName.toLowerCase() !== 'svg' && e.closest('svg')))
      .slice(0, 80)
      .map((e) => {
        const c = win.getComputedStyle(e);
        const tag = e.tagName.toLowerCase();
        const cls = (e.getAttribute('class') || '').split(' ')[0];
        if (tag === 'img' || tag === 'svg') return `${tag}${cls ? '.' + cls : ''} ${R(e)} ${tag === 'img' ? (e.hasAttribute('alt') ? `alt="${e.alt.slice(0, 20)}"` : 'NO ALT') : ''}`;
        const txt = e.textContent.trim().slice(0, 24);
        return `${tag}${cls ? '.' + cls : ''} ${R(e)} "${txt}" ${c.fontFamily.split(',')[0].replace(/"/g, '')} ${c.fontSize}/${c.lineHeight === 'normal' ? 'normal' : (px(c.lineHeight) / px(c.fontSize)).toFixed(2)} ${c.fontWeight}${c.fontStyle === 'italic' ? 'i' : ''} ${hex(c.color)} ls:${c.letterSpacing}`;
      });
    const boxes = extra.flatMap((sel) => [...root.querySelectorAll(sel)].slice(0, 6).map((e, i) => {
      const c = win.getComputedStyle(e);
      return `${sel}[${i}] ${R(e)} bg ${hex(c.backgroundColor)} radius ${c.borderRadius} pad ${four(c, 'padding')} gap ${c.rowGap}/${c.columnGap} display ${c.display}`;
    }));
    return { W: win.innerWidth, root: `${rootSel} ${Math.round(r0.width)}x${Math.round(r0.height)} bg ${hex(rcs.backgroundColor)} pad ${four(rcs, 'padding')}`, items, boxes };
  };

  const checks = (win) => {
    const doc = win.document;
    const W = doc.documentElement.clientWidth;
    const clipped = (e) => { for (let p = e.parentElement; p && p !== doc.body; p = p.parentElement) { const o = win.getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'clip') return true; } return false; };
    const overflow = [...doc.querySelectorAll('body *')].filter((e) => {
      if (e.closest('svg') !== null && e.tagName.toLowerCase() !== 'svg') return false;
      const r = e.getBoundingClientRect();
      return r.width && (r.right > W + 1 || r.left < -1) && win.getComputedStyle(e).position !== 'fixed' && !e.closest('[aria-hidden="true"]') && !clipped(e);
    }).slice(0, 10).map((e) => e.tagName.toLowerCase() + '.' + (e.getAttribute('class') || '').split(' ')[0]);
    const heads = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.offsetParent);
    const levels = heads.map((h) => +h.tagName[1]);
    const skips = levels.map((l, i) => (i && l - levels[i - 1] > 1 ? `${heads[i - 1].tagName}→${heads[i].tagName} "${heads[i].textContent.trim().slice(0, 20)}"` : null)).filter(Boolean);
    const visible = (sel) => [...doc.querySelectorAll(sel)].filter((e) => e.offsetParent);
    return {
      W, scrollWidth: doc.documentElement.scrollWidth, overflow,
      h1Count: visible('h1').length,
      headingSkips: [...new Set(skips)].slice(0, 10),
      imgsNoAlt: visible('img').filter((i) => !i.hasAttribute('alt')).map((i) => i.src.split('/').pop()).slice(0, 10),
      vagueLinks: visible('a').filter((a) => /^(click here|here|read more|more|learn more)$/i.test(a.textContent.trim()) && !a.getAttribute('aria-label')).length,
      emptyLinks: visible('a,button').filter((a) => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""]), svg title')).length,
      focusable: visible('a[href],button,input,select,textarea').length,
    };
  };

  // compare measured values with the expected Figma values; returns ONLY the differences (keeps token use low)
  // expected item: { sel, i?, x, y, w, h, fontSize, lineHeight, fontWeight, color, bg, radius, padding: 't/r/b/l', gap, tol? }
  // x/y are relative to the root's top-left; numbers use `tol` px (default 6; font size/radius 1, line-height 0.05, weight exact)
  const deviations = (rootSel, expected, win) => {
    const root = win.document.querySelector(rootSel);
    if (!root) return [`no element matches ${rootSel}`];
    const r0 = root.getBoundingClientRect();
    const out = [];
    for (const ex of expected) {
      const name = `${ex.sel}[${ex.i || 0}]`;
      const el = [...root.querySelectorAll(ex.sel)][ex.i || 0];
      if (!el) { out.push(`${name}: missing`); continue; }
      const r = el.getBoundingClientRect();
      const c = win.getComputedStyle(el);
      const actual = {
        x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height,
        fontSize: px(c.fontSize), lineHeight: c.lineHeight === 'normal' ? 'normal' : px(c.lineHeight) / px(c.fontSize), fontWeight: c.fontWeight,
        color: hex(c.color), bg: hex(c.backgroundColor), radius: px(c.borderTopLeftRadius), padding: four(c, 'padding'), gap: px(c.rowGap),
      };
      for (const [k, v] of Object.entries(ex)) {
        if (k === 'sel' || k === 'i' || k === 'tol' || !(k in actual)) continue;
        const a = actual[k];
        const t = k === 'fontSize' || k === 'radius' ? 1 : k === 'lineHeight' ? 0.05 : k === 'fontWeight' ? 0 : (ex.tol ?? 6);
        const bad = typeof v === 'number' ? (a === 'normal' || Math.abs(Number(a) - v) > t) : String(a).toLowerCase() !== String(v).toLowerCase();
        if (bad) out.push(`${name} ${k}: expected ${v}, got ${typeof a === 'number' ? Math.round(a * 100) / 100 : a}`);
      }
    }
    return out;
  };
  const issues = (c) => {
    const o = {};
    if (c.overflow.length) o.overflow = c.overflow;
    if (c.scrollWidth > c.W) o.scrollWidth = `${c.scrollWidth} > ${c.W}`;
    if (c.h1Count > 1) o.h1Count = c.h1Count;
    if (c.headingSkips.length) o.headingSkips = c.headingSkips;
    if (c.imgsNoAlt.length) o.imgsNoAlt = c.imgsNoAlt;
    if (c.vagueLinks) o.vagueLinks = c.vagueLinks;
    if (c.emptyLinks) o.emptyLinks = c.emptyLinks;
    return Object.keys(o).length ? o : 'none';
  };

  window.__measure = (rootSel, extra = []) => measure(rootSel, extra, window);
  window.__checks = () => checks(window);

  // exact viewport widths via same-origin iframes (window resize may not change the viewport in some browser panes)
  window.__measureAt = async (widths, rootSel, extra = [], opts = {}) => {
    const out = {};
    for (const w of widths) {
      const f = document.createElement('iframe');
      f.style.cssText = `position:fixed;top:0;left:0;border:0;visibility:hidden;width:${w}px;height:${opts.height || 900}px`;
      f.src = location.href;
      document.body.appendChild(f);
      await new Promise((res) => { f.onload = res; f.onerror = res; });
      await new Promise((res) => setTimeout(res, opts.wait || 1000)); // let fonts/images/scripts settle
      try {
        dropBanners(f.contentDocument);
        const win = f.contentWindow;
        const exp = Array.isArray(opts.expected) ? opts.expected : opts.expected && opts.expected[w];
        if (exp) out[w] = { innerWidth: win.innerWidth, deviations: deviations(rootSel, exp, win), issues: issues(checks(win)) }; // compact: differences only
        else if (opts.expected) out[w] = { innerWidth: win.innerWidth, root: measure(rootSel, [], win).root, issues: issues(checks(win)) };
        else out[w] = { measure: measure(rootSel, extra, win), checks: checks(win) };
      }
      catch (e) { out[w] = `could not measure at ${w}px: ${e.message}`; }
      f.remove();
    }
    return out;
  };
  return 'ready: __measure(root, [extra]), __checks(), await __measureAt([widths], root, [extra])';
})();
