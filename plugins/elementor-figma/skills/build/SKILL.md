---
name: build
description: Build, compare and fix Elementor pages, posts, templates or site parts against a Figma design through an Elementor MCP server (V4 atomic edits, V3 CSS handoff, responsive checks, MCP pitfalls). Use for any Elementor + Figma task on a page, post, template, header/footer or component.
---

# Elementor ← Figma: build, compare, fix

Works with any WordPress site that exposes the Elementor MCP server (tools named `elementor-*`, e.g. `mcp__<server>__elementor-get-page-structure`) plus the Figma MCP. Site facts (URL, server name, IDs, tokens) live in the project's `CLAUDE.md`.

- No `CLAUDE.md` for this site in the working folder → use the plugin's `setup` skill first, then continue.
- Whole site from Figma (design system, header/footer, all pages) → use the plugin's `site-build` skill; this skill covers each step inside it.

## 1. Start every task
1. **Get the document ID from the user.** If missing, ask. Never pick one yourself. (New document → 1b.)
2. `elementor-get-page-structure` (and `elementor-list-posts` / `elementor-list-site-parts` if needed) → confirm title + type in one line.
3. Read `docs/progress.md` + the document note `docs/<type>/<slug>-<id>.md` (create it from `docs/_document-template.md` if missing). Refresh kit tokens (`elementor://global-variables`, `elementor://global-classes`) and update `docs/design-tokens.md` if they changed.
4. Get the **full Figma link** (file + node). Designs may live in different files: never assume a file from a bare node ID — use the link stored in the note or ask. Parse `figma.com/design/<fileKey>/…?node-id=1-2` → fileKey + nodeId `1:2` (`/branch/<branchKey>/` → use branchKey). Store the link in the note.

## 1b. New page / post (no ID yet)
1. The user gives the ID of a page they created, or asks you to create one → `elementor-create-page` (`title`, `post_type` default `page`). It creates a **draft** and returns the ID. Report it and create the note.
2. Remind the user what the tool can't set: slug, page template, homepage setting, SEO.
3. Read the Figma frame → propose a **build plan**: sections in order, reused variables/classes/components, new classes (semantic names), new components, responsive approach. Wait for confirmation.
4. Build **all V4**, one section at a time; after each section verify in preview (`?page_id=<id>&preview=true`, logged in) at the four widths and get the user's OK.
5. **Never call `elementor-publish-document` until the user says so** — publishing makes the draft public.

## 1c. Back up before the first write
Save `elementor-get-page-structure` with `include_content: true` for each top-level element **you will edit**, not the whole page (needs `element_id`) to `snapshots/<slug>-<id>/<YYYY-MM-DD-HHmm>.json`, plus the document settings from the note. Styles come back as raw CSS, re-appliable with `manage-elements` (`style_apply_mode: replace`). Snapshot kit classes/variables before editing existing ones.

## 2. Read Figma (read-only)
**Big node or a whole page: delegate to the `figma-reader` agent** (short spec back + assets downloaded; the raw Figma output stays out of this conversation). For a large existing page, ask the `page-reader` agent for the outline instead of reading the tree yourself. Otherwise:
- `get_metadata` on the frame, or a read-only `use_figma` script returning geometry relative to the frame:
```js
const f = await figma.getNodeByIdAsync('<frameId>'); const fb = f.absoluteBoundingBox; const rows = [];
function walk(n,d){ for (const c of n.children||[]) { const b=c.absoluteBoundingBox; if(!b) continue;
  const r=[d,c.name,c.type,Math.round(b.x-fb.x),Math.round(b.y-fb.y),Math.round(b.width),Math.round(b.height)];
  if (c.type==='TEXT') r.push(c.characters.slice(0,30), c.fontSize, c.fontName.family, c.fontName.style, JSON.stringify(c.lineHeight),
    c.fills[0]?.color ? [c.fills[0].color.r,c.fills[0].color.g,c.fills[0].color.b].map(v=>Math.round(v*255)).join(',') : '');
  else if (c.layoutMode && c.layoutMode!=='NONE') r.push(c.layoutMode+' gap'+c.itemSpacing+' pad'+[c.paddingTop,c.paddingRight,c.paddingBottom,c.paddingLeft].join('/'));
  rows.push(r.join(' | ')); if (d<5 && !['TEXT','VECTOR','BOOLEAN_OPERATION'].includes(c.type)) walk(c,d+1); } }
walk(f,0); return rows.slice(0,150);
```
- Record per section: top/height, paddings, gaps, max-widths; per text: family, weight/style, size, line-height (%→unitless), color. Rect-group decorations → CSS (`clip-path`), no asset.
- Ignore invisible nodes (opacity 0, `visible:false`, height 0); note placeholder copy that differs from live content. Save reference values in the note.

## 3. Compare with live
Open the page in the browser (live, or `?preview_id=<id>&preview=true` logged in; `?v=N` busts cache). Read `tools/measure.js` (copied into the project at setup; if missing, `${CLAUDE_SKILL_DIR}/measure.js`) and run it in the page, then `__measure('<sectionDataId>')` per section and `__checks()` once. It removes cookie banners without consenting — never click consent.
Report a compact Figma-vs-live table per section (px, size/line-height, weight, color). Propose fixes and **wait for confirmation**.

## 4. Build / fix
**V4 (atomic) elements — via MCP.**
- Order: variables/classes/default styles → `elementor-build-composition` (unique `configuration-id` on every tag; classes via `classes`) → `elementor-manage-elements` for updates → `elementor-publish-document` only with the user's OK.
- Reuse kit variables (`var(--Label)`), default tag styles and classes. New classes get stable semantic names (`stat-number`, `card--featured`). Variables/classes/default styles are site-wide: name the impact and ask before changing existing ones.
- Figma px → relative units: `clamp()` for type and sizes, `%`/`max-width` for containers; px only for hairlines/small gaps. Responsive inline: `@media(--tablet){…}` (≤1024), `@media(--mobile){…}` (≤767).
- **Components**: repeating patterns (buttons, cards, list items, section patterns) → reuse (`elementor-list-components`) or create (`elementor-manage-component`, expose editable text/image/link via `overridable_props`) instead of copying markup.
- **Images/icons**: export from Figma (`download_assets`) into `assets/<slug>-<id>/` (prefer WebP/optimized, sensible file names). Upload:
  - If `CLAUDE.md` names a media-upload env var and it's set: list the files + alt texts, get the user's OK, then per file run `node tools/upload-media.mjs <site-url> <file> "<alt>" --env <VAR>` → returns `{id,url,width,height}`. Never print or pass the password itself.
  - Otherwise ask the user to upload them to the Media Library, then find them with `elementor-list-assets`.
  - Place with `e-image` using the returned ID; always set alt text. SVG upload needs an SVG plugin on the site; simple shapes → CSS instead.
- **V3 → V4**: when a V3 section needs substantial changes, propose rebuilding it in V4 next to the old one (user deletes the V3 one after review).

**V3 widgets — MCP can't edit them** (`elementor_v3_not_supported`). Give exact editor values or a scoped CSS block (`selector { … }`, Advanced → Custom CSS). Test it first by injecting it into the live page (replace `selector` with `.elementor-<postId> .elementor-element.elementor-element-<id>`, append a `<style>` to `body`, disable conflicting old rules), then save it to `css/<slug>-<id>/`.
- Scope fixes on the host container rather than editing shared templates/site parts.
- V3 container spacing via its CSS vars: `selector { --padding-top:…; --gap:…; --row-gap:… }`; restate tablet/mobile values in media queries (custom CSS comes after generated responsive rules).
- Nested Carousel → static grid: `.swiper-wrapper{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));transform:none!important}`, `.swiper-slide{width:auto!important;margin:0!important}`, hide `.swiper-slide-duplicate`, pagination, arrows.

## 5. Verify
Re-measure after publishing (or in preview for drafts) at **1440, 1025, 768, 375**: positions vs Figma (aim ≤ ~6px), sizes, no horizontal scroll, decorations not overlapping text, nothing else on the page changed. `__checks()`: one H1, no skipped heading levels, alt text, no empty/vague links; check contrast for new color pairs (≥4.5:1 body, ≥3:1 large). Report issues, don't silently change content. Reset viewport emulation when done.

## 6. Close the loop
Update the note (IDs, settings, reference values, open diffs, short Figma-vs-live summary) and `docs/progress.md`. Keep `css/` in sync with what's live.
**Learn as you go:** if you hit an Elementor/MCP quirk, a workaround or a site convention not covered here, add one line to `CLAUDE.md` → "Site-specific notes & pitfalls" and tell the user in one line if it looks general enough to add to this plugin.

## Lean workflow (keeps token use down)
- Read Figma per section node, never a whole page; delegate big reads to the `figma-reader` agent (short spec back, raw output stays out of this conversation).
- Read page structure with `include_content` only for the elements you will edit; for a large page ask the `page-reader` agent for a compact outline instead of reading the tree yourself.
- Snapshots: only the top-level elements you will edit, not the whole page.
- No screenshots unless something looks wrong; measure at 1440 + 375 while building, all four widths once at the end.
- One session per task (one page/section); state lives in `docs/progress.md`. `/compact` if the session grows.

## MCP pitfalls (verified)
- **`elementor-update-page-settings` REPLACES all document settings**; nothing reads them back. Send every key together (e.g. background + `custom_css`); keep the current values in the note.
- **Padding is one property**: patching only `padding-inline-*` wipes `padding-block-*` for that breakpoint. Send all four sides.
- Edits stay in an autosave until `elementor-publish-document`; `get-page-structure` shows the published tree.
- `manage-elements` is read-modify-write: after `build-composition`, use only IDs from its `resolved_xml`.
- Font families in V4 CSS: `Literata`, not `"Literata, serif"` (stored as one quoted name).
- Nested rules (`& em {…}`) go **last** in a V4 style string; declarations after them are dropped.
- Kit tag defaults (e.g. h2 padding) leak into V4 headings → set `padding:0` or fix them in default styles.
- Global classes render as `.elementor .<label>`; kit class order = priority.
- `create-preview-link` may fail ("Could not create a revision snapshot") → verify on the live/preview URL.
- Inline `<script>` in an HTML widget placed before its targets must wait for `DOMContentLoaded`; in-view effects → IntersectionObserver on the target row.
- V4 elements may lack `.elementor-element-<id>` on the frontend → select with `[data-id="<id>"]`.

## Working style
Concise; minimal targeted changes; confirm before publishing, changing settings or anything shared; step-by-step on complex tasks.
