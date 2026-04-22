import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";

const baseTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#16423c",
      light: "#2f6d64",
      dark: "#102e2a",
      contrastText: "#f6f0e8",
    },
    secondary: {
      main: "#f05d3f",
      light: "#ff8b73",
      dark: "#b7442d",
      contrastText: "#fff6ef",
    },
    success: {
      main: "#2d7f5e",
      light: "#55a981",
      dark: "#205944",
    },
    warning: {
      main: "#b96d1a",
      light: "#e29a44",
      dark: "#8d5211",
    },
    error: {
      main: "#b13b39",
      light: "#d15e5b",
      dark: "#7e2b29",
    },
    background: {
      default: "#f3ebdf",
      paper: "rgba(255, 250, 244, 0.78)",
    },
    text: {
      primary: "#14221d",
      secondary: "#4b5a53",
    },
    divider: alpha("#1f3c34", 0.14),
  },
  shape: {
    borderRadius: 24,
  },
  typography: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
      fontSize: "clamp(2.8rem, 8vw, 5.2rem)",
      lineHeight: 0.96,
      letterSpacing: "-0.05em",
    },
    h2: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h3: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h4: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h5: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.02em",
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
    overline: {
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
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
            "radial-gradient(circle at top left, rgba(240, 93, 63, 0.18), transparent 32%), radial-gradient(circle at 82% 16%, rgba(22, 66, 60, 0.12), transparent 28%), linear-gradient(180deg, #f7f1e7 0%, #f3ebdf 52%, #efe4d5 100%)",
          color: "#14221d",
        },
        "*": {
          boxSizing: "border-box",
        },
        "::selection": {
          backgroundColor: alpha("#f05d3f", 0.24),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backdropFilter: "blur(18px)",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: "1.25rem",
          minHeight: 52,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 22,
          backgroundColor: alpha("#ffffff", 0.74),
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          backgroundImage: "none",
        },
      },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme);

