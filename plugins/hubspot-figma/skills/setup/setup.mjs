#!/usr/bin/env node
// Setup helper for the hubspot-figma plugin. No dependencies, cross-platform (Node 18+).
//   node setup.mjs doctor                       check Node, HubSpot CLI, connected portals; prints next steps
//   node setup.mjs accounts                     list connected portals as JSON
//   node setup.mjs install-hs                   npm install -g @hubspot/cli
//   node setup.mjs install-figma                claude plugin install figma@claude-plugins-official
//   node setup.mjs install-docs-mcp             claude mcp add HubSpotDev (official HubSpot docs for Claude)
//   node setup.mjs update                       update the installed plugin from the marketplace
//   node setup.mjs refresh [--dry-run]          re-copy tools/docs from the installed plugin into this project
//   node setup.mjs init --name "Acme" --account <portal id> [--dest acme] [--figma <url>] [--dir .] [--offline]
// Last line of every command is JSON (for Claude); everything above it is for humans.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const tpl = join(here, 'templates');
const buildDir = join(here, '..', 'build');
const PLUGIN = 'hubspot-figma';
// files copied from the plugin into every project (so reads/runs stay inside the project folder)
const SHARED = [['lint.mjs', 'tools/lint.mjs'], ['optimize-images.mjs', 'tools/optimize-images.mjs'], ['measure.js', 'tools/measure.js'], ['compare-images.mjs', 'tools/compare-images.mjs'], ['module-reference.md', 'docs/module-reference.md']];

const NOISE = /ExperimentalWarning|--trace-warnings|DEP0040|punycode/;
const q = (a) => `"${String(a).replace(/"/g, '')}"`;
// shell:true so Windows resolves hs.cmd / npm.cmd; args are quoted by hand (Node 22 deprecates args + shell)
const sh = (cmd, cwd) => {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', cwd });
  const text = `${r.stdout || ''}\n${r.stderr || ''}`.split('\n').filter((l) => !NOISE.test(l)).join('\n').trim();
  return { ok: r.status === 0, text };
};
const done = (obj, ok = true) => { console.log(JSON.stringify(obj)); process.exit(ok ? 0 : 1); };
const fail = (msg, extra = {}) => { console.error(`✖ ${msg}`); done({ ok: false, error: msg, ...extra }, false); };

function nodeOk() { return Number(process.versions.node.split('.')[0]) >= 18; }
function hsVersion() { const r = sh('hs --version'); return r.ok ? r.text.split('\n').pop().trim() : null; }
function accounts() {
  const r = sh('hs account list');
  if (!r.ok) return [];
  const rows = r.text.split(/\r?\n/);
  const start = rows.findIndex((l) => /^Accounts:/.test(l.trim()));
  return rows.slice(start + 1).map((l) => l.match(/^\s+(.+?)\s+(\d{5,})\s+\S+\s*$/)).filter(Boolean).map((m) => ({ name: m[1].replace(/\s*\[[^\]]*\]\s*$/, '').trim(), id: Number(m[2]) }));
}

// `claude` may be missing (desktop-app-only users): then MCP/plugin checks are "unknown", never an error
function claudeCli() { return sh('claude --version').ok; }
function mcpState(re) {
  const r = sh('claude mcp list');
  if (!r.ok) return 'unknown';
  const line = r.text.split('\n').find((l) => re.test(l));
  if (!line) return 'missing';
  const status = line.slice(line.lastIndexOf(' - ') + 3);
  if (/needs auth/i.test(status)) return 'needs-auth';
  return /connected/i.test(status) && !/fail/i.test(status) ? 'ok' : 'failing';
}
function pluginInstalled(re) { const r = sh('claude plugin list'); return r.ok ? r.text.split('\n').some((l) => re.test(l)) : null; }

function doctor() {
  const hs = hsVersion();
  const accs = hs ? accounts() : [];
  const hasClaude = claudeCli();
  const figmaMcp = hasClaude ? mcpState(/mcp\.figma\.com/i) : 'unknown';
  const docsMcp = hasClaude ? mcpState(/hs mcp start|HubSpotDev/i) : 'unknown';
  const figmaPlugin = hasClaude ? pluginInstalled(/(?<![\w-])figma@\S+/i) : null;
  const next = [];
  if (!nodeOk()) next.push('Install Node.js 18+ from https://nodejs.org, then reopen the terminal.');
  if (!hs) next.push('HubSpot CLI missing: run `node setup.mjs install-hs` (= npm install -g @hubspot/cli), then reopen the terminal.');
  else {
    if (Number(hs.split('.')[0]) < 8) next.push(`HubSpot CLI ${hs} is too old (needs 8+ for \`hs cms\`): run \`node setup.mjs install-hs\` to update.`);
    if (!accs.length) next.push(`No HubSpot portal connected: run \`${existsSync(join(homedir(), '.hscli')) ? 'hs account auth' : 'hs init'}\` in a terminal (it opens the browser; log in and authorize), then rerun doctor.`);
  }
  if (figmaPlugin === false && figmaMcp !== 'ok') next.push('Figma plugin missing (provides the Figma MCP and the figma-design-to-code skill): run `node setup.mjs install-figma`, then start a NEW Claude session.');
  if (figmaMcp === 'missing' && figmaPlugin !== false) next.push('Figma MCP not configured: run `node setup.mjs install-figma`, then start a NEW Claude session.');
  if (figmaMcp === 'needs-auth') next.push('Figma MCP needs sign-in: sign in to Figma (desktop app: Connectors panel → Figma → Authenticate; CLI: `/mcp` → figma) with an account that can open the design files.');
  if (figmaMcp === 'failing') next.push('Figma MCP is failing: reconnect figma (desktop app: Connectors panel; CLI: `/mcp`).');
  if (hs && docsMcp === 'missing') next.push('HubSpot docs MCP missing (lets Claude look up official docs): run `node setup.mjs install-docs-mcp`, then start a NEW Claude session.');
  if (docsMcp === 'failing') next.push('HubSpot docs MCP is failing: reconnect HubSpotDev (desktop app: Connectors panel; CLI: `/mcp`) or run `hs mcp setup` in a terminal.');
  const stale = staleWarning(resolve(arg('dir', '.')));
  if (stale) next.push(stale);
  const mark = (ok) => (ok ? '✔' : '✖');
  console.log([
    `${mark(nodeOk())} Node ${process.versions.node}`,
    `${mark(hs)} HubSpot CLI ${hs || 'not found'}`,
    `${mark(accs.length)} Portals: ${accs.map((a) => `${a.name} (${a.id})`).join(', ') || 'none'}`,
    `${figmaMcp === 'ok' ? '✔' : figmaMcp === 'unknown' ? '?' : '✖'} Figma MCP: ${figmaMcp}${figmaPlugin === false ? ' (plugin missing)' : ''}`,
    `${docsMcp === 'ok' ? '✔' : docsMcp === 'unknown' ? '?' : '✖'} HubSpot docs MCP: ${docsMcp}`,
  ].join('\n'));
  if (!hasClaude) console.log('? `claude` command not found on PATH: Figma/docs checks skipped. Install it: macOS/Linux `curl -fsSL https://claude.ai/install.sh | bash`, Windows PowerShell `irm https://claude.ai/install.ps1 | iex`; then reopen the terminal.');
  next.forEach((n) => console.log(`→ ${n}`));
  console.log('Optional: Claude in Chrome extension, or the desktop app built-in browser pane after signing in to HubSpot there (lets Claude check the HubSpot preview itself): https://chromewebstore.google.com/detail/fcoeoabgfenejglbffodgkkbkcdhcgfn');
  done({ ok: !next.length, node: process.versions.node, hs, accounts: accs, figmaMcp, figmaPlugin, docsMcp, next });
}

const flag = (n) => process.argv.includes(`--${n}`);

// ---- project copies stay current: version stamp, refresh, update ----
const pluginVersion = () => JSON.parse(readFileSync(join(here, '..', '..', '.claude-plugin', 'plugin.json'), 'utf8')).version;
const stampPath = (dir) => join(dir, '.stoica-plugin.json');
const writeStamp = (dir) => writeFileSync(stampPath(dir), JSON.stringify({ plugin: PLUGIN, version: pluginVersion() }, null, 2) + '\n');
function staleWarning(dir = process.cwd()) {
  try {
    const s = JSON.parse(readFileSync(stampPath(dir), 'utf8'));
    if (s.plugin === PLUGIN && s.version !== pluginVersion()) return `This project's tools/docs come from ${PLUGIN} ${s.version}; the installed plugin is ${pluginVersion()}. Run \`node "<this folder>/setup.mjs" refresh\` in the project folder (add --dry-run to preview).`;
  } catch { /* not a project folder */ }
  return null;
}

// copy the shared files again from the installed plugin (never touches theme/ or site content)
function refresh() {
  const dir = resolve(arg('dir', '.'));
  if (!existsSync(stampPath(dir))) fail('Not a project created by this plugin (no .stoica-plugin.json). Run this inside the project folder or pass --dir.');
  const dry = flag('dry-run');
  const changed = [];
  for (const [src, dst] of SHARED) {
    const next = readFileSync(join(buildDir, src), 'utf8');
    const target = join(dir, dst);
    if (existsSync(target) && readFileSync(target, 'utf8') === next) continue;
    changed.push(dst);
    if (!dry) { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, next); }
  }
  if (!dry) writeStamp(dir);
  console.log(changed.length ? `${dry ? 'Would update' : 'Updated'}: ${changed.join(', ')}` : 'Already up to date.');
  done({ ok: true, dry, changed, version: pluginVersion() });
}

// update the installed plugin from the marketplace (a new Claude session is needed to load it)
function update() {
  if (!claudeCli()) fail('`claude` command not found on PATH. Install it: macOS/Linux `curl -fsSL https://claude.ai/install.sh | bash`, Windows PowerShell `irm https://claude.ai/install.ps1 | iex`; then reopen the terminal. Then update: claude plugin marketplace update stoica && claude plugin update ' + PLUGIN + '@stoica');
  const before = pluginVersion();
  const m = sh('claude plugin marketplace update stoica');
  const u = sh(`claude plugin update ${PLUGIN}@stoica`);
  console.log([m.text, u.text].filter(Boolean).join('\n'));
  done({ ok: m.ok && u.ok, before, note: 'Start a NEW Claude session to load the new version, then run `refresh` in each project.' }, m.ok && u.ok);
}

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function arg(name, def) { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; }

// copy a text template, replacing {{KEY}} (templates) or __SITE_NAME__ (theme files)
function fill(text, vars) { return Object.entries(vars).reduce((t, [k, v]) => t.split(k).join(v), text); }
const TEXT = new Set(['.json', '.html', '.css', '.md']);
function replaceInTree(dir, vars) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) replaceInTree(p, vars);
    else if (TEXT.has(extname(p).toLowerCase())) writeFileSync(p, fill(readFileSync(p, 'utf8'), vars)); // utf8, no BOM
  }
}
function put(src, dest, vars) {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, fill(readFileSync(src, 'utf8'), vars));
}

function init() {
  const name = arg('name');
  const id = Number(arg('account'));
  const dir = resolve(arg('dir', '.'));
  const dest = arg('dest', slugify(name || ''));
  const figma = arg('figma', 'none yet');
  const offline = process.argv.includes('--offline'); // tests only: skips portal checks
  if (!name || !id) fail('Usage: init --name "<client>" --account <portal id> [--dest <folder>] [--figma <url>] [--dir <path>]');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(dest)) fail(`Invalid Design Manager folder "${dest}" (use lowercase letters, digits, - or _)`);
  if (!nodeOk()) fail('Node 18+ required');
  if (existsSync(join(dir, 'theme')) || existsSync(join(dir, 'CLAUDE.md'))) fail('This folder already has theme/ or CLAUDE.md. Not overwriting.');

  let account = { name: String(id), id };
  if (!offline) {
    if (!hsVersion()) fail('HubSpot CLI not found. Run `node setup.mjs install-hs` first.');
    account = accounts().find((a) => a.id === id);
    if (!account) fail(`Portal ${id} is not connected on this machine. Run \`hs account auth\` in a terminal, then retry.`, { accounts: accounts() });
    const ls = sh(`hs cms ls ${q(dest)} --account=${id}`);
    if (ls.ok) fail(`"${dest}" already exists in portal ${account.name} (${id}). Choose another --dest; never overwrite a theme.`);
    if (!/not found|was not found/i.test(ls.text)) fail(`Could not check the portal: ${ls.text.split('\n')[0]}`);
  }

  const vars = {
    '{{SITE_NAME}}': name, '{{SLUG}}': slugify(name), '{{ACCOUNT_NAME}}': account.name, '{{ACCOUNT_ID}}': String(id),
    '{{DEST}}': dest, '{{FIGMA}}': figma, '{{DATE}}': new Date().toISOString().slice(0, 10),
  };
  mkdirSync(dir, { recursive: true });
  cpSync(join(tpl, 'theme'), join(dir, 'theme'), { recursive: true });
  replaceInTree(join(dir, 'theme'), { __SITE_NAME__: name });
  put(join(tpl, 'CLAUDE.md.tpl'), join(dir, 'CLAUDE.md'), vars);
  put(join(tpl, 'progress.md.tpl'), join(dir, 'docs', 'progress.md'), vars);
  put(join(tpl, 'package.json.tpl'), join(dir, 'package.json'), vars);
  put(join(tpl, 'gitignore.tpl'), join(dir, '.gitignore'), vars);
  put(join(tpl, 'settings.json.tpl'), join(dir, '.claude', 'settings.json'), vars);
  for (const [src, dst] of SHARED) put(join(buildDir, src), join(dir, dst), {});
  writeStamp(dir);

  const steps = [];
  if (!offline) steps.push(['portal pinned (.hsaccount)', sh(`hs account create-override ${id}`, dir).ok]); // pins this folder to the portal
  const top = sh('git rev-parse --show-toplevel', dir); // a parent repo is not enough: each client gets its own
  if (top.ok && resolve(top.text) === dir) steps.push(['git repo (existing)', true]);
  else steps.push(['git init', sh('git init', dir).ok]);
  if (!offline) steps.push(['npm install', sh('npm install --silent', dir).ok]);
  const lint = sh('node tools/lint.mjs theme', dir);
  steps.push([`lint: ${lint.text.split('\n').pop()}`, lint.ok]);

  console.log(`\nProject created in ${dir}\nPortal: ${account.name} (${id}) · Design Manager folder: ${dest} · upload mode: draft`);
  steps.forEach(([s, ok]) => console.log(`${ok ? '✔' : '✖'} ${s}`));
  console.log('Nothing was uploaded. Next: build from Figma, then `npm run upload` (draft) after your OK.');
  done({ ok: steps.every(([, ok]) => ok), dir, dest, account, steps: Object.fromEntries(steps) });
}

const cmd = process.argv[2];
if (cmd === 'doctor') doctor();
else if (cmd === 'accounts') done({ ok: true, accounts: accounts() });
else if (cmd === 'install-hs') {
  const r = sh('npm install -g @hubspot/cli');
  console.log(r.text);
  if (!r.ok && /EACCES|permission/i.test(r.text)) console.log('→ Permission denied (common on macOS/Linux). Either run `sudo npm install -g @hubspot/cli` in your terminal, or install Node with a version manager (nvm/fnm) so global installs need no sudo.');
  done({ ok: r.ok, hs: hsVersion() }, r.ok);
}
else if (cmd === 'install-figma') { const r = sh('claude plugin install figma@claude-plugins-official'); console.log(r.text); done({ ok: r.ok, note: 'Start a new Claude session, then run /mcp and sign in to figma.' }, r.ok); }
else if (cmd === 'install-docs-mcp') { const r = sh('claude mcp add HubSpotDev -s user -- hs mcp start --ai-agent claude'); console.log(r.text); done({ ok: r.ok, note: 'Start a new Claude session to load it.' }, r.ok); }
else if (cmd === 'refresh') refresh();
else if (cmd === 'update') update();
else if (cmd === 'init') init();
else fail('Commands: doctor | refresh | update | accounts | install-hs | install-figma | install-docs-mcp | init --name <client> --account <id> [--dest <folder>] [--figma <url>] [--dir <path>]');
