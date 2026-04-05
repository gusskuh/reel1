"use client";

import { useEffect, useState } from "react";

const FUNNY_LINES = [
  "Go grab a coffee — we've got this.",
  "Teaching the narrator to narrate… loudly.",
  "Stitching scenes together like a tiny movie factory.",
  "Convincing pixels to behave. Almost there.",
  "Downloading the internet… one stock clip at a time.",
  "Whisper is transcribing faster than we can type.",
  "FFmpeg is doing the heavy lifting. Show some respect.",
  "Still faster than a AAA game patch.",
  "Adding captions so you look dangerously professional.",
  "Our AI is in flow state. Do not disturb.",
  "Bribing the algorithm with extra keyframes.",
  "Aligning Mercury, Jupiter, and aspect ratios.",
  "This usually takes 2–5 minutes — worth it.",
  "Somewhere, a GPU just sneezed.",
];

const LINE_INTERVAL_MS = 4500;

export default function GeneratingStatus({ active }: { active: boolean }) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    setLineIndex(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % FUNNY_LINES.length);
    }, LINE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="reel-loading-panel" role="status" aria-live="polite">
      <div className="reel-shimmer-track" aria-hidden>
        <div className="reel-shimmer-fill" />
      </div>

      <p className="reel-loading-sub">Creating your reel — typically 2–5 minutes</p>

      <p key={lineIndex} className="reel-funny-line">
        {FUNNY_LINES[lineIndex]}
      </p>
    </div>
  );
}
