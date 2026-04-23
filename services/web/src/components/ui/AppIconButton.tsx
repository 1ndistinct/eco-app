import { IconButton, IconButtonProps } from "@mui/material";

type AppIconButtonProps = IconButtonProps & {
  active?: boolean;
};

export function AppIconButton({
  active = false,
  className,
  size = "small",
  ...props
}: AppIconButtonProps) {
  const nextClassName = [className, active ? "app-icon-button-active" : null]
    .filter(Boolean)
    .join(" ");

  return <IconButton size={size} className={nextClassName} {...props} />;
}
