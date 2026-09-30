"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Account, AccountWithStatus } from "@/types";
import { DEMO_ACCOUNTS } from "@/constants/demoData";
import { getStatusAndCountdown, calculateReadyAt, formatDurationObj } from "@/utils/date";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "account_ready_checker_data";

function mapRowToAccount(row: any): Account {
  let dailyLimitVal: any = row.daily_limit;
  if (dailyLimitVal !== "No Limit" && dailyLimitVal !== "100%") {
    const num = parseInt(dailyLimitVal, 10);
    if (!isNaN(num)) dailyLimitVal = num;
  }

  return {
    id: row.id,
    email: row.email,
    isPremium: Boolean(row.is_premium),
    weeklyLimit: typeof row.weekly_limit === "number" ? row.weekly_limit : 0,
    dailyLimit: dailyLimitVal ?? "No Limit",
    limitResetType: row.limit_reset_type || "Daily",
    checkingDate: row.checking_date,
    checkingTime: row.checking_time,
    resetDuration: row.reset_duration,
    modifiedAt: Number(row.modified_at) || Date.now(),
  };
}

function mapAccountToRow(acc: Account, userId?: string | null) {
  return {
    id: acc.id,
    email: acc.email,
    is_premium: acc.isPremium,
    weekly_limit: acc.weeklyLimit,
    daily_limit: String(acc.dailyLimit),
    limit_reset_type: acc.limitResetType,
    checking_date: acc.checkingDate,
    checking_time: acc.checkingTime,
    reset_duration: acc.resetDuration,
    modified_at: acc.modifiedAt || Date.now(),
    user_id: userId || null,
  };
}

export function useAccounts(userId?: string | null) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const prevReadyMap = useRef<Map<string, boolean>>(new Map());

  // Load from Supabase DB (filtered by userId if logged in) with Local Storage fallback
  useEffect(() => {
    async function loadAccounts() {
      try {
        let query = supabase.from("accounts").select("*");
        if (userId) {
          query = query.eq("user_id", userId);
        }

        const { data: dbRows, error } = await query;
        if (!error && dbRows) {
          const mappedDbAccounts = dbRows.map(mapRowToAccount);
          setAccounts(mappedDbAccounts);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedDbAccounts));
          setIsLoaded(true);
          return;
        }
      } catch (err) {
        console.warn("Supabase fetch error, falling back to local storage:", err);
      }

      // Local storage fallback
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          let parsedData = JSON.parse(stored);
          setAccounts(parsedData);
        } else {
          setAccounts(DEMO_ACCOUNTS);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_ACCOUNTS));
        }
      } catch (e) {
        console.error("Failed to load accounts from local storage", e);
        setAccounts(DEMO_ACCOUNTS);
      }
      setIsLoaded(true);
    }

    loadAccounts();
  }, [userId]);

  // Real-time Supabase Database Listener
  useEffect(() => {
    const channel = supabase
      .channel("accounts-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAcc = mapRowToAccount(payload.new);
            // Check if account belongs to this user or if public
            if (!userId || payload.new.user_id === userId) {
              setAccounts((prev) => {
                if (prev.some((a) => a.id === newAcc.id)) return prev;
                return [...prev, newAcc];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = mapRowToAccount(payload.new);
            if (!userId || payload.new.user_id === userId) {
              setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setAccounts((prev) => prev.filter((a) => a.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Request Notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Save to local storage whenever accounts change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    }
  }, [accounts, isLoaded]);

  // Re-render tick every 1 second (1000ms) for real-time live countdowns
  const [, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute status on the fly with notifications and automatic 100% daily limit reset
  const accountsWithStatus: AccountWithStatus[] = useMemo(() => {
    return accounts.map((acc) => {
      const readyAt = calculateReadyAt(acc.checkingDate, acc.checkingTime, acc.resetDuration);
      const { status, countdown, progressPercent } = getStatusAndCountdown(readyAt, acc.checkingDate, acc.checkingTime);
      
      const isNowReady = status === "Ready";
      const wasReady = prevReadyMap.current.get(acc.id);

      // Trigger Web Push Notification if status transitioned from Waiting -> Ready
      if (wasReady === false && isNowReady) {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Account Now Ready! 🟢", {
            body: `Account ${acc.email} is now ready to use! Daily limit reset to 100%.`,
            icon: "/favicon.ico"
          });
        }
      }

      prevReadyMap.current.set(acc.id, isNowReady);

      // Automatically set Daily Limit to "100%" when reset time is over (status === "Ready") for Daily limit accounts
      const resetType = acc.limitResetType || "Daily";
      const computedDailyLimit = (resetType === "Daily" && isNowReady) ? "100%" : acc.dailyLimit;

      return {
        ...acc,
        dailyLimit: computedDailyLimit,
        readyAtDate: readyAt,
        readyStatus: status,
        progressPercent,
        timeRemaining: countdown || undefined,
      };
    });
  }, [accounts]);

  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let dupes = 0;
    for (const acc of accounts) {
      const email = acc.email.trim().toLowerCase();
      if (seen.has(email)) {
        dupes++;
      } else {
        seen.add(email);
      }
    }
    return dupes;
  }, [accounts]);

  const addAccount = useCallback((account: Account) => {
    const newAcc = { ...account, modifiedAt: Date.now() };
    setAccounts((prev) => [...prev, newAcc]);
    
    // Sync to Supabase
    supabase.from("accounts").insert(mapAccountToRow(newAcc, userId)).then(({ error }) => {
      if (error) console.error("Supabase insert error:", error);
    });
  }, [userId]);

  const updateAccount = useCallback((id: string, updatedFields: Partial<Account>) => {
    let updatedAcc: Account | undefined;
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          updatedAcc = { ...acc, ...updatedFields, modifiedAt: Date.now() };
          return updatedAcc;
        }
        return acc;
      })
    );

    if (updatedAcc) {
      supabase.from("accounts").update(mapAccountToRow(updatedAcc, userId)).eq("id", id).then(({ error }) => {
        if (error) console.error("Supabase update error:", error);
      });
    }
  }, [userId]);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    
    supabase.from("accounts").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("Supabase delete error:", error);
    });
  }, []);

  // Batch Operations
  const batchDelete = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setAccounts((prev) => prev.filter((acc) => !idSet.has(acc.id)));

    supabase.from("accounts").delete().in("id", ids).then(({ error }) => {
      if (error) console.error("Supabase batchDelete error:", error);
    });
  }, []);

  const batchUpdateTier = useCallback((ids: string[], isPremium: boolean) => {
    const idSet = new Set(ids);
    setAccounts((prev) =>
      prev.map((acc) => (idSet.has(acc.id) ? { ...acc, isPremium, modifiedAt: Date.now() } : acc))
    );

    supabase.from("accounts").update({ is_premium: isPremium, modified_at: Date.now() }).in("id", ids).then(({ error }) => {
      if (error) console.error("Supabase batchUpdateTier error:", error);
    });
  }, []);

  const batchUpdateResetType = useCallback((ids: string[], limitResetType: "Daily" | "Weekly") => {
    const idSet = new Set(ids);
    setAccounts((prev) =>
      prev.map((acc) => (idSet.has(acc.id) ? { ...acc, limitResetType, modifiedAt: Date.now() } : acc))
    );

    supabase.from("accounts").update({ limit_reset_type: limitResetType, modified_at: Date.now() }).in("id", ids).then(({ error }) => {
      if (error) console.error("Supabase batchUpdateResetType error:", error);
    });
  }, []);

  const duplicateAccount = useCallback((id: string) => {
    setAccounts((prev) => {
      const idx = prev.findIndex((acc) => acc.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const duplicated: Account = {
        ...original,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        modifiedAt: Date.now()
      };
      const newAccounts = [...prev];
      newAccounts.splice(idx + 1, 0, duplicated);

      supabase.from("accounts").insert(mapAccountToRow(duplicated, userId)).then(({ error }) => {
        if (error) console.error("Supabase duplicate insert error:", error);
      });

      return newAccounts;
    });
  }, [userId]);

  const removeDuplicates = useCallback((): number => {
    let removed = 0;
    const removedIds: string[] = [];

    setAccounts((prev) => {
      const seenEmails = new Set<string>();
      const uniqueAccounts: Account[] = [];

      for (const acc of prev) {
        const normalizedEmail = acc.email.trim().toLowerCase();
        if (!seenEmails.has(normalizedEmail)) {
          seenEmails.add(normalizedEmail);
          uniqueAccounts.push(acc);
        } else {
          removed++;
          removedIds.push(acc.id);
        }
      }
      return uniqueAccounts;
    });

    if (removedIds.length > 0) {
      supabase.from("accounts").delete().in("id", removedIds).then(({ error }) => {
        if (error) console.error("Supabase removeDuplicates delete error:", error);
      });
    }

    return removed;
  }, []);

  const setAllAccounts = useCallback((newAccounts: Account[]) => {
    const mapped = newAccounts.map(a => ({ ...a, modifiedAt: a.modifiedAt || Date.now() }));
    setAccounts(mapped);

    const rows = mapped.map(a => mapAccountToRow(a, userId));
    supabase.from("accounts").upsert(rows).then(({ error }) => {
      if (error) console.error("Supabase setAllAccounts upsert error:", error);
    });
  }, [userId]);

  return {
    accounts: accountsWithStatus,
    rawAccounts: accounts,
    isLoaded,
    duplicateCount,
    addAccount,
    updateAccount,
    deleteAccount,
    duplicateAccount,
    batchDelete,
    batchUpdateTier,
    batchUpdateResetType,
    removeDuplicates,
    setAllAccounts,
  };
}
