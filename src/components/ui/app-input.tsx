import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-xl bg-input px-4 py-3 text-base text-foreground",
            "placeholder:text-muted-foreground",
            "border border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
            "transition-all duration-200 outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
AppInput.displayName = "AppInput";

export { AppInput };
