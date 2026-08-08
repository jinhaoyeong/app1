import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const htmlPath = resolve(dist, 'index.html');

const html = readFileSync(htmlPath, 'utf8');
const metadata = `
    <meta name="theme-color" content="#16120F" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Luma" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="manifest" href="/manifest.json" />`;

if (!html.includes('apple-mobile-web-app-capable')) {
  writeFileSync(htmlPath, html.replace('</head>', `${metadata}\n  </head>`));
}

copyFileSync(resolve(root, 'assets/icon.png'), resolve(dist, 'icon.png'));
console.log(`Patched ${htmlPath} and copied the install icon.`);
