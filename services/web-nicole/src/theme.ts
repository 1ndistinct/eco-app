import { createTheme } from "@mui/material";

export const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#fff8ee",
      paper: "#fffdf8",
    },
    text: {
      primary: "#1e293b",
      secondary: "#475569",
    },
    primary: {
      main: "#0f766e",
    },
    secondary: {
      main: "#d97706",
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: '"Manrope", "Avenir Next", "Segoe UI", sans-serif',
  },
});
