import * as React from "react";
import { cn } from "@/lib/utils";

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          // Variants
          {
            "gradient-primary text-primary-foreground shadow-button hover:shadow-glow": variant === "primary",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
            "bg-transparent hover:bg-muted text-foreground": variant === "ghost",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "destructive",
            "bg-success text-success-foreground hover:bg-success/90": variant === "success",
          },
          // Sizes
          {
            "h-9 px-3 text-sm rounded-lg": size === "sm",
            "h-12 px-5 text-base rounded-xl": size === "md",
            "h-14 px-6 text-lg rounded-xl": size === "lg",
            "h-10 w-10 rounded-xl": size === "icon",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);
AppButton.displayName = "AppButton";

export { AppButton };
