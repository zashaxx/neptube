"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { UploadDropzone, UploadButton } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  Video, 
  ImageIcon, 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  Sparkles,
  RefreshCw,
  Check
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { extractMultipleFrames, type ExtractedFrame } from "@/lib/extract-video-frame";

const categories = [
  "Entertainment",
  "Music",
  "Gaming",
  "Education",
  "Sports",
  "News",
  "Comedy",
  "Technology",
  "Travel",
  "Other",
];

export default function UploadVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "details" | "done">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  
  // New state for video frame extraction
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [thumbnailSource, setThumbnailSource] = useState<"auto" | "uploaded" | "ai">("auto");

  const extractFramesFromVideo = useCallback(async () => {
    if (!videoUrl) return;
    
    setIsExtractingFrames(true);
    toast.info("Extracting thumbnail options from video...");
    
    try {
      const frames = await extractMultipleFrames(videoUrl, 4); // Extract 4 frames
      setExtractedFrames(frames);
      setSelectedFrameIndex(0);
      toast.success("Thumbnail options ready!", {
        description: "Select your preferred thumbnail below",
      });
    } catch (error) {
      console.error("Failed to extract frames:", error);
      toast.error("Couldn't extract frames from video", {
        description: "You can upload a custom thumbnail instead",
      });
    } finally {
      setIsExtractingFrames(false);
    }
  }, [videoUrl]);

  // Extract frames when video is uploaded
  useEffect(() => {
    if (videoUrl && step === "details" && extractedFrames.length === 0) {
      extractFramesFromVideo();
    }
  }, [videoUrl, step, extractedFrames.length, extractFramesFromVideo]);

  const handleFrameSelect = (index: number) => {
    setSelectedFrameIndex(index);
    setThumbnailSource("auto");
    setThumbnailUrl(""); // Clear any uploaded/AI thumbnail
  };

  const handleCustomThumbnailUpload = (url: string) => {
    setThumbnailUrl(url);
    setThumbnailSource("uploaded");
    toast.success("Custom thumbnail uploaded!");
  };

  const resetThumbnail = () => {
    setThumbnailUrl("");
    setThumbnailSource("auto");
    setSelectedFrameIndex(0);
  };

  const generateAIThumbnail = async () => {
    if (!title) {
      toast.error("Please enter a title first to generate a thumbnail");
      return;
    }

    setIsGeneratingThumbnail(true);
    setThumbnailSource("ai");
    toast.info("Generating AI thumbnail...", {
      description: "This may take a few seconds",
    });
    try {
      const response = await fetch("/api/generate-thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate thumbnail");
      }

      setThumbnailUrl(data.thumbnailUrl);
      toast.success("AI thumbnail generated!", {
        description: "Your thumbnail is ready",
      });
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      toast.error("Failed to generate thumbnail", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
      setThumbnailSource("auto");
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const createVideo = trpc.videos.create.useMutation({
    onSuccess: (data) => {
      setStep("done");
      toast.success("Video uploaded successfully!", {
        description: "Redirecting to your video...",
      });
      // Redirect to the video after 2 seconds
      setTimeout(() => {
        router.push(`/feed/${data.id}`);
      }, 2000);
    },
    onError: (error) => {
      toast.error("Failed to upload video", {
        description: error.message,
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl || !title) {
      toast.error("Missing required fields", {
        description: "Please upload a video and enter a title",
      });
      return;
    }

    // Use uploaded/AI thumbnail, or extracted frame, or nothing
    let finalThumbnailUrl = thumbnailUrl;
    
    // If no custom thumbnail but we have extracted frames, use the selected one
    if (!finalThumbnailUrl && extractedFrames.length > 0 && extractedFrames[selectedFrameIndex]) {
      finalThumbnailUrl = extractedFrames[selectedFrameIndex].dataUrl;
    }

    setIsSubmitting(true);
    
    createVideo.mutate({
      title,
      description,
      videoURL: videoUrl,
      thumbnailURL: finalThumbnailUrl || undefined,
      category: category || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/feed" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold dark:text-white">Upload Video</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${step === "upload" ? "bg-blue-600 text-white" : step === "details" || step === "done" ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {step === "details" || step === "done" ? <CheckCircle className="h-5 w-5" /> : "1"}
            </div>
            <span className="font-medium text-sm sm:text-base">Upload</span>
          </div>
          <div className="w-8 sm:w-16 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-2 ${step === "details" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${step === "details" ? "bg-blue-600 text-white" : step === "done" ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {step === "done" ? <CheckCircle className="h-5 w-5" /> : "2"}
            </div>
            <span className="font-medium text-sm sm:text-base">Details</span>
          </div>
          <div className="w-8 sm:w-16 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-2 ${step === "done" ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${step === "done" ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {step === "done" ? <CheckCircle className="h-5 w-5" /> : "3"}
            </div>
            <span className="font-medium text-sm sm:text-base">Done</span>
          </div>
        </div>

        {/* Step 1: Upload Video */}
        {step === "upload" && (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
                <Video className="h-5 w-5" />
                Upload your video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Upload a video file (max 512MB, recommended 3-5 minutes for demo)
                </p>
                
                {/* Upload Button - Alternative */}
                <div className="flex flex-col items-center gap-4">
                  <UploadButton
                    endpoint="videoUploader"
                    onClientUploadComplete={(res) => {
                      console.log("Upload complete:", res);
                      if (res && res[0]) {
                        toast.success("Video file uploaded!", {
                          description: "Now add details for your video",
                        });
                        setVideoUrl(res[0].ufsUrl);
                        setVideoName(res[0].name);
                        setTitle(res[0].name.replace(/\.[^/.]+$/, ""));
                        setStep("details");
                      }
                    }}
                    onUploadError={(error: Error) => {
                      console.error("Upload error:", error);
                      toast.error("Upload failed", {
                        description: error.message,
                      });
                    }}
                    onUploadBegin={(name) => {
                      console.log("Upload started:", name);
                      toast.info("Uploading video...", {
                        description: name,
                      });
                    }}
                  />
                  <p className="text-sm text-gray-400 dark:text-gray-500">or drag and drop below</p>
                </div>

                <UploadDropzone
                  endpoint="videoUploader"
                  onClientUploadComplete={(res) => {
                    console.log("Upload complete:", res);
                    if (res && res[0]) {
                      toast.success("Video file uploaded!", {
                        description: "Now add details for your video",
                      });
                      setVideoUrl(res[0].ufsUrl);
                      setVideoName(res[0].name);
                      setTitle(res[0].name.replace(/\.[^/.]+$/, "")); // Remove extension for title
                      setStep("details");
                    }
                  }}
                  onUploadError={(error: Error) => {
                    console.error("Upload error:", error);
                    toast.error("Upload failed", {
                      description: error.message,
                    });
                  }}
                  onUploadBegin={(name) => {
                    console.log("Upload started:", name);
                  }}
                  className="ut-label:text-lg ut-allowed-content:text-gray-500 dark:ut-allowed-content:text-gray-400 ut-uploading:cursor-not-allowed border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 hover:border-blue-500 dark:hover:border-blue-400 transition-colors dark:bg-gray-800"
                />
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                  By uploading, you agree to NepTube&apos;s Terms of Service
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Video Details */}
        {step === "details" && (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl dark:text-white">Video Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-base dark:text-gray-300">Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter video title"
                        required
                        maxLength={100}
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white text-base"
                      />
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{title.length}/100</p>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-base dark:text-gray-300">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell viewers about your video"
                        rows={5}
                        maxLength={5000}
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white text-base"
                      />
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{description.length}/5000</p>
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-base dark:text-gray-300">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-white text-base">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="dark:text-white text-base">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Thumbnail */}
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
                      <ImageIcon className="h-5 w-5" />
                      Thumbnail
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* If we have an uploaded/AI thumbnail, show it */}
                    {thumbnailUrl && thumbnailSource !== "auto" ? (
                      <div className="space-y-4">
                        <div className="relative w-full max-w-md">
                          <Image
                            src={thumbnailUrl}
                            alt="Video thumbnail"
                            width={400}
                            height={225}
                            className="w-full rounded-lg border-2 border-green-500"
                          />
                          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                            {thumbnailSource === "uploaded" ? "Custom Upload" : "AI Generated"}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={resetThumbnail}
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Auto-extracted frames section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                              Select from video frames (auto-extracted)
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={extractFramesFromVideo}
                              disabled={isExtractingFrames}
                              className="text-blue-600 dark:text-blue-400"
                            >
                              <RefreshCw className={`h-4 w-4 mr-1 ${isExtractingFrames ? "animate-spin" : ""}`} />
                              Refresh
                            </Button>
                          </div>

                          {isExtractingFrames && extractedFrames.length === 0 ? (
                            <div className="flex items-center justify-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                              <span className="text-gray-600 dark:text-gray-400">Extracting frames from video...</span>
                            </div>
                          ) : extractedFrames.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {extractedFrames.map((frame, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleFrameSelect(index)}
                                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                                    selectedFrameIndex === index && thumbnailSource === "auto"
                                      ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
                                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                                  }`}
                                >
                                  <Image
                                    src={frame.dataUrl}
                                    alt={`Frame at ${frame.timestamp.toFixed(1)}s`}
                                    fill
                                    className="object-cover"
                                  />
                                  {selectedFrameIndex === index && thumbnailSource === "auto" && (
                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                      <Check className="h-8 w-8 text-white drop-shadow-lg" />
                                    </div>
                                  )}
                                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                    {frame.timestamp.toFixed(1)}s
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Couldn&apos;t extract frames. Upload a custom thumbnail below.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t dark:border-gray-700" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or choose another option</span>
                          </div>
                        </div>

                        {/* Alternative options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Upload custom thumbnail */}
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Upload custom thumbnail
                            </p>
                            <UploadDropzone
                              endpoint="thumbnailUploader"
                              onClientUploadComplete={(res) => {
                                if (res && res[0]) {
                                  handleCustomThumbnailUpload(res[0].ufsUrl);
                                }
                              }}
                              onUploadError={(error: Error) => {
                                toast.error("Thumbnail upload failed", {
                                  description: error.message,
                                });
                              }}
                              className="ut-label:text-xs ut-allowed-content:text-xs border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors dark:bg-gray-800 ut-button:bg-blue-500"
                            />
                          </div>

                          {/* AI Generate Button */}
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Generate with AI
                            </p>
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 h-[140px] hover:border-purple-500 transition-colors dark:bg-gray-800">
                              <Button
                                type="button"
                                onClick={generateAIThumbnail}
                                disabled={isGeneratingThumbnail || !title}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                              >
                                {isGeneratingThumbnail ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate AI Thumbnail
                                  </>
                                )}
                              </Button>
                              {!title && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2">
                                  Enter a title first
                                </p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                                Powered by Pollinations AI (Free)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <video
                        src={videoUrl}
                        controls
                        className="w-full rounded-lg bg-black"
                      />
                      <p className="font-medium text-sm truncate dark:text-white">
                        {title || "Untitled Video"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{videoName}</p>
                      
                      {/* Thumbnail preview */}
                      <div className="pt-2 border-t dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Thumbnail:</p>
                        {thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt="Thumbnail preview"
                            width={200}
                            height={112}
                            className="w-full rounded"
                          />
                        ) : extractedFrames[selectedFrameIndex] ? (
                          <Image
                            src={extractedFrames[selectedFrameIndex].dataUrl}
                            alt="Thumbnail preview"
                            width={200}
                            height={112}
                            className="w-full rounded"
                          />
                        ) : (
                          <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">No thumbnail</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !title || !videoUrl}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Publish Video
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <Card className="text-center py-12 dark:bg-gray-900 dark:border-gray-800">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Video Published!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your video has been uploaded successfully and is now live.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to your video...
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
