#!/usr/bin/env node
/* Upload one file to the WordPress Media Library via the REST API (Application Password).
   Usage:  node upload-media.mjs <site-url> <file> [alt text] [--env WP_AUTH_VAR] [--title "Title"]
   Auth:   env var (default WP_AUTH) = "username:application password"  — never pass it on the command line.
   Output: one JSON line {id, url, width, height, alt, mime}  (exit 1 + message on error). Node 18+. */
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); if (i === -1) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const envName = opt('--env') || 'WP_AUTH';
const title = opt('--title');
const [site, file, alt = ''] = args;

const fail = (msg) => { console.error(`upload-media: ${msg}`); process.exit(1); };
if (!site || !file) fail('usage: node upload-media.mjs <site-url> <file> [alt text] [--env WP_AUTH_VAR] [--title "Title"]');
const auth = process.env[envName];
if (!auth || !auth.includes(':')) fail(`env var ${envName} is missing or not "username:application password"`);

const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf' };
const mime = types[extname(file).toLowerCase()];
if (!mime) fail(`unsupported file type ${extname(file)}`);

const base = site.replace(/\/+$/, '') + '/wp-json/wp/v2/media';
const headers = { Authorization: 'Basic ' + Buffer.from(auth).toString('base64') };
const name = basename(file).replace(/[^\w.\-]+/g, '-');

const explain = async (res) => {
  let body = ''; try { body = await res.text(); } catch {}
  let code = ''; try { code = JSON.parse(body).code || ''; } catch {}
  const hint = res.status === 401 ? ' (wrong username/application password, or Application Passwords blocked)'
    : res.status === 403 ? ' (user lacks upload_files, or a security plugin/host blocks the REST API)'
    : res.status === 413 ? ' (file larger than the server upload limit)'
    : code === 'rest_upload_sideload_error' || /svg/i.test(body) ? ' (file type not allowed — SVG needs a plugin like Safe SVG)' : '';
  return `HTTP ${res.status} ${code}${hint}`;
};

let data;
try { data = await readFile(file); } catch { fail(`cannot read ${file}`); }

const res = await fetch(base, { method: 'POST', headers: { ...headers, 'Content-Type': mime, 'Content-Disposition': `attachment; filename="${name}"` }, body: data })
  .catch(e => fail(`request failed: ${e.message}`));
if (!res.ok) fail(await explain(res));
const media = await res.json();

if (alt || title) {
  const upd = await fetch(`${base}/${media.id}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(alt && { alt_text: alt }), ...(title && { title }) }) }).catch(e => fail(`uploaded #${media.id} but alt/title update failed: ${e.message}`));
  if (!upd.ok) fail(`uploaded #${media.id} but alt/title update failed: ${await explain(upd)}`);
}

console.log(JSON.stringify({ id: media.id, url: media.source_url, width: media.media_details?.width ?? null,
  height: media.media_details?.height ?? null, alt, mime: media.mime_type }));
