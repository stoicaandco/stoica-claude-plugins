# Stoica Claude toolkit

Claude Code plugins for the Stoica team. This repo is a **plugin marketplace** called `stoica`.

| Plugin | Version | Use it to | Guide |
|---|---|---|---|
| `elementor-figma` | 0.4.1 | Build, compare and fix **Elementor (V4)** websites from Figma | [plugins/elementor-figma/README.md](plugins/elementor-figma/README.md) |
| `hubspot-figma` | 0.3.2 | Build **HubSpot CMS themes** (HubL modules + templates) from Figma | [plugins/hubspot-figma/README.md](plugins/hubspot-figma/README.md) |

Both follow the same rules: you give the Figma link, Claude proposes a plan and waits for your OK, then builds. It never publishes without your OK.

## Install (once per person)

You need **Claude Code** (the desktop app's `</>` Code tab and/or the `claude` command). The plugins live in a public repo: **no GitHub account or login is needed**.

**One-time, even if you only use the desktop app:** the plugin commands below need the `claude` command in a terminal (the desktop app does not add it). Check with `claude --version`. If it says "command not found", install it: macOS/Linux `curl -fsSL https://claude.ai/install.sh | bash`, Windows PowerShell `irm https://claude.ai/install.ps1 | iex`, then reopen the terminal (the desktop app's Terminal panel works). The first time, `claude` may ask you to log in.

```bash
claude plugin marketplace add stoicaandco/stoica-claude-plugins
claude plugin install elementor-figma@stoica     # Elementor sites
claude plugin install hubspot-figma@stoica       # HubSpot themes
```

**Installed earlier from the old private repo (`stoica-claude-toolkit`)?** Switch once:

```bash
claude plugin uninstall elementor-figma@stoica
claude plugin uninstall hubspot-figma@stoica
claude plugin marketplace remove stoica
claude plugin marketplace add stoicaandco/stoica-claude-plugins
claude plugin install elementor-figma@stoica
claude plugin install hubspot-figma@stoica
```

Check: `claude plugin list` shows the plugin as enabled. In a **new** session, typing `/hubspot-figma:` or `/elementor-figma:` lists the skills. You don't have to type them: plain language works ("Build this site from Figma: `<link>`").

Each plugin has its own extra requirements (Figma MCP, Node, HubSpot CLI, …) — see its guide.

**Works on macOS, Windows and Linux**, in the desktop app and in the `claude` CLI. The setup scripts are plain Node (18+, no dependencies) and CI runs the toolkit checks on all three systems. Where a command differs, the guides show both versions. "Terminal" means the desktop app's Terminal panel (or Terminal / iTerm on a Mac).

## Update

```bash
claude plugin marketplace update stoica
claude plugin update hubspot-figma@stoica        # and/or elementor-figma@stoica
```
Start a new session afterwards.

## How a project works

One folder (= one git repo) per client website. Claude sets it up for you the first time, from a plain request. The plugin holds the generic workflow; the folder holds everything about that client (account, notes, Figma links, files). Open the folder in Claude Code and talk to it.

## Troubleshooting (both plugins)

| Problem | Fix |
|---|---|
| Plugin/skills not visible | New session or `/reload-plugins`; `claude plugin list` |
| `marketplace add` fails | Check that `claude --version` works and you are online. A "not found" / 404 error means the repo name is wrong or you are using the old private repo: the current one is `stoicaandco/stoica-claude-plugins` |
| Claude works on the wrong thing | Give the ID / account and the **full Figma link** explicitly |

Plugin-specific problems are in each guide.
