import React from 'react';
import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from 'expo-router/html';

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
      </body>
    </html>
  );
}
