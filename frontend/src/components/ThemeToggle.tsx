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

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full border-[3px] border-black p-0.5 transition-all duration-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none ${
        isDark
          ? "bg-[#101114] shadow-[3px_3px_0px_#C6F36B]"
          : "bg-[#FFE600] shadow-[3px_3px_0px_#000000]"
      } ${className}`}
      title={isDark ? "Dark theme active (click to switch to light)" : "Light theme active (click to switch to dark)"}
    >
      {/* Background track icons */}
      <span className="pointer-events-none absolute left-1.5 flex items-center justify-center text-black/60">
        <Sun size={12} strokeWidth={3} />
      </span>
      <span className="pointer-events-none absolute right-1.5 flex items-center justify-center text-white/50">
        <Moon size={12} strokeWidth={3} />
      </span>

      {/* Sliding Knob */}
      <span
        className={`pointer-events-none grid h-5 w-5 place-items-center rounded-full border-2 border-black transition-transform duration-200 ease-out ${
          isDark
            ? "translate-x-8 bg-[#C6F36B] text-black shadow-[-1px_1px_0px_#000000]"
            : "translate-x-0.5 bg-white text-black shadow-[1px_1px_0px_#000000]"
        }`}
      >
        {isDark ? (
          <Moon size={11} strokeWidth={3} className="text-black" />
        ) : (
          <Sun size={11} strokeWidth={3} className="text-[#FF9F1A]" />
        )}
      </span>
    </button>
  );
}
