// Lints a classic HubSpot theme folder for the silent-failure cases hs cms upload does not catch.
// Usage: node lint.mjs <theme-dir>   (no dependencies; exit 1 on errors)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2] || 'theme';
const errors = [];
const warns = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warns.push(`${f}: ${m}`);

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

if (!existsSync(root)) { console.error(`No such folder: ${root}`); process.exit(1); }
const files = walk(root);

for (const f of files) if (['.json', '.html', '.css'].includes(extname(f).toLowerCase()) && readFileSync(f).subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) err(f, 'UTF-8 BOM at file start (save without BOM; it breaks JSON)');
for (const f of files) if (extname(f).toLowerCase() === '.webp') err(f, '.webp is rejected by hs cms upload (use jpg/png/svg)');

const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { err(f, `invalid JSON (${e.message})`); } };
const RESERVED = new Set(['name', 'label', 'body']); // HubSpot rejects these field names (upload error "field name cannot be 'body'")

// field types (HubSpot docs: module/theme fields). Unknown types only warn; types people commonly invent are errors.
const KNOWN_TYPES = new Set(['text', 'richtext', 'number', 'boolean', 'choice', 'color', 'image', 'link', 'url', 'video', 'group', 'font', 'icon', 'file', 'date', 'datetime', 'tag', 'blog', 'email', 'embed', 'form', 'gradient', 'logo', 'menu', 'simplemenu', 'page', 'spacing', 'alignment', 'textalignment', 'backgroundimage', 'border', 'cta', 'crmobject', 'crmobjectproperty', 'hubdbrow', 'hubdbtable', 'followupemail']);
const INVALID_TYPES = {
  textarea: 'for multi-line plain text use "text" with "allow_new_line": true, or "richtext"',
  string: 'use "text"', input: 'use "text"', textfield: 'use "text"', wysiwyg: 'use "richtext"', select: 'use "choice"', radio: 'use "choice"',
  checkbox: 'use "boolean"', toggle: 'use "boolean" with "display": "toggle"', int: 'use "number"', integer: 'use "number"', float: 'use "number"', object: 'use "group"', repeater: 'use "group" with "occurrence"',
};

// fields.json: reserved names, CtaField, visibility paths, occurrence+default on a non-group field
function lintFields(f) {
  const fields = readJson(f);
  if (!fields) return;
  if (!Array.isArray(fields) || fields.length === 0) return err(f, 'must be a non-empty array');
  const paths = new Set();
  const collect = (list, prefix) => list.forEach((x) => {
    const p = prefix ? `${prefix}.${x.name}` : x.name;
    paths.add(p);
    if (x.children) collect(x.children, p);
  });
  collect(fields, '');
  const check = (list, prefix) => list.forEach((x) => {
    const p = prefix ? `${prefix}.${x.name}` : x.name;
    if (RESERVED.has(x.name)) err(f, `field "${p}": name "${x.name}" is reserved and silently dropped`);
    if (!x.label) err(f, `field "${p}": missing "label" (HubSpot rejects the whole fields.json)`);
    if (!x.type) err(f, `field "${p}": missing "type"`);
    else if (INVALID_TYPES[x.type]) err(f, `field "${p}": type "${x.type}" is not a HubSpot field type (${INVALID_TYPES[x.type]})`);
    else if (!KNOWN_TYPES.has(x.type)) warn(f, `field "${p}": unrecognized type "${x.type}" (check the HubSpot field docs; unknown types fail the upload)`);
    if (x.type === 'cta') err(f, `field "${p}": CtaField needs a higher account tier (use a link field)`);
    const cp = x.visibility?.controlling_field_path;
    if (cp && !paths.has(cp)) err(f, `field "${p}": visibility.controlling_field_path "${cp}" not found (must be absolute from the fields root, no array index)`);
    if (x.occurrence && x.type !== 'group' && Array.isArray(x.default) === false && x.occurrence.default > 1) warn(f, `field "${p}": occurrence on a non-group field clones one default; wrap in a group for different rows`);
    if (x.children) check(x.children, p);
  });
  check(fields, '');
}

for (const f of files) {
  const base = f.replace(/\\/g, '/');
  if (base.endsWith('/fields.json')) lintFields(f);
  if (base.endsWith('/meta.json') || base.endsWith('/theme.json')) readJson(f);
}

// a global prefers-reduced-motion rule (base.html / base.css) covers every module
const globalReduce = files.some((f) => !/\.module/.test(f) && /\.(html|css)$/.test(f) && /prefers-reduced-motion/.test(readFileSync(f, 'utf8')));

// classes defined in the shared stylesheet(s); modules should use them
const sharedClasses = new Set(files.filter((f) => f.endsWith('.css')).flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\.([a-z][\w-]*)/gi)].map((m) => m[1])));

// modules: only 3 files, inline CSS/JS structure
const moduleDirs = new Set(files.map((f) => f.replace(/\\/g, '/')).filter((f) => /\.module\//.test(f)).map((f) => f.slice(0, f.indexOf('.module/') + 7)));
for (const d of moduleDirs) {
  const present = readdirSync(d);
  for (const need of ['meta.json', 'fields.json', 'module.html']) if (!present.includes(need)) err(d, `missing ${need}`);
  for (const p of present) if (!['meta.json', 'fields.json', 'module.html'].includes(p)) err(d, `extra file "${p}" (modules are 3 files; CSS/JS go inline in module.html)`);
  const html = existsSync(join(d, 'module.html')) ? readFileSync(join(d, 'module.html'), 'utf8') : '';
  const count = (re) => (html.match(re) || []).length;
  if (count(/\{%\s*scope_css\s*%\}/g) !== count(/\{%\s*end_scope_css\s*%\}/g)) err(d, 'unbalanced scope_css / end_scope_css');
  if (count(/\{%\s*require_css\s*%\}/g) !== count(/\{%\s*end_require_css\s*%\}/g)) err(d, 'unbalanced require_css / end_require_css');
  if (/<link[^>]+rel=["']stylesheet/i.test(html)) warn(d, 'external <link rel="stylesheet"> in module (shared CSS belongs in css/base.css)');
  const plain = html.replace(/\{\{[^}]*\}\}/g, 'X').replace(/\{%[^%]*%\}/g, '');
  for (const m of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/img|image|photo|media|thumb|wrap|frame|portrait|avatar|logo/i.test(m[1])) continue; // image crops are fine
    if (/overflow\s*:\s*(hidden|clip)/.test(m[2]) && /aspect-ratio/.test(m[2])) warn(d, 'overflow hidden/clip together with aspect-ratio in one rule: content gets clipped when text wraps more than in the design');
  }
  const used = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
  if (sharedClasses.size && ![...used].some((c) => sharedClasses.has(c))) warn(d, 'uses no class from the shared stylesheet (css/base.css): check for existing patterns (eyebrow, link-*, button--*, text-*) before writing module CSS');
  // code standard (see module-reference.md)
  const css = [...plain.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const js = [...plain.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
  const markup = plain.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  for (const img of markup.match(/<img\b[^>]*>/gi) || []) {
    if (!/\balt=/.test(img)) err(d, `<img> without alt attribute: ${img.slice(0, 60)}`);
    else if (!/\b(loading|fetchpriority)=/.test(img)) warn(d, '<img> without loading="lazy" (or fetchpriority="high" for the LCP image)');
  }
  if (/!important/.test(css)) warn(d, '!important in module CSS (fix the specificity instead)');
  if (/\bfloat\s*:|\bclear\s*:/.test(css)) warn(d, 'float/clear in module CSS (use flex or grid)');
  if (/(transition|animation)\s*:/.test(css) && !/prefers-reduced-motion/.test(css) && !globalReduce) warn(d, 'transition/animation without a prefers-reduced-motion rule');
  for (const st of markup.matchAll(/\sstyle="([^"]*)"/g)) if (st[1].replace(/--[\w-]+\s*:\s*[^;]*;?/g, '').trim()) warn(d, `inline style besides CSS custom properties: style="${st[1].slice(0, 50)}"`);
  if (/\son(click|mouseover|mouseout|load|change)=/i.test(markup)) warn(d, 'inline event handler attribute (use addEventListener in the module script)');
  if (/<\/?(center|font|b|i|big|marquee)\b/i.test(markup)) warn(d, 'obsolete/presentational tag (center/font/b/i/big/marquee): use CSS and strong/em');
  if (/\bjQuery\b|\$\(|\$\./.test(js)) warn(d, 'jQuery in module script (use vanilla JS)');
  if (/(^|[\s;(])var\s/.test(js)) warn(d, '`var` in module script (use const/let)');
  if (/document\.write/.test(js)) err(d, 'document.write in module script');
  if (/\{\{\s*module\.(name|label)\b/.test(html)) warn(d, 'module.name/module.label referenced (reserved field names)');
}

// templates: dnd_section full_width + max_width
for (const f of files.filter((x) => x.replace(/\\/g, '/').includes('/templates/') && x.endsWith('.html'))) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(/\{%\s*dnd_section([\s\S]*?)%\}/g)) {
    if (/full_width\s*=\s*true/.test(m[1]) && /max_width\s*=/.test(m[1])) err(f, 'dnd_section sets both full_width=true and max_width (mutually exclusive)');
  }
}

warns.forEach((w) => console.log(`WARN  ${w}`));
errors.forEach((e) => console.log(`ERROR ${e}`));
console.log(`\n${errors.length} error(s), ${warns.length} warning(s), ${moduleDirs.size} module(s) checked.`);
process.exit(errors.length ? 1 : 0);
