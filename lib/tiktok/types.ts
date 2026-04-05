export interface VideoMetadata {
  title: string;
  description?: string;
  privacyLevel?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIEND" | "PRIVATE";
  disableDuet?: boolean;
  disableComment?: boolean;
  disableStitch?: boolean;
  videoCoverTimestamp?: number;
}

export interface TikTokToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  /** When we received this token (ms epoch); not from TikTok, set locally */
  obtained_at_ms?: number;
}
