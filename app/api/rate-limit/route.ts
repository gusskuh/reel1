import { NextResponse } from "next/server";
import { getRateLimitStatus } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const status = getRateLimitStatus(ip);
  return NextResponse.json(status);
}
