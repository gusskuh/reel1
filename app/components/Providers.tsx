"use client";

import type { ReactNode } from "react";
import { RateLimitProvider } from "./RateLimitContext";

export default function Providers({ children }: { children: ReactNode }) {
  return <RateLimitProvider>{children}</RateLimitProvider>;
}
