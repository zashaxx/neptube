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
      <div className="py-6 dark:bg-gray-950 bg-white min-h-screen w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Card className="dark:bg-gray-900 dark:border-gray-800">
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
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-950">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Not authenticated</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Please sign in to access your channel settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 dark:bg-gray-950 bg-white min-h-screen w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold dark:text-white mb-2">Your Channel</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Customize your channel profile and information
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-white">Profile Information</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Update your channel name, profile picture, and bio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div>
                <Label className="dark:text-white mb-3 block">Profile Picture</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={imageURL || user.imageURL} alt={name || user.name} />
                    <AvatarFallback className="text-2xl">
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
                        button: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ut-ready:bg-blue-600 ut-uploading:bg-blue-600 ut-uploading:cursor-not-allowed",
                        allowedContent: "text-xs text-gray-500 dark:text-gray-400 mt-2",
                      }}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Recommended: Square image, at least 98x98 pixels
                    </p>
                    {isUploadingImage && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Channel Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-white">
                  Channel Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your channel name"
                  maxLength={100}
                  required
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {name.length}/100 characters
                </p>
              </div>

              {/* Description/Bio */}
              <div className="space-y-2">
                <Label htmlFor="description" className="dark:text-white">
                  Channel Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your channel"
                  maxLength={1000}
                  rows={4}
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {description.length}/1000 characters
                </p>
              </div>

              {/* Current Image URL (readonly, for reference) */}
              {imageURL && imageURL !== user.imageURL && (
                <div className="space-y-2">
                  <Label className="dark:text-white">New Image URL</Label>
                  <Input
                    type="text"
                    value={imageURL}
                    readOnly
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 text-xs"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-800">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || isUploadingImage}
                  className="bg-blue-600 hover:bg-blue-700"
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
                  className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Additional Info Card */}
        <Card className="mt-6 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Channel ID</span>
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded dark:text-gray-300">
                {user.id}
              </code>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Member Since</span>
              <span className="text-sm dark:text-gray-300">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated</span>
              <span className="text-sm dark:text-gray-300">
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
