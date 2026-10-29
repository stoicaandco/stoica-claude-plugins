---
name: setup
description: Set up the current folder as a Claude Code project for one Elementor website (connects the site's Elementor MCP server if needed, then CLAUDE.md, docs, tools, permissions). Use automatically before any Elementor/Figma work when the folder has no CLAUDE.md for the site, or when the user asks to set up / start a new site project, or to connect a new WordPress site.
argument-hint: "<site-url> <mcp-server-name> [figma-link]"
---

# Set up an Elementor site project

The mechanical work is one script: `node "${CLAUDE_SKILL_DIR}/setup.mjs" <command>` (no dependencies; last output line is JSON). You ask the questions, run it, and do the parts that need the site's MCP tools. **Don't hand-copy the templates.**

Inputs (from $ARGUMENTS or the user's message; ask for what's missing in ONE message): site URL, MCP server name (e.g. `clientx-elementor`; unique per site), optional Figma link, site name, main language, preferences (defaults: concise, minimal changes, semantic class names, relative units, confirm step by step), and whether to enable media uploads.

## Steps
1. **`doctor`** → read `next`, fix, rerun until `ok`:
   - **No Elementor server for this site** (or it is failing) → the user connects it **in their own terminal** (desktop app: the **Terminal panel**), because it asks for a WordPress username and Application Password that must never be typed into chat:
     `node "${CLAUDE_SKILL_DIR}/setup.mjs" connect --name <server> --url https://<site> [--media-upload] [--replace]`
     It checks the credentials against the site, adds the server (user scope) and, with `--media-upload`, sets the upload env var `WP_AUTH_<SERVER>`. Tell the user how to create the password: WordPress → Users → Profile → **Application Passwords** (each person their own; HTTPS required). Then a **new Claude session** is needed (MCP servers load at session start); rerun `doctor` there.
   - Figma plugin/MCP missing → `setup.mjs install-figma`, new session. Needs sign-in → desktop app: Connectors panel → Figma → Authenticate; CLI: `/mcp`.
2. **Check the site** with the server's tools: `mcp__<server>__elementor-list-posts` (connection), `elementor-list-widget-schemas` with `summary: true` (V4 widgets like `e-heading`, `e-flexbox` exist), `elementor-list-site-parts` (Elementor Pro / Theme Builder). Report in one line. V4 missing → stop and tell the user to enable the atomic editor.
3. **Ask the questions** (one message), then **`init`** in the project folder:
   `node "${CLAUDE_SKILL_DIR}/setup.mjs" init --name "<site name>" --url https://<site> --server <server> [--figma <url>] [--auth-env WP_AUTH_<SERVER>]`
   Creates `CLAUDE.md`, `docs/` (progress, document template, design-tokens stub), `.claude/settings.json` (asks before publish/page settings/site-wide changes), `.gitignore`, `tools/` (`measure.js`, `upload-media.mjs`), and its own git repo. Never changes the site; refuses to overwrite a `CLAUDE.md`.
4. **Fill `docs/design-tokens.md`**: read `elementor://global-variables` and `elementor://global-classes` (and default styles if exposed) and list them in tables; fresh site → "none yet".
5. **Media uploads** (optional): env var `WP_AUTH_<SERVER>` = `username:application password` (plain, not Base64), set by `connect --media-upload` or by the user (`setx` on Windows, `export` in the shell profile); never write the value into a file. The WordPress role must allow uploads; SVG needs an SVG plugin. Test once with a small image: `node tools/upload-media.mjs <site-url> <file> "test" --env <VAR>`.
6. **Summarize** what was created. If the request was to build something, continue with that task now.

## Keeping up to date
- `node "${CLAUDE_SKILL_DIR}/setup.mjs" update` updates the installed plugin from the marketplace; then start a **new Claude session**.
- `node "${CLAUDE_SKILL_DIR}/setup.mjs" refresh` (inside a project; `--dry-run` previews) re-copies `tools/measure.js` and `tools/upload-media.mjs`. `doctor` run inside a project warns when they are older than the plugin.

## Notes
- Works in the Claude desktop app (Code tab) and the `claude` CLI alike; desktop users run terminal commands in the app's Terminal panel.
- Colleague who clones an existing site repo: needs only `connect` with their own Application Password and the **same server name**.
