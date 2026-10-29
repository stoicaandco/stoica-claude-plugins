# hubspot-figma

Builds a **classic HubSpot CMS theme** (HubL modules, page templates, theme settings) from a Figma design, one project folder per client, uploaded to the client's HubSpot account as **drafts**.

## Quick start
1. Install the plugin once (see the [main README](../../README.md)).
2. Make an empty folder for the client and open it in a **new** Claude session.
3. Say: *"Build this website in HubSpot from Figma: `<figma link>`. Client: `<name>`."* Claude checks your setup, asks which HubSpot portal, creates the project and tells you the 2–3 things only you can do (e.g. log in to a portal once, create the test page, publish).

## 1. Requirements (once per person)

| Need | Why | How |
|---|---|---|
| Claude Code + this plugin | Runs the workflow | See the [main README](../../README.md) |
| **Node.js 18+** | HubSpot CLI, lint, image script, setup script | `node -v` to check. The only thing to install yourself |
| **HubSpot CLI** | Talks to HubSpot (upload, fetch) | Claude checks and offers to install it (`npm install -g @hubspot/cli`) when you start a project |
| **Figma plugin + MCP** | Reads designs | Claude checks and installs it for you; you sign in once (desktop app: Connectors panel → Figma → Authenticate; CLI session: `/mcp`). The account needs access to the design file |
| **HubSpot docs MCP** (optional, recommended) | Lets Claude look up the official docs instead of guessing | Claude checks and installs it (`hs mcp setup` does the same). Already installed → left alone |
| **A HubSpot account** you can edit Design Manager in | Where the theme goes | Any tier; a client portal or a developer test account |
| Browser access (optional) | Lets Claude open the HubSpot preview and measure it itself | Desktop app: the built-in browser pane (sign in to HubSpot there once), or the Claude in Chrome extension (`/chrome` in a CLI session) |

## 2. Connect HubSpot portals

The CLI keeps a list of portals you've logged into. Each client = one portal. **You can skip this section**: when you start a project Claude checks everything, tells you what's missing and, for a new portal, asks you to run one command.

| You want | Run |
|---|---|
| Log in to your **first** portal | `hs init` (opens the browser, authorize, done) |
| **Add another portal** (new client) | `hs account auth` |
| See your portals | `hs account list` |
| See which one is the default | `hs account info` |

Credentials stay on your machine (`~/.hscli/config.yml`), never in a project.

## Where it works
Both the Claude desktop app (Code tab) and the `claude` CLI: same plugin, same settings. Install once (in the desktop app, run the two commands from the [main README](../../README.md) in the Terminal panel), then start a **new session** in your project folder and just talk. `--plugin-dir` is only for testing unreleased changes.

## 3. Start a project

Create an empty folder for the client (one git repo each), open it in Claude Code and say what you want, for example:

> "Build this website in HubSpot from Figma: `<figma link>`. Client: Acme."

Claude then runs the **setup** automatically (one script, `skills/setup/setup.mjs`, so it's the same every time). It will:

1. **check** Node, the HubSpot CLI, your connected portals, the Figma plugin/MCP and the HubSpot docs MCP, and tell you what's missing: CLI not installed → it offers to install it; portal not connected → you run `hs account auth` once (it opens the browser; run it in a terminal: the desktop app has a Terminal panel, or type `! hs account auth` in a CLI session); Figma needs sign-in → desktop app: Connectors panel → Figma → Authenticate (CLI: `/mcp`). Anything already installed is left alone,
2. **show your portals and ask which one is this client's** (never the default silently),
3. check the theme folder doesn't already exist in that portal,
4. create the project, bind the folder to that portal (so even a stray `hs` command targets the right one), start a git repo, install the tools and lint the fresh starter. **It does not upload anything yet.**

You never need to run it yourself: ask Claude to "run doctor" any time to see what is missing or outdated.

What you get:

```
CLAUDE.md                project facts: portal, theme path, rules, notes
docs/progress.md         what's done / next, Figma links per module
theme/                   the theme (starter with 12 working modules)
  theme.json  fields.json          theme settings: colors, fonts, content width
  css/base.css                     shared CSS only (buttons, eyebrow, links)
  templates/page.html              page = sections (padding, background per section)
  templates/layouts/base.html      <head>, tokens, global header/footer
  modules/<Name>.module/           meta.json + fields.json + module.html (CSS + JS inline)
docs/module-reference.md the module rules Claude follows (copied from the plugin)
tools/                   lint, image optimizer, measure.js (in-page measuring), compare-images.mjs
package.json             the commands below
.stoica-plugin.json      plugin version this project was created with (doctor warns when it is outdated)
.hsaccount               pins this folder to the client's portal
```

### What the plugin already knows (nothing to configure)
The rules live in the plugin, so a colleague who installs it gets them automatically: module structure (3 files, inline CSS/JS), section settings in the template, shared CSS and the type scale in `base.css` first, reserved field names, layout rules for fluid cards, draft upload and fetch-back checks. Details: `skills/build/SKILL.md` and `skills/build/module-reference.md`. The generated project's `CLAUDE.md` repeats the short version.

### Agents (only for 3+ modules or when you ask: they cost their own tokens)
| Agent | Job |
|---|---|
| `module-builder` | Builds ONE module from ONE Figma node (several run in parallel, each only writes its own module folder) |
| `qa-reviewer` | Read-only check of a module/template against Figma (lint, fetch-back, measured differences, accessibility) |
| `figma-reader` | Reads one Figma node and returns a short spec (and downloads the assets), so the big Figma output stays out of your conversation: saves tokens |
| `hubspot-docs` | Looks up the official HubSpot docs when something is unclear |

## 4. Daily use

Plain language, with the **full Figma link** (file + node):

| You want | Say |
|---|---|
| The whole theme | "Build the whole theme from `<figma file link>`" |
| One section | "Build the hero from `<link>` as a module" |
| A page | "Build the About page template from `<link>`" |
| Fix a difference | "Compare the pricing module with Figma `<link>` and fix what's off" |
| Change a token | "The brand green is now #0A7A5A, update the theme" |

Every time: Claude reads Figma → proposes a plan → **waits for your OK** → writes files → lints → asks before uploading → uploads as draft → fetches the files back to check → compares with Figma → updates `docs/progress.md`.

## 5. The commands (Claude runs them; you can too)

| Command | What it does |
|---|---|
| `npm run lint` | Checks the theme for mistakes HubSpot doesn't report (reserved field names, bad visibility paths, extra files in a module, `.webp`, …). Run before every upload |
| `npm run upload` | Uploads `theme/` to the client's portal **as draft** |
| `npm run watch` | Same, automatically on every save, while you work |
| `node tools/compare-images.mjs <figma.png> <live.png>` | Pixel comparison of a Figma screenshot and a live screenshot: mismatch %, worst areas, diff image |
| `node <plugin>/skills/setup/setup.mjs update` / `refresh` | `update` = get the newest plugin version (then a new session); `refresh` = copy the newest tools and rules into this project |
| `npm run optimize-images` | Resizes/compresses images in `theme/images/` (jpg/png) |
| `hs cms ls <path> --account=<ID>` | Lists what's in the portal's Design Manager |
| `hs cms fetch <path> <folder> --account=<ID> --cms-publish-mode=draft` | Downloads a file back to check what actually landed |

Always with `--account=<ID>`: Claude does this on every command.

## 6. Drafts and publishing

- Editing a file that already exists in the portal → saved as a **draft**; the live version doesn't change until someone publishes it in HubSpot (Design Manager).
- A **new** file is live immediately but unused until a page uses it.
- Claude never publishes. At the end it lists which drafts are ready.
- To see the result: in HubSpot create a page from the new template (Content → Website Pages → Create) and open its **Preview**; don't publish. For Claude to check it itself, open that preview in the desktop app's built-in browser pane (sign in to HubSpot there once) or use Claude in Chrome, then ask: *"Measure this preview against the Figma node at 1440, 1025, 768 and 375."* It reports measured values (sizes, fonts, colours, spacing, overflow) at exact widths, not an impression.

Not done yet: a local preview before uploading. HubSpot's official one (`hs cms theme preview`) currently doesn't work reliably for us.

## 7. What you still do by hand

HubSpot menus, forms, blog setup, domains and SEO settings, creating pages from the templates, publishing.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `hs` not found | `npm install -g @hubspot/cli`, then a new terminal |
| `hs` misbehaves in Git Bash (Windows) | Use PowerShell |
| macOS/Linux: `npm install -g` says `EACCES` / permission denied | Run it with `sudo`, or install Node through a version manager (nvm, fnm) so global installs need no sudo |
| macOS: `node` not found | Install Node 18+ from https://nodejs.org (or `brew install node`), then open a new Terminal |
| Portal not in the list | `hs account auth` |
| Upload says OK but the module is empty | Run `npm run lint` — usually a field named `name`, `label` or `body` |
| Upload fails with "unknown field type" or `cards.null` | An invalid field type (e.g. `textarea`). `npm run lint` names it. Multi-line text = `text` with `allow_new_line`; formatted copy = `richtext` |
| `Invalid file type requested` | `.webp` isn't accepted by the CLI; use jpg/png/svg |
| 403 on upload | Your HubSpot user can't edit Design Manager, or the access key lacks `cms.source_code.write` → `hs account auth` again |
| Claude touches the wrong portal | It shouldn't: every command carries `--account`. Check `CLAUDE.md` for the portal ID and tell Claude to stop |
