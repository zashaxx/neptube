"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Radio, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  MessageSquare, Users, Heart, Eye,
  Maximize, Minimize, Camera, CameraOff, Disc,
  Send, X, Play, Download, Trash2, Upload, Clock,
  CheckCircle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────
type StreamState = "idle" | "preview" | "live" | "ended";

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  color: string;
};

const CHAT_COLORS = [
  "text-rose-400", "text-sky-400", "text-emerald-400",
  "text-amber-400", "text-violet-400", "text-pink-400",
  "text-cyan-400", "text-lime-400",
];

// ─── Helpers ──────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getRandomColor() {
  return CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)];
}

// ─── Main Component ──────────────────────────────────────────────────
export default function LivePage() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Stream state
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [streamTitle, setStreamTitle] = useState("");
  const [streamDescription, setStreamDescription] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);

  // Media controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [facingMode] = useState<"user" | "environment">("user");

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Recording state
  const [recordedVideoURL, setRecordedVideoURL] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [finalDuration, setFinalDuration] = useState(0);
  const [finalViewerCount, setFinalViewerCount] = useState(0);
  const [finalLikeCount, setFinalLikeCount] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Camera Access ──────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: isMicOn,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      return true;
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const error = err as DOMException;
      if (error.name === "NotAllowedError") {
        toast.error("Camera access denied. Please allow camera permissions in your browser settings.");
      } else if (error.name === "NotFoundError") {
        toast.error("No camera found. Please connect a camera and try again.");
      } else {
        toast.error("Failed to access camera: " + error.message);
      }
      return false;
    }
  }, [facingMode, isMicOn]);

  // ─── Stop Camera ───────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // ─── Screen Share ──────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (isScreenShare) {
      // Switch back to camera
      setIsScreenShare(false);
      await startCamera();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = screenStream;

      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
        videoRef.current.play().catch(() => {});
      }

      // Listen for user ending screen share via browser UI
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        setIsScreenShare(false);
        startCamera();
      });

      setIsScreenShare(true);
    } catch {
      toast.error("Screen sharing was cancelled or denied.");
    }
  }, [isScreenShare, startCamera]);

  // ─── Go Live / Preview ─────────────────────────────────────────────
  const startPreview = useCallback(async () => {
    const ok = await startCamera();
    if (ok) {
      setStreamState("preview");
      toast.success("Camera preview ready! Configure your stream and go live.");
    }
  }, [startCamera]);

  const goLive = useCallback(() => {
    if (!streamTitle.trim()) {
      toast.error("Please enter a stream title before going live.");
      return;
    }

    // Start recording
    if (streamRef.current) {
      chunksRef.current = [];
      try {
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";

        const recorder = new MediaRecorder(streamRef.current, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start(1000); // Collect data every second
        recorderRef.current = recorder;
      } catch (err) {
        console.warn("MediaRecorder not supported, stream won't be recorded:", err);
      }
    }

    setStreamState("live");
    setElapsedTime(0);
    setViewerCount(1);
    setLikeCount(0);
    setChatMessages([
      {
        id: "system-1",
        user: "NepTube",
        text: "Welcome to the live stream! 🎉",
        timestamp: new Date(),
        color: "text-rose-400",
      },
    ]);
    toast.success("You are now LIVE! 🔴");
  }, [streamTitle]);

  const endStream = useCallback(() => {
    // Save stats before clearing
    setFinalDuration(elapsedTime);
    setFinalViewerCount(viewerCount);
    setFinalLikeCount(likeCount);

    // Stop recording and create video blob
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedVideoURL(url);
        chunksRef.current = [];
      };
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    // Stop camera & timer
    stopCamera();
    if (timerRef.current) clearInterval(timerRef.current);

    // Transition to ended review state
    setStreamState("ended");
    toast("Stream ended. Review your recording below.");
  }, [stopCamera, elapsedTime, viewerCount, likeCount]);

  // ─── Cleanup Helper ──────────────────────────────────────────────────
  const cleanupAndReset = useCallback(() => {
    if (recordedVideoURL) URL.revokeObjectURL(recordedVideoURL);
    setRecordedVideoURL(null);
    setRecordedBlob(null);
    setStreamState("idle");
    setStreamTitle("");
    setStreamDescription("");
    setElapsedTime(0);
    setViewerCount(0);
    setLikeCount(0);
    setChatMessages([]);
    setIsPublishing(false);
  }, [recordedVideoURL]);

  // ─── Publish Recording ──────────────────────────────────────────────
  const publishRecording = useCallback(async () => {
    if (!recordedBlob) {
      toast.error("No recording available to publish.");
      return;
    }

    setIsPublishing(true);

    try {
      // Download the recording file
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${streamTitle.replace(/[^a-zA-Z0-9]/g, "_") || "livestream"}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Recording saved! Redirecting to your channel...");

      // Clean up & redirect to channel
      setTimeout(() => {
        cleanupAndReset();
        router.push(`/channel/${userId}`);
      }, 1500);
    } catch {
      toast.error("Failed to save recording.");
      setIsPublishing(false);
    }
  }, [recordedBlob, streamTitle, userId, router, cleanupAndReset]);

  // ─── Discard Recording ──────────────────────────────────────────────
  const discardRecording = useCallback(() => {
    cleanupAndReset();
    toast("Recording discarded. Redirecting to your channel...");
    setTimeout(() => {
      router.push(`/channel/${userId}`);
    }, 1000);
  }, [userId, router, cleanupAndReset]);

  // ─── Timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (streamState === "live") {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
        // Simulate viewers fluctuating
        setViewerCount((prev) => Math.max(1, prev + Math.floor(Math.random() * 5) - 2));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [streamState]);

  // ─── Toggle Mic ────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = !t.enabled));
    }
    setIsMicOn((prev) => !prev);
  }, []);

  // ─── Toggle Camera ─────────────────────────────────────────────────
  const toggleCam = useCallback(async () => {
    if (isCamOn) {
      // Turn off camera
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
      }
      setIsCamOn(false);
    } else {
      // Turn on camera
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((t) => (t.enabled = true));
      }
      setIsCamOn(true);
    }
  }, [isCamOn]);

  // ─── Fullscreen ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ─── Chat auto-scroll ──────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ─── Send Chat Message ─────────────────────────────────────────────
  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return;

    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      user: user?.firstName || user?.username || "You",
      text: chatInput.trim(),
      timestamp: new Date(),
      color: "text-sky-400",
    };

    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");

    // Simulate a reply after a short delay
    setTimeout(() => {
      const replies = [
        "Great stream! 🔥", "Love this content!", "Hello from Nepal! 🇳🇵",
        "Amazing quality!", "Keep it up! 💪", "First time here, loving it!",
        "Can you say hi to me?", "This is so cool!", "NepTube > everything 😎",
        "How's the quality?", "Subscribed! 🎉", "When's the next stream?",
      ];
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        user: ["StreamFan42", "NepViewer", "TechLover", "GamingPro", "MusicHead"][Math.floor(Math.random() * 5)],
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date(),
        color: getRandomColor(),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 2000 + Math.random() * 3000);
  }, [chatInput, user]);

  // ─── Re-attach stream to video element after render ───────────────
  useEffect(() => {
    if (videoRef.current && streamRef.current && (streamState === "preview" || streamState === "live")) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [streamState]);

  // ─── Set recorded video on review player ──────────────────────────
  useEffect(() => {
    if (streamState === "ended" && reviewVideoRef.current && recordedVideoURL) {
      reviewVideoRef.current.src = recordedVideoURL;
    }
  }, [streamState, recordedVideoURL]);

  // ─── Cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopCamera]);

  // ─── Auth Gate ─────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mb-6 shadow-2xl shadow-rose-500/30">
          <Radio className="h-12 w-12 text-white animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Go Live on NepTube</h2>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          Sign in to start streaming live to your audience. Share your moments in real-time!
        </p>
        <Button
          className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl px-8 h-11 font-semibold"
          onClick={() => toast.error("Please sign in to go live.")}
        >
          Sign In to Go Live
        </Button>
      </div>
    );
  }

  // ─── Ended State (Review Screen) ───────────────────────────────────
  if (streamState === "ended") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Stream Ended</h1>
              <p className="text-sm text-muted-foreground">Review your recording and choose what to do with it</p>
            </div>
          </div>

          {/* Stream Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <span className="text-lg font-bold">{formatDuration(finalDuration)}</span>
              <p className="text-xs text-muted-foreground mt-1">Duration</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <span className="text-lg font-bold">{finalViewerCount}</span>
              <p className="text-xs text-muted-foreground mt-1">Peak Viewers</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <Heart className="h-5 w-5 mx-auto mb-2 text-rose-400" />
              <span className="text-lg font-bold">{finalLikeCount}</span>
              <p className="text-xs text-muted-foreground mt-1">Likes</p>
            </div>
          </div>

          {/* Video Preview */}
          {recordedVideoURL ? (
            <div className="rounded-2xl overflow-hidden border border-border bg-black mb-6">
              <div className="relative aspect-video">
                <video
                  ref={reviewVideoRef}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-emerald-600 text-white border-0 font-bold px-2.5 py-1 rounded-lg text-xs">
                    <Play className="h-3 w-3 mr-1" />
                    RECORDED
                  </Badge>
                </div>
              </div>

              {/* Stream Info */}
              <div className="p-4 bg-background/80 border-t border-border">
                <h3 className="font-bold text-base mb-1">{streamTitle}</h3>
                {streamDescription && (
                  <p className="text-sm text-muted-foreground">{streamDescription}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/20 aspect-video flex flex-col items-center justify-center mb-6">
              <VideoOff className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No recording available</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Recording may not be supported in your browser</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {recordedVideoURL && (
              <Button
                onClick={publishRecording}
                disabled={isPublishing}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:scale-[1.01]"
              >
                {isPublishing ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-bounce" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Save & Publish Recording
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={discardRecording}
              variant="outline"
              disabled={isPublishing}
              className="flex-1 h-12 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-bold text-sm transition-all"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard & Go to Channel
            </Button>
          </div>

          {/* Go to channel link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => { cleanupAndReset(); router.push(`/channel/${userId}`); }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Go to your channel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Idle State  ───────────────────────────────────────────────────
  if (streamState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-rose-500/30 animate-pulse">
            <Radio className="h-14 w-14 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg animate-bounce">
            <Disc className="h-4 w-4 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold mb-3 bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
          Go Live
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mb-8">
          Start streaming live from your camera. Share your moments, interact with viewers
          in real-time, and build your community on NepTube.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <input
            type="text"
            value={streamTitle}
            onChange={(e) => setStreamTitle(e.target.value)}
            placeholder="Enter your stream title..."
            className="w-full h-12 px-4 rounded-xl border border-border bg-background/50 backdrop-blur-sm text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
          />
          <textarea
            value={streamDescription}
            onChange={(e) => setStreamDescription(e.target.value)}
            placeholder="Stream description (optional)..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 backdrop-blur-sm text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all resize-none"
          />

          <Button
            onClick={startPreview}
            className="h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-base shadow-lg shadow-rose-500/25 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:scale-[1.02]"
          >
            <Camera className="h-5 w-5 mr-2" />
            Start Camera Preview
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-6 text-center max-w-sm">
          {[
            { icon: Video, label: "HD Video", desc: "Crystal clear" },
            { icon: MessageSquare, label: "Live Chat", desc: "Real-time" },
            { icon: Users, label: "Viewers", desc: "Build community" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-[10px] text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Preview & Live State ──────────────────────────────────────────
  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Video Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === "user" && !isScreenShare ? "scale-x-[-1]" : ""}`}
          />

          {/* Camera Off Overlay */}
          {!isCamOn && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center z-10">
              <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <CameraOff className="h-12 w-12 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground text-sm">Camera is off</span>
            </div>
          )}

          {/* Top Bar Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {streamState === "live" && (
                  <Badge className="bg-red-600 text-white border-0 animate-pulse font-bold px-3 py-1 rounded-lg text-xs">
                    <Disc className="h-3 w-3 mr-1.5 animate-spin" />
                    LIVE
                  </Badge>
                )}
                {streamState === "preview" && (
                  <Badge className="bg-amber-500 text-white border-0 font-bold px-3 py-1 rounded-lg text-xs">
                    PREVIEW
                  </Badge>
                )}
                {streamState === "live" && (
                  <span className="text-white/80 text-xs font-mono bg-black/40 px-2 py-1 rounded-md">
                    {formatDuration(elapsedTime)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {streamState === "live" && (
                  <>
                    <div className="flex items-center gap-1.5 text-white/80 text-xs bg-black/40 px-2.5 py-1 rounded-lg">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{viewerCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/80 text-xs bg-black/40 px-2.5 py-1 rounded-lg">
                      <Heart className="h-3.5 w-3.5 text-rose-400" />
                      <span>{likeCount}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stream Title Overlay */}
          {streamState === "live" && streamTitle && (
            <div className="absolute bottom-20 left-4 right-4 z-20">
              <h2 className="text-white text-lg font-bold drop-shadow-lg line-clamp-1">
                {streamTitle}
              </h2>
              {streamDescription && (
                <p className="text-white/60 text-xs mt-1 line-clamp-1">{streamDescription}</p>
              )}
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="h-16 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* Mic Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMic}
              className={`rounded-xl h-10 w-10 transition-all ${
                !isMicOn ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "hover:bg-muted"
              }`}
              title={isMicOn ? "Mute microphone" : "Unmute microphone"}
            >
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>

            {/* Camera Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCam}
              className={`rounded-xl h-10 w-10 transition-all ${
                !isCamOn ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "hover:bg-muted"
              }`}
              title={isCamOn ? "Turn off camera" : "Turn on camera"}
            >
              {isCamOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>

            {/* Screen Share */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleScreenShare}
              className={`rounded-xl h-10 w-10 transition-all ${
                isScreenShare ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "hover:bg-muted"
              }`}
              title={isScreenShare ? "Stop sharing screen" : "Share screen"}
            >
              {isScreenShare ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="rounded-xl h-10 w-10 hover:bg-muted"
              title="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>

            {/* Chat Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChat(!showChat)}
              className={`rounded-xl h-10 w-10 transition-all ${
                showChat ? "bg-sky-500/10 text-sky-500 hover:bg-sky-500/20" : "hover:bg-muted"
              }`}
              title={showChat ? "Hide chat" : "Show chat"}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>

          {/* Center: Go Live / End Stream */}
          <div className="flex items-center gap-3">
            {streamState === "preview" && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => { stopCamera(); setStreamState("idle"); }}
                  className="rounded-xl h-10 px-4 text-sm font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={goLive}
                  className="rounded-xl h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-all hover:shadow-xl hover:shadow-red-600/30 hover:scale-[1.02] animate-pulse"
                >
                  <Radio className="h-4 w-4 mr-2" />
                  GO LIVE
                </Button>
              </>
            )}
            {streamState === "live" && (
              <Button
                onClick={endStream}
                className="rounded-xl h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm"
              >
                <X className="h-4 w-4 mr-2" />
                End Stream
              </Button>
            )}
          </div>

          {/* Right: Stream Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {streamState === "live" && (
              <span className="font-mono">{formatDuration(elapsedTime)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-full lg:w-[360px] border-l border-border flex flex-col bg-background/50 backdrop-blur-sm h-[40vh] lg:h-full">
          {/* Chat Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Live Chat</span>
              {streamState === "live" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {viewerCount} watching
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg lg:hidden"
              onClick={() => setShowChat(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {streamState === "preview" && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">Chat will appear here</p>
                <p className="text-xs mt-1">Go live to start chatting with viewers</p>
              </div>
            )}
            {streamState === "live" &&
              chatMessages.map((msg) => (
                <div key={msg.id} className="flex gap-2 text-sm animate-in slide-in-from-bottom-2 duration-300">
                  <span className={`font-semibold shrink-0 ${msg.color}`}>
                    {msg.user}
                  </span>
                  <span className="text-foreground/80 break-words">{msg.text}</span>
                </div>
              ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          {streamState === "live" && (
            <div className="p-3 border-t border-border shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChatMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Say something..."
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-muted/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!chatInput.trim()}
                  className="h-9 w-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
