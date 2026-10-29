---
name: site-build
description: Build a whole Elementor (V4) website from a Figma file in phases — design system, components, header/footer, pages — with an approval gate after each phase. Use when the user gives a Figma file and asks to build the website/site/all pages (not a single page or section).
argument-hint: "<figma-file-link>"
---

# Full site build from Figma

Figma: $ARGUMENTS or the link in the user's message (ask if missing). If the folder has no `CLAUDE.md` for the site, run the plugin's `setup` skill first, then continue here.
Every build step follows the `build` skill of this plugin (backups, relative units, semantic names, pitfalls). Track phases in `docs/progress.md` → "Site-wide". **Stop for the user's approval at the end of each phase.**

## Phase 0 — Inventory (read-only)
1. Site: V4 widgets available, Pro/Theme Builder available, existing variables/classes/default styles/components/site parts, existing pages (`elementor-list-posts`).
2. Figma: list the pages/frames (desktop + mobile frames if any), shared styles/variables, repeated patterns (instances of the same component, same card/section shapes).
3. Output a **site map**: header, footer, each page (frame link), templates needed (single post, archive, 404, loop item), and what's missing from the design (mobile frames, hover states, forms behaviour).

## Phase 1 — Design system (proposal → approval → apply)
Propose, as tables:
- **Color variables** (`global-color-variable`): semantic labels (`Primary`, `Text`, `Surface`…) plus the raw palette if needed.
- **Font variables** (`global-font-variable`) for each family.
- **Size variables** (`global-size-variable` / `global-custom-size-variable`): fluid type scale with `clamp()` (H1–H6, body, small), spacing scale (section padding desktop/tablet/mobile, gaps), container max-width.
- **Default tag styles** (`elementor-manage-default-styles`): h1–h6, p, a (+ hover/focus), button-like elements — font, size var, line-height, weight, color, margin 0. With `@media(--tablet)` / `@media(--mobile)` where the scale changes.
- **Global classes** only for real patterns (e.g. `container`, `section`, `section--dark`, `eyebrow`, `text-lead`, `btn`, `btn--secondary`). No one-off classes.
After approval: snapshot (empty on a fresh site), apply variables → default styles → classes, then build a hidden **style test page** (draft) showing all headings, text, buttons and colors; check it in preview at 1440/768/375 before continuing.

## Phase 2 — Components
For each repeated pattern (button, card, testimonial, feature item, CTA band, logo row…): propose name, structure, editable fields (`overridable_props`: text, image, link). After approval create them with `elementor-manage-component` (V4 elements + global classes, no inline styling beyond layout). Place each on the style test page and verify.

## Phase 3 — Header & footer (Elementor Pro)
1. `elementor-manage-site-parts` → create `header` and `footer` (drafts) with conditions `include/general`.
2. Build them with `elementor-build-composition` into the returned post IDs (logo via `elementor-list-assets`, `nav-menu` widget for menus, components for buttons).
3. The user creates the WordPress menus (Appearance → Menus) and uploads the logo/images — list exactly what's needed.
4. Mobile: hamburger/menu behaviour per the design; verify at 375.
5. Publish site parts only with the user's OK.

## Phase 4 — Pages
Per page (one at a time, in the order the user picks): create a draft (`elementor-create-page`) or use the ID given → note → plan → build section by section, composed from components and classes → verify each section in preview → approval. Remind the user to set the homepage (Settings → Reading), slugs and SEO.

## Phase 5 — Templates (if the site has a blog/CPT)
Single post / archive / loop item via site parts + `e-collection-loop`, following `elementor://wordpress/best-practices` (one template driven by dynamic data, include-all + exclude exceptions).

## Phase 6 — QA
For every page and site part: `tools/measure.js` at 1440 / 1025 / 768 / 375, `__checks()`, contrast of the color pairs used, no horizontal scroll, header/footer on every page. Produce a short report per page in its note and a summary in `docs/progress.md`. Publish only what the user approves.

## What the user does by hand (list it up front)
Media uploads, WordPress menus, Site Settings (Reading/homepage, permalinks), plugins/CPTs/fields, forms' email settings, SEO, and anything needing V3-only widgets (e.g. sliders).
