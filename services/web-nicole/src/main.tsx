import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";

import { StandaloneApp } from "./StandaloneApp";
import { theme } from "./theme";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found.");
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StandaloneApp />
    </ThemeProvider>
  </StrictMode>,
);
