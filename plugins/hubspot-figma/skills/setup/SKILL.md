---
name: setup
description: Set up the current folder as a Claude Code project for one client's HubSpot CMS theme and connect it to a HubSpot portal (installs/checks the HubSpot CLI, connects a new portal if needed, creates the starter theme bound to one account). Use automatically, without a command, whenever the user wants to build/start a HubSpot website, theme, module or page from Figma ("build this project in HubSpot", "new HubSpot site for <client>", a Figma link + HubSpot) and the folder has no theme project yet.
argument-hint: "<client-name> [figma-link]"
---

# Set up a HubSpot theme project

All the work is done by one script: `node "${CLAUDE_SKILL_DIR}/setup.mjs" <command>` (no dependencies; last output line is JSON). You only ask the questions and run it. **Don't hand-copy the templates** (that caused BOM and placeholder bugs).

## Steps
1. **`doctor`** → `node "${CLAUDE_SKILL_DIR}/setup.mjs" doctor`. Read the `next` list and fix in this order, then rerun until `ok`:
   - Node < 18 → tell the user to install Node.js 18+ (https://nodejs.org), reopen the terminal.
   - HubSpot CLI missing → ask OK, then `setup.mjs install-hs` (= `npm install -g @hubspot/cli`); a **new terminal** may be needed for `hs` to be found.
   - Figma plugin/MCP missing → `setup.mjs install-figma` (= `claude plugin install figma@claude-plugins-official`), then a **new Claude session**. "Needs sign-in" → the user signs in with an account that can open the design files (interactive, you can't): desktop app → **Connectors** panel → Figma → Authenticate; CLI session → `/mcp`, pick figma.
   - HubSpot docs MCP missing (powers the `hubspot-docs` agent) → ask OK, then `setup.mjs install-docs-mcp` (= `claude mcp add HubSpotDev -s user -- hs mcp start --ai-agent claude`), then a **new Claude session**. Already installed → nothing to do.
   - No portal connected, or the client's portal isn't in the list → the user connects it: `hs account auth` (very first time: `hs init`). It opens the browser and is interactive, so **you can't run it**: ask the user to run it in a terminal (desktop app: the **Terminal panel**; CLI session: type `! hs account auth`), log in to the client's HubSpot account and authorize. Then run `setup.mjs accounts` again.
2. **Ask in ONE message** (skip what's known): client name, **which portal** (show the `accounts` list; wait for the answer, never pick the default), Figma link (optional now), Design Manager folder name (default: slug of the name).
3. **`init`** → `node "${CLAUDE_SKILL_DIR}/setup.mjs" init --name "<client>" --account <id> [--dest <folder>] [--figma <url>]` in the empty project folder. It refuses to run if the folder already has `theme/`/`CLAUDE.md` or if `<dest>` already exists in the portal; it never uploads. It creates `theme/` (starter), `CLAUDE.md`, `docs/progress.md`, `package.json`, `tools/` (lint, image optimizer, `measure.js`, `compare-images.mjs`), `docs/module-reference.md`, `.claude/settings.json`, `.hsaccount` (pins the folder to the portal), a git repo, installs `sharp` and lints.
4. **Summarize** (portal, folder, what exists). If the request was to build something, continue with the `build` / `site-build` skill. The first upload (`npm run upload`, draft) always needs the user's OK.

## Keeping up to date
- `node "${CLAUDE_SKILL_DIR}/setup.mjs" update` updates the installed plugin from the marketplace; then start a **new Claude session**.
- `node "${CLAUDE_SKILL_DIR}/setup.mjs" refresh` (inside a project; `--dry-run` previews) re-copies `tools/` and `docs/module-reference.md` from the installed plugin. It never touches `theme/`. `doctor` run inside a project warns when those copies are older than the plugin.

## Notes
- The starter keeps sample Aerden copy and images as placeholders; `build` replaces them from Figma and deletes modules the design doesn't need. A fresh lint shows 0 errors and 0 warnings.
- Windows: run `hs`/`node` from PowerShell if Git Bash misbehaves. Files must be UTF-8 without BOM.
- Everything is idempotent: `doctor` only lists what is missing, so an existing HubSpot CLI, portals, Figma or docs MCP are left untouched.
- Colleague's first time: `doctor` tells them exactly what is missing; nothing needs to be installed beforehand except Node.
- Works in both the Claude desktop app (Code tab) and the `claude` CLI: same plugin, same config. Desktop users run terminal commands in the app's Terminal panel.
- MCP servers/plugins load at session start: after installing one, start a new Claude session and rerun `doctor`.
