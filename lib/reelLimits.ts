/** Hard cap for reel length (script, voice, and final video). */
export const MAX_REEL_DURATION_SEC = 30;

/** Scenes are up to 5s each; 6 × 5s = 30s max. */
export const MAX_REEL_SCENES = Math.ceil(MAX_REEL_DURATION_SEC / 5);
