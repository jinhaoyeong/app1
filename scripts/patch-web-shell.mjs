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
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
    <link rel="manifest" href="/manifest.json" />`;

if (!html.includes('apple-mobile-web-app-capable')) {
  writeFileSync(htmlPath, html.replace('</head>', `${metadata}\n  </head>`));
} else if (!html.includes('interactive-widget=resizes-content')) {
  writeFileSync(
    htmlPath,
    html.replace(
      'viewport-fit=cover',
      'viewport-fit=cover, interactive-widget=resizes-content',
    ),
  );
}

copyFileSync(resolve(root, 'assets/icon.png'), resolve(dist, 'icon.png'));
copyFileSync(
  resolve(root, 'assets/icon.png'),
  resolve(dist, 'apple-touch-icon.png'),
);
console.log(`Patched ${htmlPath} and copied the install icon.`);
