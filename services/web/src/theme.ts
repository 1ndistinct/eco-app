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
            "radial-gradient(circle at top left, rgba(236, 176, 154, 0.18), transparent 30%), radial-gradient(circle at 82% 14%, rgba(182, 210, 224, 0.2), transparent 30%), linear-gradient(180deg, #fdfefe 0%, #f8fbff 54%, #f2f6fb 100%)",
          color: "#1b2733",
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
          backdropFilter: "none",
          boxShadow: "none",
        },
        sizeSmall: {
          minHeight: 34,
          paddingInline: "0.85rem",
        },
        contained: ({ theme, ownerState }) => {
          const surfaceByColor = {
            inherit: alpha("#eef3f6", 0.92),
            primary: alpha(theme.palette.primary.light, 0.14),
            secondary: alpha(theme.palette.secondary.light, 0.14),
            success: alpha(theme.palette.success.light, 0.14),
            warning: alpha(theme.palette.warning.light, 0.16),
            error: alpha(theme.palette.error.light, 0.16),
          } as const;
          const surfaceHoverByColor = {
            inherit: alpha("#e7edf3", 0.96),
            primary: alpha(theme.palette.primary.light, 0.2),
            secondary: alpha(theme.palette.secondary.light, 0.2),
            success: alpha(theme.palette.success.light, 0.2),
            warning: alpha(theme.palette.warning.light, 0.22),
            error: alpha(theme.palette.error.light, 0.22),
          } as const;
          const textByColor = {
            inherit: theme.palette.text.primary,
            primary: theme.palette.primary.dark,
            secondary: theme.palette.secondary.dark,
            success: theme.palette.success.dark,
            warning: theme.palette.warning.dark,
            error: theme.palette.error.dark,
          } as const;
          const borderByColor = {
            inherit: alpha("#ced8e2", 0.92),
            primary: alpha(theme.palette.primary.light, 0.34),
            secondary: alpha(theme.palette.secondary.light, 0.34),
            success: alpha(theme.palette.success.light, 0.34),
            warning: alpha(theme.palette.warning.light, 0.38),
            error: alpha(theme.palette.error.light, 0.38),
          } as const;
          const toneKey = (ownerState.color ?? "primary") as keyof typeof surfaceByColor;

          return {
            color: textByColor[toneKey],
            backgroundColor: surfaceByColor[toneKey],
            borderColor: borderByColor[toneKey],
            "&:hover": {
              backgroundColor: surfaceHoverByColor[toneKey],
              borderColor: borderByColor[toneKey],
              boxShadow: "none",
            },
          };
        },
        outlined: {
          color: "#1b2733",
          backgroundColor: alpha("#ffffff", 0.9),
          borderColor: alpha("#d4dee8", 0.92),
          "&:hover": {
            backgroundColor: alpha("#ffffff", 0.96),
            borderColor: alpha("#c5d1dd", 0.94),
            boxShadow: "none",
          },
        },
        text: {
          color: "#2b3a48",
          backgroundColor: "transparent",
          borderColor: "transparent",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: alpha("#f2f6fa", 0.92),
            borderColor: "transparent",
            boxShadow: "none",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "0.5rem",
          border: `1px solid ${alpha("#d8e1eb", 0.92)}`,
          backgroundColor: alpha("#ffffff", 0.9),
          backdropFilter: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: alpha("#fbfdff", 0.98),
            borderColor: alpha("#c7d2de", 0.96),
            boxShadow: "none",
          },
        },
        sizeSmall: {
          padding: "0.4rem",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: `1px solid ${alpha("#d8e1eb", 0.88)}`,
          backgroundColor: alpha("#ffffff", 0.9),
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
          borderRadius: 12,
          backgroundColor: alpha("#ffffff", 0.94),
          backdropFilter: "none",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#d5dfe8", 0.84),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#bcc9d6", 0.9),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#8fa4b7", 0.92),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundImage: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
        },
      },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme);
