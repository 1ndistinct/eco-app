import { federation } from "@module-federation/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/todo/",
  plugins: [
    react(),
    federation({
      name: "todoApp",
      filename: "remoteEntry.js",
      exposes: {
        "./TodoFeature": "./src/exposed/TodoFeature.tsx",
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
  ],
  server: {
    port: 4174,
  },
  preview: {
    port: 4174,
  },
  build: {
    target: "chrome89",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
