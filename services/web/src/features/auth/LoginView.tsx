import { FormEvent } from "react";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";

type LoginViewProps = {
  googleLoginEnabled: boolean;
  googleLoginURL: string;
  loginEmail: string;
  loginPassword: string;
  isSubmittingLogin: boolean;
  loginError: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export function LoginView({
  googleLoginEnabled,
  googleLoginURL,
  loginEmail,
  loginPassword,
  isSubmittingLogin,
  loginError,
  onSubmit,
  onEmailChange,
  onPasswordChange,
}: LoginViewProps) {
  return (
    <Stack spacing={3}>
      {googleLoginEnabled && googleLoginURL ? (
        <Stack spacing={1.5}>
          <Button
            component="a"
            href={googleLoginURL}
            variant="outlined"
            color="inherit"
            sx={{ alignSelf: "flex-start" }}
          >
            Continue with Google
          </Button>
          <Typography color="text.secondary" variant="body2">
            Google login works only when the verified Google account exactly matches an
            existing user in this app.
          </Typography>
        </Stack>
      ) : null}

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={loginEmail}
            onChange={(event) => onEmailChange(event.target.value)}
            autoComplete="email"
            disabled={isSubmittingLogin}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={loginPassword}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
            disabled={isSubmittingLogin}
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmittingLogin}
            startIcon={
              isSubmittingLogin ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <VpnKeyRoundedIcon />
              )
            }
            sx={{ alignSelf: "flex-start" }}
          >
            {isSubmittingLogin ? "Logging in..." : "Log in"}
          </Button>
        </Stack>
      </Box>

      {loginError ? <Alert severity="error">{loginError}</Alert> : null}
    </Stack>
  );
}
