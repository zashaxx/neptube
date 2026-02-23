"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Upload, Video, ImageIcon, ArrowLeft, Loader2, CheckCircle, Sparkles, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
  const [isShort, setIsShort] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("type") === "short") {
      setIsShort(true);
    }
  }, [searchParams]);

  const generateAIThumbnail = async () => {
    if (!title) {
      alert("Please enter a title first to generate a thumbnail");
      return;
    }

    setIsGeneratingThumbnail(true);
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
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      alert(error instanceof Error ? error.message : "Failed to generate thumbnail");
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const createVideo = trpc.videos.create.useMutation({
    onSuccess: (data) => {
      setStep("done");
      // Redirect to the video after 2 seconds
      setTimeout(() => {
        router.push(`/feed/${data.id}`);
      }, 2000);
    },
    onError: (error) => {
      alert("Error creating video: " + error.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl || !title) {
      alert("Please upload a video and enter a title");
      return;
    }

    setIsSubmitting(true);
    
    createVideo.mutate({
      title,
      description,
      videoURL: videoUrl,
      thumbnailURL: thumbnailUrl || undefined,
      category: category || undefined,
      isShort,
    });
  };

  return (
    <div className="py-6 min-h-screen w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight gradient-text">
            {isShort ? "Upload Short" : "Upload Video"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Share your content with the world</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${step === "upload" ? "bg-primary text-white" : step === "details" || step === "done" ? "bg-green-500 text-white" : "bg-muted"}`}>
              {step === "details" || step === "done" ? <CheckCircle className="h-4 w-4" /> : "1"}
            </div>
            <span className="text-sm font-medium">Upload</span>
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === "details" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${step === "details" ? "bg-primary text-white" : step === "done" ? "bg-green-500 text-white" : "bg-muted"}`}>
              {step === "done" ? <CheckCircle className="h-4 w-4" /> : "2"}
            </div>
            <span className="text-sm font-medium">Details</span>
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === "done" ? "text-green-600" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${step === "done" ? "bg-green-500 text-white" : "bg-muted"}`}>
              {step === "done" ? <CheckCircle className="h-4 w-4" /> : "3"}
            </div>
            <span className="text-sm font-medium">Done</span>
          </div>
        </div>

        {/* Step 1: Upload Video */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Upload your video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a video file (max 512MB, recommended 3-5 minutes for demo)
                </p>
                
                {/* Upload Button - Alternative */}
                <div className="flex flex-col items-center gap-4">
                  <UploadButton
                    endpoint="videoUploader"
                    onClientUploadComplete={(res) => {
                      console.log("Upload complete:", res);
                      if (res && res[0]) {
                        setVideoUrl(res[0].ufsUrl);
                        setVideoName(res[0].name);
                        setTitle(res[0].name.replace(/\.[^/.]+$/, ""));
                        setStep("details");
                      }
                    }}
                    onUploadError={(error: Error) => {
                      console.error("Upload error:", error);
                      alert(`Upload failed: ${error.message}`);
                    }}
                    onUploadBegin={(name) => {
                      console.log("Upload started:", name);
                    }}
                  />
                  <p className="text-sm text-muted-foreground">or drag and drop below</p>
                </div>

                <UploadDropzone
                  endpoint="videoUploader"
                  onClientUploadComplete={(res) => {
                    console.log("Upload complete:", res);
                    if (res && res[0]) {
                      setVideoUrl(res[0].ufsUrl);
                      setVideoName(res[0].name);
                      setTitle(res[0].name.replace(/\.[^/.]+$/, "")); // Remove extension for title
                      setStep("details");
                    }
                  }}
                  onUploadError={(error: Error) => {
                    console.error("Upload error:", error);
                    alert(`Upload failed: ${error.message}`);
                  }}
                  onUploadBegin={(name) => {
                    console.log("Upload started:", name);
                  }}
                  className="ut-label:text-lg ut-allowed-content:text-muted-foreground ut-uploading:cursor-not-allowed border-2 border-dashed border-border rounded-xl p-8 hover:border-primary/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground text-center">
                  By uploading, you agree to NepTube&apos;s Terms of Service
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Video Details */}
        {step === "details" && (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Form */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Video Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter video title"
                        required
                        maxLength={100}
                      />
                      <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell viewers about your video"
                        rows={5}
                        maxLength={5000}
                      />
                      <p className="text-xs text-gray-500 mt-1">{description.length}/5000</p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="is-short" className="flex items-center gap-2 cursor-pointer">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          Upload as Short
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Short videos (under 60s) appear in the Shorts feed
                        </p>
                      </div>
                      <Switch
                        id="is-short"
                        checked={isShort}
                        onCheckedChange={setIsShort}
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Thumbnail */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Thumbnail
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a custom thumbnail or generate one with AI
                    </p>
                    {thumbnailUrl ? (
                      <div className="relative w-full max-w-md">
                        <Image
                          src={thumbnailUrl}
                          alt="Video thumbnail"
                          width={400}
                          height={225}
                          className="w-full rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setThumbnailUrl("")}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* AI Generate Button */}
                        <Button
                          type="button"
                          onClick={generateAIThumbnail}
                          disabled={isGeneratingThumbnail || !title}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        >
                          {isGeneratingThumbnail ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating with AI...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate AI Thumbnail
                            </>
                          )}
                        </Button>
                        {!title && (
                          <p className="text-xs text-amber-600 text-center">
                            Enter a title above to enable AI thumbnail generation
                          </p>
                        )}
                        
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or upload</span>
                          </div>
                        </div>

                        <UploadDropzone
                          endpoint="thumbnailUploader"
                          onClientUploadComplete={(res) => {
                            if (res && res[0]) {
                              setThumbnailUrl(res[0].ufsUrl);
                            }
                          }}
                          onUploadError={(error: Error) => {
                            alert(`Thumbnail upload failed: ${error.message}`);
                          }}
                          className="ut-label:text-sm border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="font-medium text-sm truncate">
                        {title || "Untitled Video"}
                      </p>
                      <p className="text-xs text-muted-foreground">{videoName}</p>
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
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Video Published!</h2>
              <p className="text-muted-foreground mb-4">
                Your video has been uploaded successfully and is now live.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to your video...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
