---
name: site-build
description: Build a whole HubSpot CMS theme from a Figma file in phases — tokens, shared CSS, header/footer, modules, page templates — with an approval gate after each phase. Use when the user gives a Figma file and asks to build the HubSpot website/theme/all pages (not a single module or section).
argument-hint: "<figma-file-link>"
---

# Full HubSpot theme from Figma

Figma: $ARGUMENTS or the link in the user's message (ask if missing). No theme project in the folder → run the plugin's `setup` skill first. Every build step follows the `build` skill (structure rules, lint, draft upload, verify). Track phases in `docs/progress.md` → "Site-wide". **Stop for approval at the end of each phase.**

## Phase 0 — Inventory (read-only)
1. Figma: list pages/frames (desktop + mobile), style-guide frame, repeated patterns, interactions (hovers, sliders, scroll effects), forms.
2. Starter: which of the 12 starter modules (`theme/modules/`) already fit; which must be changed, added or removed.
3. Output a **site map**: header, footer, each page (frame link) → template, module list per page, and what's missing from the design (mobile frames, hover states, form behaviour). Also list what the user does by hand: HubSpot menus, forms, blog setup, domains/SEO, publishing.

## Phase 1 — Tokens and base CSS
Propose (tables): color tokens, font families + weights, content width, section padding scale → root `theme/fields.json`; `:root` vars in `base.html`; `css/base.css` shared patterns (headings, eyebrow, links, button variants). After OK: edit, lint, upload draft, verify on a template.

## Phase 2 — Header & footer
Non-global modules in `templates/partials/header.html` / `footer.html` (global partials). Menus come from HubSpot menu fields (the user creates the menu in HubSpot). Mobile menu per design; verify at 375.

## Phase 3 — Modules (parallel)
1. Main agent proposes the module list (name, Figma node link, fields/variants) → **wait for OK**. Anything shared (tokens, type styles, link/button patterns) is already in Phase 1.
2. Fan out: one `module-builder` agent per module (up to 4 at once, in ONE message so they run in parallel). Each prompt contains: project folder, module name, **full Figma node link**, the shared classes/tokens that exist, and "don't touch shared files". They write only their own module folder + uniquely named images.
3. Collect results. Apply every "Shared additions needed" yourself (once, in `base.css` / `fields.json`), fix the modules to use them, run `npm run lint` (0 errors).
4. **Ask the user**, then `npm run upload` (draft) and fetch back. Then QA in this thread: one `__measureAt` call per module with the Figma values as `expected` (use `qa-reviewer` agents only if the user asks for a deep review). Fix the blockers/majors, re-run QA on what changed, then get approval. Delete unused starter modules only with OK.
A single module is not worth an agent: build it directly with the `build` skill.

## Phase 4 — Page templates
Per page: template with `dnd_area` / `dnd_section` (background, padding, max_width at section level) / `dnd_module`. One template per structurally different layout. Verify each in preview.

## Phase 5 — QA
Run QA in this thread (`qa-reviewer` agents only on request). Per template: Figma vs preview at 1440 / 1025 / 768 / 375, a11y basics, performance checklist (LCP image, lazy images, font weights), `npm run lint` clean, fetch-back of every touched file. Summarize in `docs/progress.md`. Publishing is the user's step; list exactly which drafts are ready.
