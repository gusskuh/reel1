/**
 * TikTok Open API: token exchange, refresh, chunked video upload.
 */
import axios from "axios";
import fs from "fs";
import type { TikTokToken, VideoMetadata } from "./types";
import { TIKTOK_BASE_URL } from "./constants";

function formBody(params: Record<string, string>): URLSearchParams {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    body.set(k, v);
  }
  return body;
}

export async function exchangeAuthorizationCode(
  code: string,
  clientKey: string,
  clientSecret: string,
  redirectUri: string
): Promise<TikTokToken> {
  const response = await axios.post(
    `${TIKTOK_BASE_URL}/v2/oauth/token/`,
    formBody({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  // v2 token API returns fields at the top level (not nested under data)
  const d = response.data?.data?.access_token
    ? response.data.data
    : response.data;
  if (!d?.access_token) {
    throw new Error(
      `Token exchange failed: ${JSON.stringify(response.data ?? {})}`
    );
  }

  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_in: d.expires_in,
    token_type: d.token_type,
    scope: d.scope,
    obtained_at_ms: Date.now(),
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  clientKey: string,
  clientSecret: string
): Promise<TikTokToken> {
  const response = await axios.post(
    `${TIKTOK_BASE_URL}/v2/oauth/token/`,
    formBody({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const d = response.data?.data?.access_token
    ? response.data.data
    : response.data;
  if (!d?.access_token) {
    throw new Error(
      `Token refresh failed: ${JSON.stringify(response.data ?? {})}`
    );
  }

  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token ?? refreshToken,
    expires_in: d.expires_in,
    token_type: d.token_type,
    scope: d.scope,
    obtained_at_ms: Date.now(),
  };
}

/** Access token if still valid; otherwise refresh when refresh_token present. */
export async function ensureValidAccessToken(
  token: TikTokToken,
  clientKey: string,
  clientSecret: string,
  skewMs = 120_000
): Promise<TikTokToken> {
  const obtained = token.obtained_at_ms ?? 0;
  const ttlSec = token.expires_in;
  if (
    ttlSec &&
    obtained &&
    Date.now() < obtained + ttlSec * 1000 - skewMs
  ) {
    return token;
  }
  if (token.refresh_token) {
    return refreshAccessToken(token.refresh_token, clientKey, clientSecret);
  }
  throw new Error("TikTok token expired; connect TikTok again.");
}

export async function fetchUserInfoBasic(accessToken: string): Promise<{
  display_name?: string;
  open_id?: string;
  avatar_url?: string;
}> {
  const res = await axios.get(`${TIKTOK_BASE_URL}/v2/user/info/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { fields: "display_name,avatar_url,open_id" },
  });
  const u = res.data?.data?.user;
  return {
    display_name: u?.display_name,
    open_id: u?.open_id,
    avatar_url: u?.avatar_url,
  };
}

/** TikTok FILE_UPLOAD chunking rules (Media Transfer Guide). */
function tiktokChunkPlan(videoSize: number): {
  chunkSize: number;
  totalChunkCount: number;
} {
  const MAX = 64 * 1024 * 1024; // 64 MB
  // Under/equal 64MB: single chunk with chunk_size === video_size
  if (videoSize <= MAX) {
    return { chunkSize: videoSize, totalChunkCount: 1 };
  }
  const totalChunkCount = Math.ceil(videoSize / MAX);
  const chunkSize = Math.floor(videoSize / totalChunkCount);
  return { chunkSize, totalChunkCount };
}

function tiktokAxiosErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const apiMsg =
      data?.error?.message ||
      data?.error?.code ||
      (typeof data === "object" ? JSON.stringify(data) : undefined);
    if (apiMsg) return `TikTok API: ${apiMsg}`;
    return `TikTok request failed (${error.response?.status ?? "no status"}): ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Upload MP4 to TikTok inbox (draft) via FILE_UPLOAD.
 * Inbox init accepts only source_info (no Direct Post post_info).
 */
export async function uploadVideoToTikTok(
  accessToken: string,
  videoPath: string,
  _metadata: VideoMetadata,
  options?: { log?: (msg: string) => void }
): Promise<{ publishId: string; shareUrl: string }> {
  const log = options?.log ?? (() => {});

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const fileBuffer = fs.readFileSync(videoPath);
  const videoSize = fileBuffer.length;
  const { chunkSize, totalChunkCount } = tiktokChunkPlan(videoSize);

  log(
    `Init inbox upload: size=${videoSize}, chunk_size=${chunkSize}, chunks=${totalChunkCount}`
  );

  let initResponse;
  try {
    initResponse = await axios.post(
      `${TIKTOK_BASE_URL}/v2/post/publish/inbox/video/init/`,
      {
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );
  } catch (error) {
    log(`TikTok init error: ${tiktokAxiosErrorMessage(error)}`);
    throw new Error(tiktokAxiosErrorMessage(error));
  }

  const publishId = initResponse.data?.data?.publish_id;
  const uploadUrl = initResponse.data?.data?.upload_url;

  if (!uploadUrl || !publishId) {
    throw new Error(
      `No upload URL from TikTok: ${JSON.stringify(initResponse.data ?? {})}`
    );
  }

  log(`Upload initialized. Publish ID: ${publishId}`);

  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const end =
      i === totalChunkCount - 1
        ? videoSize
        : Math.min(start + chunkSize, videoSize);
    const chunk = fileBuffer.subarray(start, end);

    try {
      await axios.put(uploadUrl, chunk, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes ${start}-${end - 1}/${videoSize}`,
          "Content-Length": String(end - start),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    } catch (error) {
      log(`TikTok chunk ${i + 1}/${totalChunkCount} error: ${tiktokAxiosErrorMessage(error)}`);
      throw new Error(tiktokAxiosErrorMessage(error));
    }
  }

  log("Chunks uploaded; fetching status…");

  const finalizeResponse = await axios.post(
    `${TIKTOK_BASE_URL}/v2/post/publish/status/fetch/`,
    { publish_id: publishId },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );

  const shareId = finalizeResponse.data?.data?.share_id ?? publishId;
  const shareUrl = `https://www.tiktok.com/t/${shareId}`;

  return { publishId, shareUrl };
}
