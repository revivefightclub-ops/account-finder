"use client";

import { useState, useEffect } from "react";

const SIDEBAR_STATE_KEY = "account_ready_sidebar_expanded";

export function useSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (stored !== null) {
        setIsExpanded(stored === "true");
      }
    } catch (e) {
      console.error("Failed to load sidebar state", e);
    }
    setIsLoaded(true);
  }, []);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(newState));
    } catch (e) {
      console.error("Failed to save sidebar state", e);
    }
  };

  const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);
  const closeMobileSidebar = () => setIsMobileOpen(false);

  return {
    isExpanded,
    toggleSidebar,
    isMobileOpen,
    toggleMobileSidebar,
    closeMobileSidebar,
    isLoaded,
  };
}
