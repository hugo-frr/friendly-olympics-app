import { NavLink, useLocation } from "react-router-dom";
import { Trophy, PenLine, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", label: "Olympiades", icon: Trophy },
  { path: "/enter", label: "Scores", icon: PenLine },
  { path: "/leaderboard", label: "Classement", icon: Medal },
];

export function TabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 px-4 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                "min-w-[72px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "relative p-1.5 rounded-lg transition-all duration-200",
                  isActive && "gradient-primary shadow-button"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "text-primary-foreground scale-110"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "text-primary font-semibold"
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
