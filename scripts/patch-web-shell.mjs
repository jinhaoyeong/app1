import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const htmlPath = resolve(root, 'dist', 'index.html');

const html = readFileSync(htmlPath, 'utf8');
const buildId = Date.now().toString();
const metadata = `
    <meta name="theme-color" content="#16120F" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Luma" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta name="luma-build" content="${buildId}" />
    <link rel="manifest" href="/manifest.json" />`;

let next = html;
if (!html.includes('apple-mobile-web-app-capable')) {
  next = html.replace('</head>', `${metadata}\n  </head>`);
}

next = next.replace(
  /content="width=device-width, initial-scale=1[^"]*"/,
  'content="width=device-width, initial-scale=1, viewport-fit=cover"',
);

if (next.includes('name="luma-build"')) {
  next = next.replace(
    /<meta name="luma-build" content="[^"]*"\s*\/?>/,
    `<meta name="luma-build" content="${buildId}" />`,
  );
} else {
  next = next.replace(
    '</head>',
    `    <meta name="luma-build" content="${buildId}" />\n    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n  </head>`,
  );
}

if (next !== html) {
  writeFileSync(htmlPath, next);
}

copyFileSync(resolve(root, 'assets/icon.png'), resolve(dist, 'icon.png'));
copyFileSync(
  resolve(root, 'assets/icon.png'),
  resolve(dist, 'apple-touch-icon.png'),
);
console.log(`Patched ${htmlPath} and copied the install icon (${buildId}).`);
