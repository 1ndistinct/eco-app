import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";

import { StandaloneApp } from "./StandaloneApp";
import { theme } from "./theme";
import "./todoFeature.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StandaloneApp />
    </ThemeProvider>
  </React.StrictMode>,
);
