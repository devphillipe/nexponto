// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        includeAssets: ["icon-192.png", "icon-512.png"],
        manifest: false, // public/manifest.json is the single source of truth
        workbox: {
          // The app is server-rendered: there is no static index.html to fall back to.
          navigateFallback: undefined,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ["**/*.{js,css,woff,woff2}"],
          navigationPreload: true,
          runtimeCaching: [
            {
              // HTML navigations: always try the network first so a new deploy wins.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "html-navigations",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Hashed build assets are immutable.
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\/_build\/|\/assets\//.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:png|svg|jpg|jpeg|webp|ico)$/.test(url.pathname),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
          // Never cache API/auth traffic — time entries must always hit the network.
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        },
      }),
    ],
  },
});
