#!/usr/bin/env node
// Setup helper for the elementor-figma plugin. No dependencies, cross-platform (Node 18+).
//   node setup.mjs doctor                         check Node, Claude CLI, Elementor MCP servers, Figma plugin/MCP
//   node setup.mjs servers                        list connected Elementor MCP servers as JSON
//   node setup.mjs connect --name <server> --url <https://site> [--replace] [--media-upload]
//        run it in YOUR terminal: asks for the WordPress username + Application Password (hidden), checks them
//        against the site, then runs `claude mcp add` (user scope). Secrets never appear in chat or JSON output.
//   node setup.mjs install-figma                  claude plugin install figma@claude-plugins-official
//   node setup.mjs update                       update the installed plugin from the marketplace
//   node setup.mjs refresh [--dry-run]          re-copy tools/docs from the installed plugin into this project
//   node setup.mjs init --name "Site" --url <https://site> --server <server> [--figma <url>] [--auth-env VAR] [--dir .]
// Last line of every command (except connect's prompts) is JSON for Claude; lines above are for humans.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const here = dirname(fileURLToPath(import.meta.url));
const tpl = join(here, 'templates');
const buildDir = join(here, '..', 'build');
const PLUGIN = 'elementor-figma';
// files copied from the plugin into every project (so reads/runs stay inside the project folder)
const SHARED = [['measure.js', 'tools/measure.js'], ['upload-media.mjs', 'tools/upload-media.mjs']];

const q = (a) => `"${String(a).replace(/"/g, '')}"`;
const sh = (cmd, cwd) => {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', cwd });
  return { ok: r.status === 0, text: `${r.stdout || ''}\n${r.stderr || ''}`.trim() };
};
const done = (obj, ok = true) => { console.log(JSON.stringify(obj)); process.exit(ok ? 0 : 1); };
const fail = (msg, extra = {}) => { console.error(`✖ ${msg}`); done({ ok: false, error: msg, ...extra }, false); };
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; };
const flag = (name) => process.argv.includes(`--${name}`);
const nodeOk = () => Number(process.versions.node.split('.')[0]) >= 18;
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ---- Claude CLI state (may be missing for desktop-only users: then "unknown", never an error) ----
const claudeCli = () => sh('claude --version').ok;
function mcpLines() { const r = sh('claude mcp list'); return r.ok ? r.text.split('\n') : null; }
function statusOf(line) {
  const s = line.slice(line.lastIndexOf(' - ') + 3);
  if (/needs auth/i.test(s)) return 'needs-auth';
  return /connected/i.test(s) && !/fail/i.test(s) ? 'ok' : 'failing';
}
function elementorServers(lines) {
  return (lines || []).filter((l) => /elementor(\/|%2F)mcp/i.test(l)).map((l) => {
    const i = l.search(/:\s+https?:\/\//);
    return { name: l.slice(0, i).trim(), url: (l.slice(i + 1).match(/https?:\/\/\S+/) || [''])[0], state: statusOf(l) };
  });
}
const figmaMcp = (lines) => { if (!lines) return 'unknown'; const l = lines.find((x) => /mcp\.figma\.com/i.test(x)); return l ? statusOf(l) : 'missing'; };
const figmaPlugin = () => { const r = sh('claude plugin list'); return r.ok ? /(?<![\w-])figma@\S+/i.test(r.text) : null; };

function doctor() {
  const hasClaude = claudeCli();
  const lines = hasClaude ? mcpLines() : null;
  const servers = elementorServers(lines);
  const fMcp = figmaMcp(lines);
  const fPlugin = hasClaude ? figmaPlugin() : null;
  const next = [];
  if (!nodeOk()) next.push('Install Node.js 18+ from https://nodejs.org, then reopen the terminal.');
  if (lines && !servers.length) next.push('No Elementor MCP server connected: the user runs `node "<this folder>/setup.mjs" connect --name <server-name> --url https://<site>` in a terminal (desktop app: Terminal panel), types the WordPress username + Application Password there, then starts a NEW Claude session.');
  servers.filter((s) => s.state !== 'ok').forEach((s) => next.push(`Elementor server "${s.name}" is ${s.state}: wrong/revoked Application Password, site without HTTPS, or a security plugin blocking the REST API. Reconnect with \`connect --name ${s.name} --url <site> --replace\`.`));
  if (fPlugin === false && fMcp !== 'ok') next.push('Figma plugin missing (provides the Figma MCP and the figma-design-to-code skill): run `node setup.mjs install-figma`, then start a NEW Claude session.');
  if (fMcp === 'needs-auth') next.push('Figma MCP needs sign-in: desktop app → Connectors panel → Figma → Authenticate; CLI session → `/mcp` → figma.');
  if (fMcp === 'failing') next.push('Figma MCP is failing: reconnect it (desktop app: Connectors panel; CLI: `/mcp`).');
  const stale = staleWarning(resolve(arg('dir', '.')));
  if (stale) next.push(stale);
  const mark = (ok) => (ok ? '✔' : '✖');
  console.log([
    `${mark(nodeOk())} Node ${process.versions.node}`,
    `${hasClaude ? '✔' : '?'} claude CLI ${hasClaude ? 'found' : 'not on PATH (MCP checks skipped)'}`,
    `${servers.length && servers.every((s) => s.state === 'ok') ? '✔' : '✖'} Elementor MCP servers: ${servers.map((s) => `${s.name} (${s.state})`).join(', ') || 'none'}`,
    `${fMcp === 'ok' ? '✔' : fMcp === 'unknown' ? '?' : '✖'} Figma MCP: ${fMcp}${fPlugin === false ? ' (plugin missing)' : ''}`,
  ].join('\n'));
  next.forEach((n) => console.log(`→ ${n}`));
  console.log('Optional: browser access for measuring pages: the desktop app built-in browser pane, or the Claude in Chrome extension (https://chromewebstore.google.com/detail/fcoeoabgfenejglbffodgkkbkcdhcgfn).');
  done({ ok: !next.length, node: process.versions.node, servers, figmaMcp: fMcp, figmaPlugin: fPlugin, next });
}

// ---- connect: credentials only ever typed in the user's terminal ----
function ask(question, hidden) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => process.stdout.write(s.includes(question) ? s : '*');
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); res(a.trim()); });
  });
}
async function readCredentials() {
  if (flag('stdin') || !process.stdin.isTTY) { // non-interactive (tests): two lines "user" / "application password"
    const lines = readFileSync(0, 'utf8').split(/\r?\n/);
    return { user: (lines[0] || '').trim(), pass: (lines[1] || '').trim() };
  }
  console.log('Create an Application Password in WordPress: Users → Profile → Application Passwords. Each person uses their own.\n');
  return { user: await ask('WordPress username: ', false), pass: await ask('Application Password: ', true) };
}

async function connect() {
  const name = arg('name');
  const site = (arg('url') || '').replace(/\/+$/, '');
  if (!name || !site) fail('Usage: connect --name <server-name, e.g. clientx-elementor> --url https://<site> [--replace] [--media-upload]');
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) fail(`Invalid server name "${name}" (letters, digits, - or _)`);
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(site) || /\.(local|test|localhost)(:\d+)?(\/|$)/i.test(site);
  if (!/^https:\/\//i.test(site) && !local) fail('The site must use https:// (WordPress Application Passwords need HTTPS; for a local site use its .local/.test/localhost address).');
  if (!claudeCli()) fail('`claude` command not found on PATH. Install it: macOS/Linux `curl -fsSL https://claude.ai/install.sh | bash`, Windows PowerShell `irm https://claude.ai/install.ps1 | iex`; then reopen the terminal.');
  const existing = (mcpLines() || []).some((l) => l.startsWith(`${name}:`));
  if (existing && !flag('replace')) fail(`A server named "${name}" already exists. Use --replace to reconnect it, or pick another name.`);

  const { user, pass } = await readCredentials();
  if (!user || !pass) fail('Username and Application Password are both required.');
  const b64 = Buffer.from(`${user}:${pass}`).toString('base64');

  let res;
  try { res = await fetch(`${site}/wp-json/wp/v2/users/me`, { headers: { Authorization: `Basic ${b64}` } }); }
  catch (e) { fail(`Could not reach ${site}: ${e.cause?.code || e.message}`); }
  if (res.status === 401 || res.status === 403) fail(`The site rejected the credentials (HTTP ${res.status}). Check the username (not the email), the Application Password, and that no security plugin blocks the REST API.`);
  if (!res.ok) fail(`Unexpected answer from ${site}/wp-json/wp/v2/users/me: HTTP ${res.status}`);
  console.log('✔ Credentials accepted by the site.');
  try {
    const root = await (await fetch(`${site}/wp-json/`, { headers: { Authorization: `Basic ${b64}` } })).json();
    if (!JSON.stringify([...(root.namespaces || []), ...Object.keys(root.routes || {})]).includes('elementor/mcp')) console.log('! Elementor MCP endpoint not listed by the site: enable it in Elementor (MCP / AI settings) and make sure V4 + Pro are active.');
  } catch { /* non-fatal */ }

  if (existing) sh(`claude mcp remove ${q(name)} -s user`);
  const addArgs = ['mcp', 'add', '--transport', 'http', '--scope', 'user', name, `${site}/wp-json/elementor/mcp/`, '--header', `Authorization: Basic ${b64}`];
  let add = spawnSync('claude', addArgs, { encoding: 'utf8' });
  if (add.error?.code === 'ENOENT') add = spawnSync(`claude ${addArgs.map(q).join(' ')}`, { encoding: 'utf8', shell: true }); // claude installed as a .cmd shim
  if (add.error || add.status !== 0) fail(`claude mcp add failed: ${(add.stderr || add.error?.message || '').trim().split('\n')[0]}`);
  console.log(`✔ Server "${name}" added (user scope).`);

  let envName = null;
  if (flag('media-upload')) {
    envName = `WP_AUTH_${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
    if (process.platform === 'win32') { const r = sh(`setx ${envName} ${q(`${user}:${pass}`)}`); console.log(r.ok ? `✔ ${envName} set for your Windows user (open a NEW terminal / restart Claude).` : '✖ Could not set the env var; set it manually (see README).'); }
    else console.log(`Add this line to your shell profile (~/.zshrc or ~/.bashrc), with your real Application Password:\n  export ${envName}="${user}:<application password>"`);
  }
  console.log('Next: start a NEW Claude session (MCP servers load at session start), then rerun `doctor`.');
  done({ ok: true, name, url: `${site}/wp-json/elementor/mcp/`, mediaUploadEnv: envName }); // never includes credentials
}


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

// ---- init: project files from templates ----
const fill = (text, vars) => Object.entries(vars).reduce((t, [k, v]) => t.split(k).join(v), text);
function put(src, dest, vars) { mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, fill(readFileSync(src, 'utf8'), vars)); } // utf8, no BOM

function init() {
  const name = arg('name');
  const url = (arg('url') || '').replace(/\/+$/, '');
  const server = arg('server');
  const dir = resolve(arg('dir', '.'));
  const figma = arg('figma', 'none yet');
  const authEnv = arg('auth-env', 'not set');
  if (!name || !url || !server) fail('Usage: init --name "<site name>" --url <https://site> --server <mcp server name> [--figma <url>] [--auth-env <VAR>] [--dir <path>]');
  if (existsSync(join(dir, 'CLAUDE.md'))) fail('This folder already has a CLAUDE.md. Not overwriting.');
  if (!flag('offline')) {
    const lines = mcpLines();
    if (lines && !elementorServers(lines).some((s) => s.name === server)) fail(`No Elementor MCP server named "${server}" is connected. Run \`connect\` first.`, { servers: elementorServers(lines) });
  }
  const vars = { '{{SITE_NAME}}': name, '{{SITE_URL}}': url, '{{SERVER}}': server, '{{FIGMA}}': figma, '{{DATE}}': new Date().toISOString().slice(0, 10), '{{AUTH_ENV}}': authEnv };
  mkdirSync(dir, { recursive: true });
  put(join(tpl, 'CLAUDE.md.tpl'), join(dir, 'CLAUDE.md'), vars);
  put(join(tpl, 'progress.md.tpl'), join(dir, 'docs', 'progress.md'), vars);
  put(join(tpl, 'document-template.md'), join(dir, 'docs', '_document-template.md'), vars);
  writeFileSync(join(dir, 'docs', 'design-tokens.md'), `# Design tokens — ${name}\n\n_none yet. Claude fills this from \`elementor://global-variables\` and \`elementor://global-classes\` (see the setup skill)._\n`);
  put(join(tpl, 'settings.json.tpl'), join(dir, '.claude', 'settings.json'), vars);
  put(join(tpl, 'gitignore.tpl'), join(dir, '.gitignore'), vars);
  for (const [src, dst] of SHARED) { mkdirSync(dirname(join(dir, dst)), { recursive: true }); cpSync(join(buildDir, src), join(dir, dst)); }
  writeStamp(dir);
  const top = sh('git rev-parse --show-toplevel', dir); // each site gets its own repo
  const git = top.ok && resolve(top.text) === dir ? 'existing' : (sh('git init', dir).ok ? 'initialized' : 'failed');
  console.log(`Project created in ${dir}\nServer: ${server} · Site: ${url}\n${git === 'failed' ? '✖' : '✔'} git repo (${git})\nNothing was changed on the site.`);
  done({ ok: git !== 'failed', dir, server, url, git });
}

const cmd = process.argv[2];
if (cmd === 'doctor') doctor();
else if (cmd === 'servers') done({ ok: true, servers: elementorServers(mcpLines()) });
else if (cmd === 'connect') await connect();
else if (cmd === 'install-figma') { const r = sh('claude plugin install figma@claude-plugins-official'); console.log(r.text); done({ ok: r.ok, note: 'Start a new Claude session, then sign in to figma.' }, r.ok); }
else if (cmd === 'refresh') refresh();
else if (cmd === 'update') update();
else if (cmd === 'init') init();
else fail('Commands: doctor | refresh | update | servers | connect --name <server> --url <https://site> | install-figma | init --name <site> --url <https://site> --server <server>');
