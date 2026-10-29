{
  "name": "{{SLUG}}-hubspot-theme",
  "private": true,
  "scripts": {
    "upload": "hs cms upload theme {{DEST}} --account={{ACCOUNT_ID}} --cms-publish-mode=draft",
    "watch": "hs cms watch theme {{DEST}} --account={{ACCOUNT_ID}} --cms-publish-mode=draft",
    "lint": "node tools/lint.mjs theme",
    "optimize-images": "node tools/optimize-images.mjs theme/images"
  },
  "devDependencies": {
    "sharp": "^0.33.5"
  }
}
