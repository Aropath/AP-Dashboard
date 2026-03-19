import { useTheme } from "../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeSwitcher() {
  const { theme, mode, setTheme, toggleMode } = useTheme();

  return (
    <div className="flex items-center gap-1.5">
      {/* Colour scheme toggle */}
      <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => setTheme("teal")}
          title="Teal theme"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
            ${theme === "teal"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <span className="w-3 h-3 rounded-full bg-[oklch(0.52_0.155_195)] shrink-0" />
          Teal
        </button>
        <button
          type="button"
          onClick={() => setTheme("indigo")}
          title="Indigo theme"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
            ${theme === "indigo"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <span className="w-3 h-3 rounded-full bg-[oklch(0.511_0.22_264)] shrink-0" />
          Indigo
        </button>
      </div>

      {/* Light / dark toggle */}
      <button
        type="button"
        onClick={toggleMode}
        title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        {mode === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
    </div>
  );
}
