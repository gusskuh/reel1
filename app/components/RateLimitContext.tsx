"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type RateInfo = {
  used: number;
  remaining: number;
  limit: number;
  resetAt: number | null;
  kind: "guest" | "user";
};

type RateLimitContextValue = {
  rateLimit: RateInfo | null;
  setRateLimit: (info: RateInfo) => void;
  refresh: () => Promise<void>;
};

const RateLimitContext = createContext<RateLimitContextValue | null>(null);

async function readJsonBody<T>(r: Response): Promise<T | null> {
  const text = await r.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const [rateLimit, setRateLimit] = useState<RateInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/rate-limit");
      if (!r.ok) return;
      const data = await readJsonBody<RateInfo>(r);
      if (!data) return;
      setRateLimit({
        used: data.used,
        remaining: data.remaining,
        limit: data.limit,
        resetAt: data.resetAt,
        kind: data.kind === "user" ? "user" : "guest",
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <RateLimitContext.Provider value={{ rateLimit, setRateLimit, refresh }}>
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit(): RateLimitContextValue {
  const ctx = useContext(RateLimitContext);
  if (!ctx) throw new Error("useRateLimit must be used within RateLimitProvider");
  return ctx;
}
