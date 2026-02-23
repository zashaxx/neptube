"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadDropzone } from "@/lib/uploadthing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import Image from "next/image";

export default function EditProfilePage() {
  const { data: user, isLoading } = trpc.users.me.useQuery();
  const updateProfile = trpc.users.updateProfile.useMutation();

  const [name, setName] = useState(user?.name || "");
  const [bannerUrl, setBannerUrl] = useState(user?.bannerURL || "");
  const [imageUrl, setImageUrl] = useState(user?.imageURL || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = { name: name.trim() };
      if (bannerUrl) payload.bannerURL = bannerUrl;
      if (imageUrl) payload.imageURL = imageUrl;
      await updateProfile.mutateAsync(payload);
      alert("Profile updated!");
    } catch {
      alert("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-neutral-900">
      <div className="w-full max-w-sm px-2">
        <Card className="bg-neutral-800 border border-neutral-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white text-lg text-center">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-200">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required maxLength={50} className="bg-neutral-900 text-white border-neutral-700 placeholder:text-gray-400" />
              </div>
              <div>
                <Label className="text-gray-200">Profile & Banner Pictures</Label>
                <UploadDropzone
                  endpoint="thumbnailUploader"
                  onClientUploadComplete={res => {
                    if (res && res.length > 0) {
                      setImageUrl(res[0]?.ufsUrl || "");
                      if (res[1]) setBannerUrl(res[1].ufsUrl);
                    }
                  }}
                  onUploadError={err => alert("Upload failed: " + err.message)}
                  className="ut-label:text-sm border-2 border-dashed border-blue-700 rounded-lg p-4 hover:border-blue-500 transition-colors bg-neutral-900"
                />
                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  {imageUrl && (
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-300 mb-1">Profile</span>
                      <Image src={imageUrl} alt="Profile" width={96} height={96} className="w-24 h-24 object-cover rounded-full border-2 border-blue-700" />
                    </div>
                  )}
                  {bannerUrl && (
                    <div className="flex-1">
                      <span className="text-xs text-gray-300 mb-1">Banner</span>
                      <Image src={bannerUrl} alt="Banner" width={800} height={128} className="w-full h-32 object-cover rounded border-2 border-blue-700" />
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg py-3 rounded-lg shadow-lg border-2 border-blue-700" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
