"use client";

import { useEffect, useCallback, useState } from "react";

interface KeyboardShortcutsOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onToggleTheater?: () => void;
  onToggleMiniPlayer?: () => void;
}

export function useKeyboardShortcuts({
  videoRef,
  onToggleTheater,
  onToggleMiniPlayer,
}: KeyboardShortcutsOptions) {
  const [showOverlay, setShowOverlay] = useState<string | null>(null);

  const flashOverlay = useCallback((text: string) => {
    setShowOverlay(text);
    setTimeout(() => setShowOverlay(null), 800);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (video.paused) {
            video.play();
            flashOverlay("▶ Play");
          } else {
            video.pause();
            flashOverlay("⏸ Pause");
          }
          break;

        case "f":
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
            flashOverlay("Exit Fullscreen");
          } else {
            const container = video.closest(".group\\/player");
            if (container) {
              container.requestFullscreen();
            } else {
              video.requestFullscreen();
            }
            flashOverlay("Fullscreen");
          }
          break;

        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          flashOverlay(video.muted ? "🔇 Muted" : "🔊 Unmuted");
          break;

        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          flashOverlay("⏪ -10s");
          break;

        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          flashOverlay("⏩ +10s");
          break;

        case "arrowleft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          flashOverlay("⏪ -5s");
          break;

        case "arrowright":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          flashOverlay("⏩ +5s");
          break;

        case "arrowup":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          flashOverlay(`🔊 ${Math.round(video.volume * 100)}%`);
          break;

        case "arrowdown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          flashOverlay(`🔉 ${Math.round(video.volume * 100)}%`);
          break;

        case "t":
          e.preventDefault();
          onToggleTheater?.();
          flashOverlay("Theater Mode");
          break;

        case "i":
          e.preventDefault();
          onToggleMiniPlayer?.();
          flashOverlay("Mini Player");
          break;

        case "0":
        case "home":
          e.preventDefault();
          video.currentTime = 0;
          flashOverlay("⏮ Start");
          break;

        case "end":
          e.preventDefault();
          video.currentTime = video.duration;
          break;

        default:
          // Number keys 1-9: seek to percentage
          if (/^[1-9]$/.test(e.key)) {
            e.preventDefault();
            const percent = parseInt(e.key) * 10;
            video.currentTime = (video.duration * percent) / 100;
            flashOverlay(`${percent}%`);
          }
          break;
      }
    },
    [videoRef, flashOverlay, onToggleTheater, onToggleMiniPlayer]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showOverlay };
}
