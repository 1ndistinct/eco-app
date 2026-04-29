import { federation } from "@module-federation/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
  const isTest = process.env.VITEST === "true";
  const todoRemoteEntry = process.env.VITE_TODO_REMOTE_ENTRY ?? "/todo/remoteEntry.js";

  return {
    plugins: [
      react(),
      !isTest &&
        federation({
          name: "shellApp",
          hostInitInjectLocation: "entry",
          remotes: {
            todoApp: {
              type: "module",
              name: "todoApp",
              entry: todoRemoteEntry,
            },
          },
          shared: {
            react: {
              singleton: true,
            },
            "react-dom": {
              singleton: true,
            },
            "@mui/material": {
              singleton: true,
            },
            "@emotion/react": {
              singleton: true,
            },
            "@emotion/styled": {
              singleton: true,
            },
          },
        }),
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
    resolve: {
      alias: isTest
        ? {
            "todoApp/TodoFeature": fileURLToPath(
              new URL("../web-todo/src/exposed/TodoFeature.tsx", import.meta.url),
            ),
          }
        : undefined,
    },
    server: {
      fs: {
        allow: [".."],
      },
      proxy: {
        "/todo/remoteEntry.js": {
          target: process.env.VITE_TODO_DEV_SERVER ?? "http://127.0.0.1:4174",
          changeOrigin: true,
        },
        "/todo/assets": {
          target: process.env.VITE_TODO_DEV_SERVER ?? "http://127.0.0.1:4174",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "chrome89",
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      exclude: ["tests/e2e/**"],
    },
  };
});
