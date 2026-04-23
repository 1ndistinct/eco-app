import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
  const isTest = process.env.VITEST === "true";

  return {
    plugins: [
      react(),
      !isTest &&
        VitePWA({
          injectRegister: "script",
          registerType: "autoUpdate",
          includeAssets: [
            "favicon.svg",
            "favicon.png",
            "favicon-32x32.png",
            "apple-touch-icon.png",
          ],
          manifest: {
            id: "/",
            name: "Eco Todo Studio",
            short_name: "Eco",
            description: "Collaborative workspace todos in an installable app shell.",
            theme_color: "#f8fbff",
            background_color: "#f8fbff",
            display: "standalone",
            scope: "/",
            start_url: "/",
            categories: ["productivity", "business"],
            icons: [
              {
                src: "pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "pwa-512x512.png",
                sizes: "512x512",
                type: "image/png",
              },
            ],
          },
          workbox: {
            navigateFallback: "index.html",
            navigateFallbackDenylist: [/^\/api\//],
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          },
        }),
    ].filter(Boolean),
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      exclude: ["tests/e2e/**"],
    },
  };
});
