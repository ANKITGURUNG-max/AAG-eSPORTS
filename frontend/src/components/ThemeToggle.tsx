import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("aag_theme");
      if (stored === "dark" || stored === "light") return stored;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark");
    }
    localStorage.setItem("aag_theme", theme);
  }, [theme]);

  const toggle = () => setTheme(curr => (curr === "dark" ? "light" : "dark"));

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`neo-solid flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black select-none ${className}`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <>
          <Sun size={15} strokeWidth={3} className="text-[#FFE600]" />
          <span>LIGHT</span>
        </>
      ) : (
        <>
          <Moon size={15} strokeWidth={3} className="text-black" />
          <span>DARK</span>
        </>
      )}
    </button>
  );
}
