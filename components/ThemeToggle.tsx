"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className="flex items-center justify-center h-8 w-8 bg-surface-variant text-on-surface hover:bg-primary hover:text-on-primary transition-colors border border-on-surface rounded-md"
      title="Toggle Theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" strokeWidth={2.5} />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" strokeWidth={2.5} />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
