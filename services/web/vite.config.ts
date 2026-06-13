import { federation } from "@module-federation/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
  const isTest = process.env.VITEST === "true";
  const todoRemoteEntry = process.env.VITE_TODO_REMOTE_ENTRY ?? "/todo/remoteEntry.js";
  const nicoleRemoteEntry = process.env.VITE_NICOLE_REMOTE_ENTRY ?? "/nicole/remoteEntry.js";

  return {
    assetsInclude: ["**/*.JPG", "**/*.JPEG", "**/*.PNG", "**/*.WEBP"],
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
            nicoleApp: {
              type: "module",
              name: "nicoleApp",
              entry: nicoleRemoteEntry,
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
            "frankicon-32x32.png",
            "frankicon-180x180.png",
            "frankicon-192x192.png",
            "frankicon-512x512.png",
          ],
          manifest: {
            id: "/",
            name: "Frank",
            short_name: "Frank",
            description: "Frank, the collaborative workspace app shell.",
            theme_color: "#f8fbff",
            background_color: "#f8fbff",
            display: "standalone",
            scope: "/",
            start_url: "/",
            categories: ["productivity", "business"],
            icons: [
              {
                src: "frankicon-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "frankicon-512x512.png",
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
            "nicoleApp/BirthdayFeature": fileURLToPath(
              new URL("../web-nicole/src/exposed/BirthdayFeature.tsx", import.meta.url),
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
        "/nicole/remoteEntry.js": {
          target: process.env.VITE_NICOLE_DEV_SERVER ?? "http://127.0.0.1:4175",
          changeOrigin: true,
        },
        "/nicole/assets": {
          target: process.env.VITE_NICOLE_DEV_SERVER ?? "http://127.0.0.1:4175",
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
