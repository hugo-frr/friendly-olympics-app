import * as React from "react";
import { cn } from "@/lib/utils";

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "highlight" | "muted";
}

const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl p-4 shadow-card transition-all duration-200",
          {
            "bg-card": variant === "default",
            "bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30": variant === "highlight",
            "bg-muted/50": variant === "muted",
          },
          className
        )}
        {...props}
      />
    );
  }
);
AppCard.displayName = "AppCard";

const AppCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between mb-3", className)}
    {...props}
  />
));
AppCardHeader.displayName = "AppCardHeader";

const AppCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-display text-lg font-bold text-foreground", className)}
    {...props}
  />
));
AppCardTitle.displayName = "AppCardTitle";

const AppCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
AppCardContent.displayName = "AppCardContent";

export { AppCard, AppCardHeader, AppCardTitle, AppCardContent };
