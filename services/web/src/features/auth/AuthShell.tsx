import { ReactNode } from "react";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import { alpha } from "@mui/material/styles";
import { Box, Chip, Container, Paper, Stack, Typography } from "@mui/material";

type AuthShellProps = {
  title: string;
  subtitle: string;
  content: ReactNode;
  helper?: ReactNode;
};

export function AuthShell({ title, subtitle, content, helper }: AuthShellProps) {
  return (
    <Box component="main" className="app-shell" sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Paper
            elevation={0}
            className="hero-panel"
            sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: "20px", md: "24px" } }}
          >
            <Stack spacing={2}>
              <Chip
                icon={<VpnKeyRoundedIcon />}
                label="Workspace access"
                sx={{
                  alignSelf: "flex-start",
                  bgcolor: alpha("#16423c", 0.08),
                  color: "text.primary",
                }}
              />
              <Typography variant="h3">{title}</Typography>
              <Typography color="text.secondary">{subtitle}</Typography>
              {helper}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            className="soft-panel auth-panel"
            sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
          >
            {content}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
