// Bundles the Expo web export (dist/) into one self-contained HTML file: web-build/motorsport-empire.html
// Usage: npx expo export -p web && node scripts/build-single-html.mjs
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const m = html.match(/<script src="([^"]+)"[^>]*><\/script>/);
if (!m) throw new Error('bundle script tag not found');
const js = fs.readFileSync(path.join(dist, m[1]), 'utf8').replace(/<\/script/gi, '<\\/script');

const head = `
    <style>
      :root { --bg: #0B0C0F; --text: #F2F3F5; color-scheme: dark; }
      @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0B0C0F; --text: #F2F3F5; } }
      :root[data-theme="dark"] { --bg: #0B0C0F; --text: #F2F3F5; }
      html, body { background: var(--bg); color: var(--text); margin: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    </style>`;

let out = html
  .replace('<link rel="icon" href="/favicon.ico"/>', '')
  .replace('<meta httpEquiv="X-UA-Compatible" content="IE=edge" />', '')
  .replace('</head>', `${head}\n  </head>`)
  .replace(m[0], () => `<script>${js}</script>`);

fs.mkdirSync('web-build', { recursive: true });
fs.writeFileSync('web-build/motorsport-empire.html', out);
console.log('wrote web-build/motorsport-empire.html', (out.length / 1024).toFixed(0), 'KB');

// Variant for hosts that supply their own document skeleton (claude.ai artifacts):
// no doctype/html/head/body tags, single deliberate dark theme.
const artifact = `<title>Motorsport Empire</title>
<style>
  :root { --bg: #0B0C0F; --fg: #F2F3F5; color-scheme: dark; }
  html, body { height: 100%; background: var(--bg); color: var(--fg); }
  body { overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<noscript>Motorsport Empire needs JavaScript to run.</noscript>
<div id="root"></div>
<script>${js}</script>
`;
fs.writeFileSync('web-build/artifact.html', artifact);
console.log('wrote web-build/artifact.html');
