"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Link from "next/link";
import { X, Maximize2, Play } from "lucide-react";
import { getVideoSourceUrl } from "@/lib/offline-video";

interface MiniPlayerVideo {
  id: string;
  title: string;
  videoURL: string;
  thumbnailURL?: string | null;
  currentTime: number;
}

interface MiniPlayerContextType {
  miniVideo: MiniPlayerVideo | null;
  openMiniPlayer: (video: MiniPlayerVideo) => void;
  closeMiniPlayer: () => void;
  isActive: boolean;
}

const MiniPlayerContext = createContext<MiniPlayerContextType>({
  miniVideo: null,
  openMiniPlayer: () => {},
  closeMiniPlayer: () => {},
  isActive: false,
});

export function useMiniPlayer() {
  return useContext(MiniPlayerContext);
}

export function MiniPlayerProvider({ children }: { children: React.ReactNode }) {
  const [miniVideo, setMiniVideo] = useState<MiniPlayerVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const miniVideoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  const openMiniPlayer = useCallback((video: MiniPlayerVideo) => {
    setMiniVideo(video);
    setIsPlaying(true);
    setPosition({ x: 24, y: 24 });
  }, []);

  const closeMiniPlayer = useCallback(() => {
    setMiniVideo(null);
  }, []);

  // Set currentTime when mini player opens
  useEffect(() => {
    if (miniVideo && miniVideoRef.current) {
      miniVideoRef.current.currentTime = miniVideo.currentTime;
      miniVideoRef.current.play().catch(() => {});
    }
  }, [miniVideo]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
      };
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.startPosX - dx,
        y: dragRef.current.startPosY - dy,
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <MiniPlayerContext.Provider
      value={{ miniVideo, openMiniPlayer, closeMiniPlayer, isActive: !!miniVideo }}
    >
      {children}

      {/* Floating Mini Player */}
      {miniVideo && (
        <div
          className="fixed z-50 shadow-2xl rounded-xl overflow-hidden bg-black border border-border/50 transition-shadow hover:shadow-3xl"
          style={{
            right: position.x,
            bottom: position.y,
            width: 360,
          }}
        >
          {/* Drag handle */}
          <div
            className="absolute top-0 left-0 right-0 h-8 cursor-move z-10 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-2"
            onMouseDown={handleMouseDown}
          >
            <span className="text-white text-[10px] font-medium truncate max-w-[200px]">
              {miniVideo.title}
            </span>
            <div className="flex items-center gap-1">
              <Link
                href={`/feed/${miniVideo.id}`}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                onClick={closeMiniPlayer}
              >
                <Maximize2 className="h-3.5 w-3.5 text-white" />
              </Link>
              <button
                className="p-1 rounded hover:bg-white/20 transition-colors"
                onClick={closeMiniPlayer}
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>

          <video
            ref={miniVideoRef}
            src={getVideoSourceUrl(miniVideo.id, miniVideo.videoURL)}
            className="w-full aspect-video object-contain bg-black"
            poster={miniVideo.thumbnailURL || undefined}
            onClick={() => {
              const v = miniVideoRef.current;
              if (!v) return;
              if (v.paused) {
                v.play();
                setIsPlaying(true);
              } else {
                v.pause();
                setIsPlaying(false);
              }
            }}
          />

          {/* Play/Pause overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-full p-3">
                <Play className="h-6 w-6 text-white fill-white" />
              </div>
            </div>
          )}
        </div>
      )}
    </MiniPlayerContext.Provider>
  );
}
