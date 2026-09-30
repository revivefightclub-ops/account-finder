"use client";

import { useState, useEffect } from "react";

const NAME_KEY = "account_finder_profile_name";
const AVATAR_KEY = "account_finder_profile_avatar";
const DEFAULT_NAME = "Raaz";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80";

export function useProfile() {
  const [name, setName] = useState<string>(DEFAULT_NAME);
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedName = localStorage.getItem(NAME_KEY);
      const storedAvatar = localStorage.getItem(AVATAR_KEY);
      if (storedName) {
        setName(storedName);
      } else {
        localStorage.setItem(NAME_KEY, DEFAULT_NAME);
      }

      if (storedAvatar) {
        setAvatar(storedAvatar);
      } else {
        localStorage.setItem(AVATAR_KEY, DEFAULT_AVATAR);
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    }
    setIsLoaded(true);
  }, []);

  const updateProfile = (newName: string, newAvatar: string) => {
    setName(newName);
    setAvatar(newAvatar);
    try {
      localStorage.setItem(NAME_KEY, newName);
      localStorage.setItem(AVATAR_KEY, newAvatar);
    } catch (e) {
      console.error("Failed to save profile", e);
    }
  };

  return { name, avatar, isLoaded, updateProfile };
}
