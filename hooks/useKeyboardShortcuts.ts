"use client";
import { useEffect } from "react";

export function useKeyboardShortcuts({
  onNew,
  onSearch,
  onExport,
}: {
  onNew?: () => void;
  onSearch?: () => void;
  onExport?: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        onNew?.();
      } else if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        onSearch?.();
      } else if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        onExport?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNew, onSearch, onExport]);
}
