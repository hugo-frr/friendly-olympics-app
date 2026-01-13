import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PageContainer({ children, title, subtitle, className }: PageContainerProps) {
  return (
    <div className={cn("min-h-screen pb-24 safe-top", className)}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {title && (
          <header className="mb-6">
            <h1 className="font-display text-2xl font-bold text-gradient">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
            )}
          </header>
        )}
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
