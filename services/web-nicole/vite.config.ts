import { federation } from "@module-federation/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/nicole/",
  plugins: [
    react(),
    federation({
      name: "nicoleApp",
      filename: "remoteEntry.js",
      exposes: {
        "./BirthdayFeature": "./src/exposed/BirthdayFeature.tsx",
      },
      shared: {
        react: {
          import: false,
          singleton: true,
        },
        "react-dom": {
          import: false,
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
    port: 4175,
  },
  preview: {
    port: 4175,
  },
  build: {
    target: "chrome89",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
