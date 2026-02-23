"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Save, User } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { Textarea } from "@/components/ui/textarea";

export default function ChannelSettingsPage() {
  const utils = trpc.useUtils();
  
  const { data: user, isLoading: userLoading } = trpc.users.me.useQuery();
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      utils.users.me.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageURL, setImageURL] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Initialize form when user data loads
  useState(() => {
    if (user) {
      setName(user.name || "");
      setDescription(user.description || "");
      setImageURL(user.imageURL || "");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    await updateProfile.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      imageURL: imageURL || undefined,
    });
  };

  if (userLoading) {
    return (
      <div className="py-6 min-h-screen w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Card className="glass-card border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Not authenticated</CardTitle>
            <CardDescription>
              Please sign in to access your channel settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 min-h-screen w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold gradient-text mb-2">Your Channel</h1>
          <p className="text-muted-foreground">
            Customize your channel profile and information
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your channel name, profile picture, and bio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div>
                <Label className="mb-3 block">Profile Picture</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={imageURL || user.imageURL} alt={name || user.name} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {(name || user.name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <UploadButton
                      endpoint="imageUploader"
                      onClientUploadComplete={(res) => {
                        if (res?.[0]?.url) {
                          setImageURL(res[0].url);
                          setIsUploadingImage(false);
                          toast.success("Image uploaded successfully!");
                        }
                      }}
                      onUploadError={(error: Error) => {
                        setIsUploadingImage(false);
                        toast.error(`Upload failed: ${error.message}`);
                      }}
                      onUploadBegin={() => {
                        setIsUploadingImage(true);
                      }}
                      appearance={{
                        button: "bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors ut-ready:bg-primary ut-uploading:bg-primary ut-uploading:cursor-not-allowed",
                        allowedContent: "text-xs text-muted-foreground mt-2",
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Recommended: Square image, at least 98x98 pixels
                    </p>
                    {isUploadingImage && (
                      <p className="text-sm text-primary mt-2 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Channel Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Channel Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your channel name"
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/100 characters
                </p>
              </div>

              {/* Description/Bio */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Channel Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your channel"
                  maxLength={1000}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/1000 characters
                </p>
              </div>

              {/* Current Image URL (readonly, for reference) */}
              {imageURL && imageURL !== user.imageURL && (
                <div className="space-y-2">
                  <Label>New Image URL</Label>
                  <Input
                    type="text"
                    value={imageURL}
                    readOnly
                    className="text-xs text-muted-foreground"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || isUploadingImage}
                  className="gradient-btn"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setName(user.name || "");
                    setDescription(user.description || "");
                    setImageURL(user.imageURL || "");
                    toast.info("Changes discarded");
                  }}
                  disabled={updateProfile.isPending}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Additional Info Card */}
        <Card className="mt-6 glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Channel ID</span>
              <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                {user.id}
              </code>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm">
                {new Date(user.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
