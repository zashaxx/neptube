"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldOff, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminNsfwVideosPage() {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getNsfwVideos.useQuery({ limit: 50 });
  const nsfwVideos = data?.videos ?? [];

  const toggleNsfw = trpc.admin.toggleNsfw.useMutation({
    onSuccess: () => {
      utils.admin.getNsfwVideos.invalidate();
      utils.admin.getStats.invalidate();
    },
  });

  const deleteVideo = trpc.admin.deleteVideo.useMutation({
    onSuccess: () => {
      utils.admin.getNsfwVideos.invalidate();
      utils.admin.getStats.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">NSFW Flagged Videos</h1>
          <p className="text-sm text-muted-foreground">{nsfwVideos.length} video{nsfwVideos.length !== 1 ? "s" : ""} flagged as NSFW</p>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thumbnail</TableHead>
              <TableHead className="w-[30%]">Title</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading NSFW videos...
                </TableCell>
              </TableRow>
            ) : nsfwVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No NSFW flagged videos
                </TableCell>
              </TableRow>
            ) : (
              nsfwVideos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    {v.thumbnailURL ? (
                      <div className="relative">
                        <Image
                          src={v.thumbnailURL}
                          alt={v.title ?? ""}
                          width={96}
                          height={56}
                          className="w-24 h-14 object-cover rounded blur-sm"
                        />
                        <Badge variant="destructive" className="absolute inset-0 m-auto w-fit h-fit text-[9px]">
                          NSFW
                        </Badge>
                      </div>
                    ) : (
                      <div className="w-24 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No thumb
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium line-clamp-2">{v.title ?? "Untitled"}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={v.user?.imageURL ?? ""} />
                        <AvatarFallback className="text-[10px]">{v.user?.name?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{v.user?.name ?? "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{v.viewCount ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(v.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={actionLoading === v.id}
                        onClick={() => {
                          setActionLoading(v.id);
                          toggleNsfw.mutate({ videoId: v.id, isNsfw: false });
                        }}
                      >
                        <ShieldOff className="h-3 w-3 mr-1" /> Unflag
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600"
                        disabled={actionLoading === v.id}
                        onClick={() => {
                          setActionLoading(v.id);
                          deleteVideo.mutate({ videoId: v.id });
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
