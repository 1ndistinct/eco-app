import { Popover, PopoverProps } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";

type PopoverSurfaceProps = Omit<PopoverProps, "slotProps"> & {
  paperSx?: SxProps<Theme>;
};

export function PopoverSurface({
  paperSx,
  anchorOrigin = { vertical: "bottom", horizontal: "right" },
  transformOrigin = { vertical: "top", horizontal: "right" },
  ...props
}: PopoverSurfaceProps) {
  return (
    <Popover
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      slotProps={{
        paper: {
          className: "app-popover-surface",
          sx: [
            {
              mt: 1,
              width: { xs: "calc(100vw - 2rem)", sm: 380 },
              maxWidth: "calc(100vw - 2rem)",
              p: 2,
              borderRadius: "var(--surface-radius-lg)",
            },
            paperSx,
          ],
        },
      }}
      {...props}
    />
  );
}
