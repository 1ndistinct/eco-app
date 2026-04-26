import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";

const baseTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#355652",
      light: "#6b8b86",
      dark: "#1f3532",
      contrastText: "#fbfdff",
    },
    secondary: {
      main: "#d98673",
      light: "#ebb1a4",
      dark: "#a96356",
      contrastText: "#ffffff",
    },
    success: {
      main: "#5c8f7b",
      light: "#93baaa",
      dark: "#3b6454",
    },
    warning: {
      main: "#b68a56",
      light: "#d7b388",
      dark: "#8a663f",
    },
    error: {
      main: "#b8747b",
      light: "#d9a4aa",
      dark: "#875159",
    },
    background: {
      default: "#f7fafe",
      paper: "rgba(255, 255, 255, 0.76)",
    },
    text: {
      primary: "#1b2733",
      secondary: "#677482",
    },
    divider: alpha("#a9b6c5", 0.34),
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    h4: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h6: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    subtitle1: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    button: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "light",
        },
        "html, body, #root": {
          minHeight: "100%",
        },
        body: {
          margin: 0,
          background:
            "radial-gradient(circle at top left, rgba(236, 176, 154, 0.18), transparent 30%), radial-gradient(circle at 82% 14%, rgba(182, 210, 224, 0.2), transparent 30%), linear-gradient(180deg, #fdfefe 0%, #f8fbff 54%, #f2f6fb 100%)",
          color: "#1b2733",
        },
        "*": {
          boxSizing: "border-box",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${alpha("#dbe4ed", 0.92)}`,
          backgroundColor: alpha("#ffffff", 0.82),
          boxShadow: "0 1px 0 rgba(255, 255, 255, 0.76)",
          backdropFilter: "blur(14px)",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: "1rem",
          minHeight: 40,
          border: `1px solid ${alpha("#d8e1ea", 0.92)}`,
          backgroundColor: alpha("#ffffff", 0.9),
          boxShadow: "none",
        },
      },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme);
