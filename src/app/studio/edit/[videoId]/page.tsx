"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDropzone } from "@/lib/uploadthing";
import {
  ArrowLeft,
  Loader2,
  Video,
  ImageIcon,
  Sparkles,
  Save,
} from "lucide-react";

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

export default function EditVideoPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.videoId as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("public");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const utils = trpc.useUtils();

  const { data: video, isLoading } = trpc.videos.getById.useQuery({ id: videoId });

  const updateVideo = trpc.videos.update.useMutation({
    onSuccess: () => {
      utils.videos.getMyVideos.invalidate();
      router.push("/studio");
    },
  });

  // Load video data into form
  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description || "");
      setCategory(video.category || "");
      setVisibility(video.visibility);
      setThumbnailUrl(video.thumbnailURL || "");
    }
  }, [video]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateVideo.mutateAsync({
        id: videoId,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        visibility,
        thumbnailURL: thumbnailUrl || undefined,
      });
    } catch (error) {
      console.error("Error updating video:", error);
      alert("Failed to update video. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Video not found</h1>
        <Link href="/studio">
          <Button>Back to Studio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Studio
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Edit Video</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Details */}
            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  maxLength={100}
                  required
                />
                <p className="text-xs text-gray-500">{title.length}/100</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your video"
                  rows={5}
                  maxLength={5000}
                />
                <p className="text-xs text-gray-500">{description.length}/5000</p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
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

              {/* Visibility */}
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone can watch</SelectItem>
                    <SelectItem value="unlisted">Unlisted - Only people with link</SelectItem>
                    <SelectItem value="private">Private - Only you can watch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column - Thumbnail & Preview */}
            <div className="space-y-6">
              {/* Thumbnail */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Thumbnail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {thumbnailUrl ? (
                    <div className="space-y-3">
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={thumbnailUrl}
                          alt="Video thumbnail"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setThumbnailUrl("")}
                      >
                        Change Thumbnail
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

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-gray-500">Or upload</span>
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
                        className="ut-label:text-sm border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 transition-colors"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Video Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {video.videoURL ? (
                    <video
                      src={video.videoURL}
                      controls
                      className="w-full rounded-lg"
                      poster={thumbnailUrl || undefined}
                    />
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">No video</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/studio">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
