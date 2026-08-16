import React from 'react';
import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from 'expo-router/html';
import {
  LUMA_VIEWPORT_CSS,
  LUMA_VIEWPORT_SCRIPT,
} from '../src/web/viewportLock';

/** Web shell metadata for a real iOS/Android home-screen installation. */
export default function HtmlDocument({
  children,
}: {
  children: React.ReactNode;
}) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } =
    useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        {headNodes}
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#16120F" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Luma" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
        <ScrollViewStyleReset />
        <style
          id="luma-ios-viewport"
          dangerouslySetInnerHTML={{ __html: LUMA_VIEWPORT_CSS }}
        />
        <script dangerouslySetInnerHTML={{ __html: LUMA_VIEWPORT_SCRIPT }} />
      </body>
    </html>
  );
}
