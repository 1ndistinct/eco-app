import { FormEvent } from "react";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";

type PasswordSetupViewProps = {
  email?: string;
  resetNewPassword: string;
  isSubmittingPasswordReset: boolean;
  resetError: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (value: string) => void;
  onLogout: () => void;
};

export function PasswordSetupView({
  email,
  resetNewPassword,
  isSubmittingPasswordReset,
  resetError,
  onSubmit,
  onPasswordChange,
  onLogout,
}: PasswordSetupViewProps) {
  return (
    <Stack spacing={3}>
      <Typography>{email}</Typography>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="New password"
            type="password"
            value={resetNewPassword}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="new-password"
            helperText="Use at least 12 characters."
            disabled={isSubmittingPasswordReset}
            fullWidth
          />
          <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap" }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmittingPasswordReset}
              startIcon={
                isSubmittingPasswordReset ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <DoneRoundedIcon />
                )
              }
            >
              {isSubmittingPasswordReset ? "Saving..." : "Save password"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              onClick={onLogout}
              startIcon={<LogoutRoundedIcon />}
            >
              Log out
            </Button>
          </Stack>
        </Stack>
      </Box>

      {resetError ? <Alert severity="error">{resetError}</Alert> : null}
    </Stack>
  );
}
