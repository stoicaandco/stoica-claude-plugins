# Module reference (read before writing any module)

The starter theme's modules are the canonical examples: `Hero.module` (content/style split, visibility-gated group), `Cards.module` (repeating group with different defaults), `Slider.module` (inline JS). Copy their structure, don't invent a new one.

## Anatomy: 3 files, nothing else
```
modules/<Name>.module/
  meta.json     {"label":"<Name>","content_types":["SITE_PAGE","LANDING_PAGE"],"global":false,"categories":["BODY_CONTENT"]}
  fields.json   array of fields (below)
  module.html   order: require_css block → macros/{% set %} → markup → inline <script> (optional)
```
```html
{% require_css %}
<style>
  {% scope_css %}
  .name { background: {{ module.style.background.color|default('var(--color-paper)', true) }}; }
  {% end_scope_css %}
</style>
{% end_require_css %}
<section class="name"> … </section>
<script>(function(){ var root = document.currentScript.previousElementSibling; /* scope to this module */ })();</script>
```

## Shared first (before the module)
1. List what repeats in the design: text styles (Figma `Desktop/H2`, `Body small`…), kicker/eyebrow, link styles, icon buttons, button variants.
2. Check `theme/css/base.css`. Missing or different → **update/add it there** (type scale on `h1–h3`, `.text-small`, `.eyebrow`, `.link-*`, `.button--*`, icon helpers).
3. The module then only holds its own layout and uses the shared classes. A module with no shared class is a smell: re-check step 1.

## Fields
- Types: only HubSpot's own (`text`, `richtext`, `number`, `boolean`, `choice`, `color`, `image`, `link`, `url`, `video`, `group`, `font`, `icon`, `file`, `date`, …). No `textarea`/`string`/`select`: multi-line plain text is `"type": "text"` with `"allow_new_line": true`; long formatted copy is `richtext`. Every field has `name`, `label`, `type`.
- Names: never `name`, `label`, `body` (silently drop the whole `fields.json`; run `npm run lint`). Tab split: content fields default tab, style group `"tab": "STYLE"` named `style`.
- Style fields read as `module.style.<field>.color`, fall back to a token: `|default('var(--color-ink)', true)`.
- A `choice` whose values are CSS class names (`card--solid`) maps straight to `class="{{ card.variant }}"`.
- Repeating items with DIFFERENT defaults per row → a `group` with `occurrence` + `"default": [ {…}, {…} ]` (array of row objects). `sorting_label_field` is `"<group>.<field>"`.
- `visibility.controlling_field_path` = absolute dot path from the fields root, no index (`cards.variant`), with `controlling_value_regex` + `"operator":"EQUAL"`.
- Defaults must render a complete, good-looking module on a blank page (copy from Figma). Image fields default `{"src":"","alt":"…"}`; fall back to bundled theme images in HTML: `{% set src = item.image.src %}{% if not src and loop.index0 < 3 %}{% set src = get_asset_url('../../images/' ~ fallbacks[loop.index0]) %}{% endif %}`.
- Link field default: `{"url":{"content_id":null,"type":"EXTERNAL","href":"#"}}`; read `link.url.href|default('#', true)`.

## CSS layout rules (these caused real bugs)
- Design px → relative. Inside a card/tile, scale with the card: `container-type: inline-size` on the card, children use `clamp(min, Ncqw, figma-px)` for padding, gaps, type, logo height (N = figma-px ÷ card-width × 100). Fixed px inside a fluid card overflows when the card is narrower than in Figma.
- Never `overflow:hidden` on a box that has `aspect-ratio` (content gets clipped, links disappear). Let it grow.
- Media pinned to the card bottom: `flex:none; margin-top:auto; aspect-ratio:…` — otherwise flex shrinks the photo and cards no longer align.
- Decorations (bars, shapes) = CSS (`repeating-linear-gradient`, pseudo-elements), positioned in `cqw`, no image asset.
- Icons: inline SVG, `currentColor` (+ one CSS var for a fill), path data from the Figma export, never redrawn. Put the SVG in a `{% macro %}` when used more than once.
- A contained panel (rounded corners, own background, narrower than the viewport) = the module's wrapper element with a `style.panel_background` field; the template section only caps `max_width` and carries a light page colour.
- Mobile: if the design has no mobile frame, stack in one column ≤1024px and say so in the plan.

## Files and encoding
- UTF-8 **without BOM** (PowerShell 5.1 `Set-Content -Encoding utf8` adds one and breaks `theme.json`; use the Write tool or `[IO.File]::WriteAllText` with `UTF8Encoding($false)`). `npm run lint` catches it.
- Images: jpg/png/svg only; photos through `npm run optimize-images` (Figma often exports a 4000px JPEG with a `.png` name: check with `file`, rename).
- Fonts: Google fonts via explicit `<link>` weights in `base.html`. A custom/brand font needs the `.woff2` files from the user; until then fall back to `sans-serif` and say so.

## Code standard (clean, modern; `npm run lint` enforces what it can)
**HTML** — landmarks and the right element: `section`/`article`/`nav`/`footer`, one heading per idea at the right level (`heading_type` choice for h1/h2), `a` for navigation and `button` for actions, a `<p>`/`<ul>` for text and lists, never `<div onclick>`. Every `<img>` has `alt` (empty `alt=""` only for decoration), `loading="lazy" decoding="async"`, and `fetchpriority="high"` with no lazy on the single LCP image; give `width`/`height` or an `aspect-ratio` so nothing jumps. Decorative SVG: `aria-hidden="true"`. Icon-only links/buttons get `aria-label`.
**CSS** — modern layout only: `grid`/`flex` + `gap`, logical properties (`padding-inline`, `margin-block`, `inset`), `clamp()`, `aspect-ratio`, `min()`/`max()`, container queries (`cqw`) for components, custom properties for tokens (`var(--color-ink)`), `:focus-visible` styles, `prefers-reduced-motion` handled globally in `base.html`. No `float`, no `!important`, no magic numbers without a Figma source, no inline `style` except custom properties (`style="--accent: …"`), no vendor prefixes unless needed. Class names are semantic and BEM-light (`services-card`, `card--solid`); shared patterns live in `base.css`, never copy-pasted.
**JS** (only when the design needs behaviour) — vanilla ES2020 in an IIFE at the bottom of `module.html`, scoped via `document.currentScript.previousElementSibling`; `const`/`let` (never `var`), `querySelector`, `addEventListener`, `IntersectionObserver` instead of scroll listeners, `data-*` hooks instead of styling classes, graceful no-JS state (content visible without the script), reduced-motion respected. No jQuery, no `document.write`, no inline handler attributes.
**HubL** — `{% macro %}` for repeated markup, `{% set %}` for derived values, `|default(x, true)` on every optional field, `{% if field %}` around optional blocks so empty fields render no empty wrappers, `loop.index0`/`loop.first` instead of counters, `get_asset_url('../../images/x')` for bundled assets, no logic that belongs in CSS.
