# {{SITE_NAME}} – HubSpot theme workspace

Classic (Design Manager) HubL theme for {{SITE_NAME}}, built from Figma. Workflow: plugin **hubspot-figma** — skill `build` (modules/templates/sections) and `site-build` (whole theme). This file holds the project specifics.

## Project facts
- HubSpot account: **{{ACCOUNT_NAME}} ({{ACCOUNT_ID}})** — always pass `--account={{ACCOUNT_ID}}` to every `hs` command. Never rely on the default account.
- Theme folder (local): `theme/` · Design Manager path: `{{DEST}}`
- Upload mode: **draft** (`--cms-publish-mode=draft`). Publishing = the user, in HubSpot, or an explicit OK from them.
- Figma (main file, if any): {{FIGMA}}
- Commands: `npm run upload` · `npm run watch` · `npm run lint` · `npm run optimize-images`

## Start of every task
1. Confirm the account (name + ID above) with the user if it is the first command of the session.
2. Get the **full Figma link** (file + node). A bare node ID only if `docs/progress.md` already stores the file link.
3. Read `docs/progress.md`. Run `npm run lint` before every upload.

## Structure rules (never break)
- Module = `meta.json` + `fields.json` + `module.html` only. CSS in `{% require_css %}<style>{% scope_css %}…{% end_scope_css %}</style>{% end_require_css %}`, JS as inline `<script>` at the bottom. No `module.css` / `module.js`.
- Shared CSS (buttons, eyebrow, links, heading defaults) only in `theme/css/base.css`.
- Section layout (background, padding, max_width) lives in the template's `dnd_section`, not in modules. Never `full_width` + `max_width` together. A module fills its container: no `max-width` + `margin: 0 auto` wrapper, no page gutters, no fixed outer width in a module; width = the section's `max_width`, gutters and vertical spacing = the section's `padding` (`default` + `mobile`).
- Tokens (colors, fonts, content width) in `theme/fields.json` → `:root` vars in `base.html`.
- Header/footer = non-global modules inside `{% global_partial %}`.
- A variant of a section = a `choice` field, not a second module.
- Shared first: repeating patterns and the Figma type scale go in `theme/css/base.css` before the module; modules use those classes. Read `docs/module-reference.md` before writing a module.
- Never name a field `name`, `label` or `body`. Files UTF-8 without BOM. Inside fluid cards scale with `cqw`/`clamp`, no `overflow:hidden` on `aspect-ratio` boxes.

## Preferences
- Concise answers; minimal targeted changes; no over-engineering.
- Keep token use low: Figma per section, no screenshots unless needed, measure 1440 + 375 while building, no subagents unless asked or for 3+ modules, final reports of 10 lines at most, one session per task.
- Stable semantic class names. Figma px → relative units (`clamp()`, `%`, `max-width`).
- Confirm step by step on complex tasks; never publish or overwrite without OK.

## Site-specific notes & pitfalls
- (add as you learn them)
