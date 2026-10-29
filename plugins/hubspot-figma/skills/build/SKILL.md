---
name: build
description: Build, compare and fix a classic HubSpot CMS theme (HubL modules, templates, theme fields, base CSS) from a Figma design, with draft-mode upload to one HubSpot account. Use automatically for any Figma → HubSpot module, section, page template, header/footer or theme-token task, e.g. "build the hero from <figma link> in HubSpot", "compare this module with Figma".
---

# HubSpot ← Figma: build modules, templates, theme

Project facts (account name + ID, Design Manager path, Figma link) live in the project's `CLAUDE.md` — no `CLAUDE.md` / `theme/` → run the plugin's `setup` skill first. Whole theme from a Figma file → `site-build` skill (it uses this one per step).

## 1. Start every task
1. Confirm the target account (name + ID from `CLAUDE.md`) with the user at the first `hs` command of the session. Pass `--account=<ID>` to every `hs` command. Never use the default account.
2. Get the **full Figma link** (file + node). Parse `figma.com/design/<fileKey>/…?node-id=1-2` → fileKey + nodeId `1:2` (`/branch/<branchKey>/` → use branchKey). Store it in `docs/progress.md`.
3. Read `docs/progress.md` and the existing `theme/` pieces the task touches.

## 2. Read Figma (read-only)
- **Whole page or 3+ sections: delegate to the `figma-reader` agent** (it costs its own tokens, so for one section read the node directly) (returns a short spec + downloads the assets; the raw Figma output stays out of this conversation). Otherwise: load the Figma MCP `figma-design-to-code` skill, then `get_design_context` on the node. Its output is a **reference** (React/Tailwind) to rewrite as HubL/CSS: take real copy, spacing, structure from it.
- Tokens: `get_variable_defs` on a style-guide frame → `theme/fields.json`; never hex values eyeballed from a screenshot.
- Icons/images: `download_assets` exports (never hand-drawn SVG paths); recolorable icons = tiny inline SVG with `fill: currentColor`/CSS var. Photos → `theme/images/` (jpg/png/svg only), then `npm run optimize-images`.
- Ignore invisible nodes; note placeholder copy that differs from final.

## 3. Decide the shape
| Figma element | HubSpot shape |
|---|---|
| Repeatable content section (hero, cards, slider…) | **Module** `modules/<Name>.module/` (`meta.json`, `fields.json`, `module.html`) |
| Visual variant of an existing section | Same module + a `choice` field |
| Header / footer | Non-global module inside `{% global_partial %}` (`templates/partials/`) — never a global module in a global partial |
| Page = ordered sections | Template `templates/<page>.html` with `dnd_area` → `dnd_section` → `dnd_module width=12` |
| Colors / fonts / content width | Root `theme/fields.json` → `:root` vars in `templates/layouts/base.html` |
| Shared buttons, eyebrow, links, heading defaults | `theme/css/base.css` (loaded once via `require_css`) |

Check `modules/` and `css/base.css` for something that already covers it before creating anything. **Read `docs/module-reference.md` (copied into the project at setup; if missing, `${CLAUDE_SKILL_DIR}/module-reference.md`) and the closest starter module** (`Hero`, `Cards`, `Slider`) before writing a module.

**Shared first:** list what repeats in the design (Figma text styles → type scale, kicker/eyebrow, link and icon-button styles, button variants) and put it in `css/base.css` / `theme/fields.json` BEFORE the module. A module only holds its own layout and uses the shared classes.

Propose the plan (shared CSS/tokens, modules, fields, template sections, mobile behaviour if there is no mobile frame, missing fonts) and **wait for OK** before writing.

## 4. Structure rules (hard)
- **Module = 3 files only.** CSS in `{% require_css %}<style>{% scope_css %}…{% end_scope_css %}</style>{% end_require_css %}` at the top of `module.html`; JS as an inline `<script>` at the bottom (scope to the module with `document.currentScript.previousElementSibling`). No `module.css`/`module.js`.
- `scope_css` only scopes to that module instance: shared classes go in `css/base.css`, never copy-pasted per module.
- Module style fields fall back to tokens: `{{ module.style.x.color|default('var(--color-ink)', true) }}`. Use Content / Style field split; a `choice` whose values are the shared CSS class names (e.g. `button--primary`) maps field → class with no extra code.
- **Section-level layout lives in the template**: `dnd_section background_color, padding={"default":{"top":..,"bottom":..,"left":0,"right":0}}, max_width=<n>`; modules sit at `width=12, offset=0`. Never `full_width=true` together with `max_width`.
- Units: Figma px → `clamp()`, `%`, `max-width`; px only for hairlines/small gaps. Semantic class names. Breakpoints: `@media (max-width: 767px)` mobile, tablet ≤1024.
- Cards/tiles that sit in a fluid grid: scale their insides with the card (`container-type: inline-size` + `clamp(min, Ncqw, figma-px)`); no `overflow:hidden` on an `aspect-ratio` box with text; media pinned with `flex:none; margin-top:auto`. Details in `docs/module-reference.md`.
- Code is clean and modern: follow the **Code standard** in `module-reference.md` (semantic HTML, modern CSS layout, vanilla ES2020 JS with `const`/`let`, tidy HubL). `npm run lint` flags the common slips.
- Files: UTF-8 **without BOM** (PowerShell 5.1 `Set-Content -Encoding utf8` adds one).
- Performance: `fetchpriority="high"` and no `loading="lazy"` on the one LCP image, `loading="lazy" decoding="async"` on others; explicit Google Font weights via `<link>` + `preconnect` instead of `load_external_fonts: true`; always set alt text.
- Fields: unique names; **never `name`, `label` or `body`** as a field name; `visibility.controlling_field_path` is an absolute dot-path from the fields root (no array index); `occurrence` on a wrapper `group` when rows need different defaults; no `cta` field (tier-gated; use `link`); every field has a sensible `default` so the module renders non-empty.

## 5. Build → lint → upload (draft) → verify
1. Write/edit files under `theme/`. `npm run lint` must pass (reserved names, bad visibility paths, extra module files, unbalanced scope_css, `.webp`, `full_width`+`max_width`).
2. **Ask the user before each upload.** `npm run upload` = `hs cms upload theme <dest> --account=<ID> --cms-publish-mode=draft`; during a session `npm run watch` (same, on save) once the user OKs it.
3. Draft behaviour (verified): editing an existing file uploads as a **draft** — the published version stays as is until published in Design Manager. A **new** file becomes published immediately but is unused until a page uses it. Never publish drafts yourself; tell the user which files are ready to publish.
4. `hs cms fetch <path> <tmp-dir> --account=<ID> --cms-publish-mode=draft` and compare: "upload success" is not proof (empty `fields.json` from reserved names and skipped `.webp` both passed silently; an upload can also half-fail with an `[ERROR]` line after most files went up). HubSpot reformats JSON on save, so compare field names/defaults, not file hashes.
5. Preview: the user creates a page from the template in HubSpot (never published) and opens its Preview. Offer to open that preview in a browser you can drive (the desktop app's built-in browser pane after the user signs in to HubSpot there, or **Claude in Chrome**; ask first) so you can screenshot and measure it yourself instead of asking for screenshots; the preview URL is login-gated, so `curl` can't read it. Verify with measurements, not by eye, at 1440 / 1025 / 768 / 375: evaluate `tools/measure.js` in the page with the browser tool, then `await __measureAt([1440, 1025, 768, 375], '<module selector>', ['.card', '…'])` (box, font, size/line-height, weight, colour, padding, gap, overflow and a11y per width) and compare with the Figma values (positions ≤ ~6px). `__measureAt` uses same-origin iframes because resizing the window does not change the viewport in some browser panes (the desktop built-in browser): always report each frame's real `innerWidth`, and never call 1009 px a test of the 1025 px layout. `__measure(...)` / `__checks()` measure the current viewport only. If a screenshot can be saved to disk (e.g. Playwright `filename`), `node tools/compare-images.mjs <figma.png> <live.png> --out diff.png` reports the mismatch % and the worst areas (Figma PNG: `get_screenshot` URL + curl). Fix → re-measure, at most 3 rounds, then say plainly what is still not verified. Also check one H1, heading order, alt text, link names, contrast (≥4.5:1 body, ≥3:1 large). Screenshot colors can shift for saturated colors (color profile): confirm a suspicious color with computed styles, not pixels. Report issues; don't silently change content.

**Unclear HubSpot behaviour** (field options, `dnd_*` parameters, HubL tags/filters, CLI flags, tier limits) → ask the `hubspot-docs` agent; don't answer from memory.

## 6. Close the loop
Update `docs/progress.md` (module → Figma link, status, open diffs). **Learn as you go:** a HubSpot/HubL quirk not covered here → one line in the project's `CLAUDE.md` ("Site-specific notes & pitfalls") and tell the user if it looks general enough for this plugin.

## Lean workflow (keeps token use down)
- Read Figma **per section node**, never a whole page; for anything big delegate the read to the `figma-reader` agent (it returns a short spec and downloads the assets), so the raw Figma output never enters this conversation.
- No screenshots unless something looks wrong: measured numbers are cheaper and more exact.
- Measure at 1440 + 375 while building, all four widths once at the end. Pass the Figma values as `expected` to `__measureAt` so only the differences come back.
- Agents cost their own tokens (a cold start re-reads the skills and the Figma node): use them only when the user asks or for 3+ modules/pages, never for one section. Do QA in this thread: `__measureAt(..., { expected })`.
- Final report: 10 lines at most (what changed, what is unverified, what you need from the user). No recap tables, no re-listing of files.
- One session per task (one module/page); state lives in `docs/progress.md`. `/compact` if the session grows.

## Pitfalls (verified)
- `hs cms upload` rejects `.webp` ("Invalid file type requested").
- Field types are a closed list: there is **no `textarea`** (an invalid type fails the whole upload with a vague "cards.null"/"unknown" error). Multi-line plain text = `"type": "text"` + `"allow_new_line": true`; formatted copy = `richtext`. `long: true` is ignored. Every field needs `name`, `label` and `type`. `npm run lint` checks all three.
- Reserved field names `name`/`label`/`body` → the upload errors or silently leaves an empty `fields.json` (module with no fields). `hs cms lint` does not catch it; `npm run lint` does.
- Figma exports photos as 4000px JPEGs, sometimes with a `.png` name (check with `file`) → rename, then `npm run optimize-images`.
- A custom brand font (e.g. Neulis Neue) is not on Google Fonts: ask the user for `.woff2` files, otherwise fall back and flag it.
- `dnd_area` markup (`.row-fluid`/`.span*`) has no CSS unless `base.html` provides it (starter does).
- `dnd_section background_color` is always full-bleed, even with `max_width` (that only constrains the content). A design with a contained/rounded panel on a lighter page: light section background + the panel as the module's own wrapper (style field for its colour), never the section background.
- `--clean` on upload resets global partial content — don't use it on a client account.
- `hs cms theme preview` (official local preview) is currently unreliable (login redirect on EU1 test account, Windows install bug); we don't use it yet.
- Prefer PowerShell on Windows if `hs` misbehaves in Git Bash.

## Working style
Concise; minimal targeted changes; confirm before uploading, publishing, deleting or overwriting anything on the HubSpot account; step by step on complex tasks.
