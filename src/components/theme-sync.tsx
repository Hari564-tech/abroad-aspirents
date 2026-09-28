import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

function applyTheme(theme: "light" | "dark" | "system") {
  const dark =
    theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeSync() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
  return null;
}

export function StoreHydration() {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
    const t = window.setTimeout(() => {
      if (!useAppStore.getState().hydrated) useAppStore.getState().setHydrated(true);
    }, 800);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
