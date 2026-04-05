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

  const d = response.data?.data;
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

  const d = response.data?.data;
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

/**
 * Upload MP4 via FILE_UPLOAD (chunked PUT to upload_url).
 */
export async function uploadVideoToTikTok(
  accessToken: string,
  videoPath: string,
  metadata: VideoMetadata,
  options?: { log?: (msg: string) => void }
): Promise<{ publishId: string; shareUrl: string }> {
  const log = options?.log ?? (() => {});

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const initResponse = await axios
    .post(
      `${TIKTOK_BASE_URL}/v2/post/publish/inbox/video/init/`,
      {
        post_info: {
          title: metadata.title,
          description: metadata.description || metadata.title,
          privacy_level: metadata.privacyLevel || "PUBLIC_TO_EVERYONE",
          disable_duet: metadata.disableDuet ?? false,
          disable_comment: metadata.disableComment ?? false,
          disable_stitch: metadata.disableStitch ?? false,
          video_cover_timestamp_ms: metadata.videoCoverTimestamp ?? 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )
    .catch((error) => {
      log(`TikTok init error: ${JSON.stringify(error.response?.data ?? error.message)}`);
      throw error;
    });

  const publishId = initResponse.data.data.publish_id;
  const uploadUrl = initResponse.data.data.upload_url;

  if (!uploadUrl) {
    throw new Error("No upload URL received from TikTok");
  }

  log(`Upload initialized. Publish ID: ${publishId}`);

  const chunkSize = 5 * 1024 * 1024;
  const fileBuffer = fs.readFileSync(videoPath);
  const totalSize = fileBuffer.length;

  for (let start = 0; start < totalSize; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalSize);
    const chunk = fileBuffer.slice(start, end);

    await axios.put(uploadUrl, chunk, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes ${start}-${end - 1}/${totalSize}`,
        "Content-Length": (end - start).toString(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  log("Chunks uploaded; finalizing…");

  const finalizeResponse = await axios.post(
    `${TIKTOK_BASE_URL}/v2/post/publish/status/fetch/`,
    { publish_id: publishId },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const shareId = finalizeResponse.data.data?.share_id ?? publishId;
  const shareUrl = `https://www.tiktok.com/t/${shareId}`;

  return { publishId, shareUrl };
}
