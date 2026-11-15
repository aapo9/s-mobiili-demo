import type { PropsWithChildren } from 'react';
import { useServerDocumentContext } from 'expo-router/html';

/**
 * The web page around the app (web only; native ignores this file).
 *
 * - Phones: the app fills the screen. viewport-fit=cover lets safe-area-context
 *   read the notch / home-indicator insets, and the home-screen meta tags make
 *   "Add to Home Screen" open full screen.
 * - Desktop / tablet (≥ 600 px wide): the app is shown as a phone. It always lays
 *   out at a real 390×844 and the whole frame is scaled down (`--phone-scale`)
 *   to fit short screens, so the aspect ratio stays a real phone's.
 *
 * SDK 58: `headNodes` / `bodyNodes` carry the app's own <script>, styles and
 * favicon. Leaving them out renders a page that never loads the app.
 */
const css = `
html, body { height: 100%; margin: 0; background: #ffffff; }
body { overflow: hidden; -webkit-tap-highlight-color: transparent; overscroll-behavior: none; }
#root { display: flex; height: 100%; flex: 1; }
@supports (height: 100dvh) { html, body { height: 100dvh; } }
@media (min-width: 600px) {
  body { background: #1f2a24; display: flex; align-items: center; justify-content: center; }
  #root {
    flex: none;
    width: 390px;
    height: 844px;
    border-radius: 44px;
    overflow: hidden;
    box-shadow: 0 0 0 12px #0d1310, 0 24px 60px rgba(0, 0, 0, 0.5);
    /* The transform also keeps position: fixed children (the RN-web Modal) inside the frame. */
    transform: scale(var(--phone-scale, 1));
    transform-origin: center;
  }
}`;

// Fit the 390×844 phone (plus its 12px bezel and some margin) into the window, never upscaling.
const fit = `(function () {
  function fit() {
    var s = Math.min(1, (window.innerHeight - 64) / 868, (window.innerWidth - 64) / 414);
    document.documentElement.style.setProperty('--phone-scale', String(Math.max(0.3, s)));
  }
  fit();
  window.addEventListener('resize', fit);
})();`;

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="fi" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <title>S-mobiili Säästä (demo)</title>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="description" content="S-mobiili Säästä: a clickable demo. Clean up future spending before payday." />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Säästä" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style id="phone-frame" dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: fit }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
