"use client";

import type { ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";
import { RateLimitProvider } from "./RateLimitContext";

function PostHogInit({ children }: { children: ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PostHogInit>
      <RateLimitProvider>{children}</RateLimitProvider>
    </PostHogInit>
  );
}
