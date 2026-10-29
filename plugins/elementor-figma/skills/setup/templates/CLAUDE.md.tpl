# {{SITE_NAME}} – Elementor workspace

Work on {{SITE_URL}} (WordPress + Elementor) through the `{{SERVER}}` MCP server, matching Figma designs.
Workflow: plugin **elementor-figma** — skill `build` (pages/templates/sections) and `/elementor-figma:site-build` (whole site). This file holds the site specifics.

## Start of every task
1. Get the document ID from the user (or create a draft page when asked). Never guess an ID.
2. Confirm title + type via `elementor-get-page-structure`.
3. Read `docs/progress.md` and the document note `docs/<type>/<slug>-<id>.md` (create from `docs/_document-template.md`).
4. Design work needs the full Figma link; a bare node ID only if the note already stores the file link.

## Site facts
- Site: {{SITE_URL}} · MCP server: `{{SERVER}}`
- Editor: `{{SITE_URL}}/wp-admin/post.php?post=<id>&action=elementor` · Preview: `{{SITE_URL}}/?page_id=<id>&preview=true`
- Figma (main file, if any): {{FIGMA}}
- Tokens & classes: `docs/design-tokens.md` · Tools: `tools/measure.js` (paste in the page to measure), `tools/upload-media.mjs` (Media Library upload)
- Media upload env var: `{{AUTH_ENV}}` (value = `username:application password`, set on each person's machine, never in files)

## Files & naming
- Notes: `docs/<type>/<slug>-<id>.md` (pages, posts, templates, site-parts, <cpt>)
- `css/<slug>-<id>/` CSS pasted into V3 widgets · `snapshots/<slug>-<id>/` backups · `assets/<slug>-<id>/` Figma exports to upload
- `docs/progress.md` one section per document + site-wide

## Shared things — ask before changing
Global variables, classes, default tag styles, components, header/footer/single/archive templates: name what else they affect before changing.

## Preferences
- Concise answers; minimal, targeted changes; no over-engineering.
- Keep token use low: Figma per section, snapshots only of what you edit, no screenshots unless needed, no subagents unless asked or for whole pages, final reports of 10 lines at most, one session per task.
- Stable semantic class names, not generated IDs.
- Figma absolute units → relative (clamp / % / max-width), including container widths.
- Confirm step by step on complex tasks; never publish or change page settings without OK.

## Site-specific notes & pitfalls
- (add as you learn them)
