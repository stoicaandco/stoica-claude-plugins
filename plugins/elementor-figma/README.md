# elementor-figma

Builds, compares and fixes **Elementor (V4)** websites from Figma through the Elementor MCP server — per-site setup, page/section workflow, full site build, media upload, responsive + accessibility checks.

## 1. Requirements (once per person)

| Need | Why | How |
|---|---|---|
| Claude Code + this plugin | Runs the workflow | See the [main README](../../README.md) |
| **Node.js 18+** | Media upload script | `node -v` to check |
| **Figma plugin + MCP** | Reading designs | Claude checks and installs it; you sign in once (desktop app: Connectors panel → Figma → Authenticate; CLI session: `/mcp`). The Figma account must be able to open the design files |
| **Browser access** | Measuring pages at 1440 / 1025 / 768 / 375 | Desktop app: the built-in browser pane, or the Claude in Chrome extension (`/chrome` in a CLI session) |

## 2. Connect a website (once per site, per person)

### 2.1 WordPress requirements
- HTTPS (Application Passwords need it; for local sites use the host's HTTPS option or `WP_ENVIRONMENT_TYPE=local`).
- **Elementor** with the **V4 / atomic editor** enabled, and **Elementor Pro** (header/footer/templates, components).
- The **Elementor MCP** endpoint enabled: `https://<site>/wp-json/elementor/mcp/`.
- Optional for uploading SVGs: an SVG plugin (e.g. Safe SVG).

### 2.2 Application Password
WordPress → **Users → Profile → Application Passwords** → name it (e.g. "Claude – <your name>") → copy the password.
Each person creates **their own**. Never share it, never commit it, revoke it when no longer needed.

### 2.3 Add the Elementor connection
Use a unique server name per site, e.g. `clientx-elementor`. **Easiest:** just ask Claude to set up the site: it checks what is missing and tells you to run one command in your terminal (desktop app: the Terminal panel):

```bash
node "<plugin folder>/skills/setup/setup.mjs" connect --name clientx-elementor --url https://clientx.com --media-upload
```
Claude prints this command with the real path filled in (the plugin lives under `~/.claude/plugins/cache/stoica/elementor-figma/<version>/`). It asks for the WordPress username and Application Password (hidden), checks them against the site, adds the server and (with `--media-upload`) sets the upload env var. The password never goes through chat. Add `--replace` to reconnect an existing server. Start a **new session** afterwards. Manual alternative:

1. Base64 of `username:application password`:
   - PowerShell: `[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("user:xxxx xxxx xxxx xxxx xxxx xxxx"))`
   - macOS/Linux: `printf 'user:xxxx xxxx xxxx xxxx xxxx xxxx' | base64`
2. Add it for all projects (user scope):
   ```bash
   claude mcp add --transport http --scope user clientx-elementor https://clientx.com/wp-json/elementor/mcp/ --header "Authorization: Basic <base64>"
   ```
   (Alternative: paste the "connect Claude" prompt from Elementor's MCP screen into Claude Code — just change the server name and ask for **user scope / top-level `mcpServers`**.)
3. Check: `claude mcp list` → `clientx-elementor … connected`.

### 2.4 Media uploads (optional)
Lets Claude upload Figma exports to the Media Library itself (it always asks first).
```powershell
# Windows — then open a NEW terminal / restart Claude Code
setx WP_AUTH_CLIENTX_ELEMENTOR "user:xxxx xxxx xxxx xxxx xxxx xxxx"
```
```bash
# macOS/Linux — add to ~/.zshrc or ~/.bashrc
export WP_AUTH_CLIENTX_ELEMENTOR="user:xxxx xxxx xxxx xxxx xxxx xxxx"
```
Plain `username:password` (not Base64). Tell Claude the variable name during setup; it's stored in the site's `CLAUDE.md` (the name only, never the value).

### 2.5 Project folder
1. Create a folder for the site (one git repo per site), e.g. `projects/clientx-elementor`, and open it in Claude Code.
2. Say: **"Set up this folder for https://clientx.com, MCP server clientx-elementor"** (or `/elementor-figma:setup https://clientx.com clientx-elementor`).
3. Claude checks the connection, V4 and Pro, asks a few questions in one message, and creates:

```
CLAUDE.md                     site facts, server name, preferences, site-specific pitfalls
.claude/settings.json         permissions (asks before publish / page settings / site-wide changes)
docs/progress.md              done / in progress / next, per document
docs/design-tokens.md         the site's variables, default styles, global classes
docs/_document-template.md    template for document notes
docs/<type>/<slug>-<id>.md    one note per page / template / site part (created as you work)
css/<slug>-<id>/              CSS for V3 widgets that you paste in Elementor
snapshots/<slug>-<id>/        backups taken before edits
assets/<slug>-<id>/           images exported from Figma
tools/                        measure.js (measure pages), upload-media.mjs (Media Library upload)
.stoica-plugin.json           plugin version this project was created with (doctor warns when it is outdated)
```
Commit it to the site's repo. Colleagues who clone it only do 2.2–2.4 with their own password and **keep the same server name**.

## 3. Daily use

Plain language works — the plugin's skills load automatically. Always give the **document ID** and the **full Figma link** (file + node).

| You want | Say |
|---|---|
| Whole website | "Build this website from Figma: `<file link>`. Site: `<url>`, MCP server: `<name>`." (+ optional: styles page link, which frame is which page, mobile frames, a live reference site for animations) |
| New page | "Create a new page 'About' and build it from `<figma link>`. Plan first." |
| Existing page / section | "Page 123: build the hero from `<figma link>`" · "Page 123: compare with Figma and list what's off" |
| Header / footer / template | "Template 456 (header): match `<figma link>`" |

What Claude does every time: confirm the document → back it up → read Figma → compare → **propose and wait for your OK** → build (V4 via MCP; V3 = CSS you paste) → check at 4 widths + basic accessibility → update notes. **It never publishes without your OK.**

Tips
- Using fewer tokens: one session per page/section, big Figma nodes and big pages are read by the `figma-reader` / `page-reader` agents (short summary back), snapshots only of what you edit, no screenshots unless needed.
- One named chat per task: `claude -n clientx-about-hero`; resume with `claude --continue` / `claude --resume <name>`.
- End sessions with "update progress.md and the page note".
- New quirks Claude finds go into the site's `CLAUDE.md`; general ones are worth adding to this plugin.

### What stays manual
WordPress menus, Site Settings (homepage, permalinks), plugins/CPTs/custom fields, form email settings, SEO, V3-only widgets (e.g. sliders), media uploads when no env var is set.

## 4. Updating
Ask Claude to update the plugin, or run `node "<plugin folder>/skills/setup/setup.mjs" update` in a terminal, then start a new session and run `refresh` inside each site project to copy the newest `tools/` (`doctor` warns when they are outdated).

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| MCP not connected / 401 | Wrong Base64 or revoked password; site without HTTPS; security plugin blocking REST API |
| `connect` says the site rejected the credentials | Use the WordPress **username** (not the email) and a fresh Application Password; check HTTPS and that no security plugin blocks the REST API |
| `connect` warns the Elementor MCP endpoint is not listed | Enable the MCP in Elementor and make sure V4 (atomic editor) and Pro are active |
| Upload: "env var missing" | `setx` needs a new terminal / Claude Code restart; check the name matches `CLAUDE.md` |
| Upload 403 | WP user can't upload files, or REST API blocked by host/security plugin |
