import { Button, ButtonProps } from "@mui/material";

type AppButtonProps = ButtonProps & {
  active?: boolean;
};

export function AppButton({ active = false, className, size = "small", ...props }: AppButtonProps) {
  const nextClassName = [className, active ? "app-button-active" : null]
    .filter(Boolean)
    .join(" ");

  return <Button size={size} className={nextClassName} {...props} />;
}
