import * as React from "react";
import { cn } from "@/lib/utils";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: "default" | "primary" | "secondary" | "success" | "destructive";
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, variant = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          "active:scale-95",
          {
            // Default variant
            "bg-muted text-muted-foreground hover:bg-muted/80": variant === "default" && !active,
            "gradient-primary text-primary-foreground shadow-button": (variant === "default" || variant === "primary") && active,
            
            // Primary variant
            "bg-primary/20 text-primary hover:bg-primary/30": variant === "primary" && !active,
            
            // Secondary variant
            "bg-secondary/20 text-secondary hover:bg-secondary/30": variant === "secondary" && !active,
            "gradient-secondary text-secondary-foreground": variant === "secondary" && active,
            
            // Success variant
            "bg-success/20 text-success hover:bg-success/30": variant === "success" && !active,
            "bg-success text-success-foreground": variant === "success" && active,
            
            // Destructive variant
            "bg-destructive/20 text-destructive hover:bg-destructive/30": variant === "destructive" && !active,
            "bg-destructive text-destructive-foreground": variant === "destructive" && active,
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Chip.displayName = "Chip";

export { Chip };
