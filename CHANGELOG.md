# Changelog

## hubspot-figma

### 0.3.0
- Lean workflow (token use): rules in the build skills and project `CLAUDE.md`; `figma-reader` agent (one Figma node → short spec + downloaded assets); `measure.js` low-token mode `__measureAt(..., { expected })` returns only differences; `hubspot-docs` runs on a smaller model.

### 0.2.2
- `measure.js`: `__measureAt([widths], root, [extra])` measures at exact viewport widths through same-origin iframes (window resize does not change the viewport in the desktop built-in browser) and reports each frame's real `innerWidth`. Found by a fresh-install test session; tested in the browser pane.

### 0.2.1
- `lint.mjs` rejects invalid field types (`textarea`, `string`, `select`, …) and fields without `label`/`type`, and warns on unrecognized types; docs: multi-line text = `text` + `allow_new_line`. Found in a fresh-install test where `textarea` failed the upload.

### 0.2.0
- `measure.js` (computed-style measuring + a11y checks, tested in the browser) and `compare-images.mjs` (Figma vs live screenshot: mismatch %, hotspots, diff image); qa-reviewer and build use them. `update` / `refresh` commands with a project version stamp (`doctor` warns when a project is behind).

### 0.1.0
- `setup` copies `module-reference.md` into `docs/` (no out-of-folder read prompts); pitfall: section backgrounds are full-bleed (contained panel = module wrapper).
- Agents `module-builder` (one module per Figma node, parallel) and `qa-reviewer` (read-only QA); `site-build` Phase 3 fans out builders, Phase 5 runs reviewers.
- `agents/hubspot-docs`: answers HubSpot questions from the official docs (HubSpotDev MCP). `doctor` also checks the Figma plugin/MCP and the docs MCP and can install them.
- `setup` runs through `setup.mjs` (doctor / accounts / install-hs / init): checks Node, HubSpot CLI and connected portals, guides CLI install and new-portal connection, refuses to overwrite a project or a portal folder.
- First version: `setup` (starter theme from the Aerden reference, bound to one HubSpot account), `build`, `site-build` skills, `lint.mjs`, `optimize-images.mjs`.
- Upload in draft mode; local preview (`hs cms theme preview`) not integrated yet.
- `build`: shared-first rule, `module-reference.md` (module anatomy, field patterns, layout rules), preview via Claude in Chrome, new pitfalls (`body` reserved, BOM, half-failed uploads, brand fonts).
- Code standard (HTML/CSS/JS/HubL) in `module-reference.md`; starter scripts modernized (`const`/`let`), starter lint is 0 errors / 0 warnings; lint also flags missing `alt`/`loading`, `!important`, `float`, inline styles, inline handlers, jQuery, `var`, `document.write`.
- `lint.mjs`: BOM, `body` reserved, `overflow`+`aspect-ratio` on text boxes, module with no shared class.

## elementor-figma

### 0.4.0
- Lean workflow (token use): rules in the build skill and project `CLAUDE.md`; new agents `figma-reader` (one Figma node → short spec + downloaded assets) and `page-reader` (compact outline of a large page, read-only).

### 0.3.0
- `update` and `refresh` commands; projects carry a version stamp (`.stoica-plugin.json`) and `doctor` warns when their `tools/` are older than the plugin.
- `setup.mjs` (doctor / servers / connect / install-figma / init): checks Node, Claude CLI, Elementor MCP servers and Figma; `connect` adds a site safely (credentials typed in your terminal, verified against the site before anything is added, `--replace`, `--media-upload`); `init` creates the project (own git repo, no BOM, refuses to overwrite).
- `measure.js` and `upload-media.mjs` are copied into the project (`tools/`): no out-of-folder permission prompts.
- Desktop-app wording for sign-in and terminals.

### 0.2.1
- Docs only: the Elementor guide moved to `plugins/elementor-figma/README.md`; root README is now an overview of all plugins.

### 0.2.0
- Media upload to the WordPress Media Library (`upload-media.mjs`, env var with Application Password).
- "Learn as you go": new quirks recorded in the site's `CLAUDE.md`.
- Setup asks about media uploads.

### 0.1.1
- Setup and site-build trigger from plain-language requests (no command needed).

### 0.1.0
- First version: `build`, `setup`, `site-build` skills, `measure.js`.
