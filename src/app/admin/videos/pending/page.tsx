"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPendingVideosPage() {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getPendingVideos.useQuery({ limit: 50 });
  const pendingVideos = data?.videos ?? [];

  const updateStatus = trpc.admin.updateVideoStatus.useMutation({
    onSuccess: () => {
      utils.admin.getPendingVideos.invalidate();
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
          <h1 className="text-2xl font-bold">Pending Videos</h1>
          <p className="text-sm text-muted-foreground">{pendingVideos.length} video{pendingVideos.length !== 1 ? "s" : ""} awaiting review</p>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thumbnail</TableHead>
              <TableHead className="w-[30%]">Title</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading pending videos...
                </TableCell>
              </TableRow>
            ) : pendingVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No pending videos
                </TableCell>
              </TableRow>
            ) : (
              pendingVideos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    {v.thumbnailURL ? (
                      <Image
                        src={v.thumbnailURL}
                        alt={v.title ?? ""}
                        width={96}
                        height={56}
                        className="w-24 h-14 object-cover rounded"
                      />
                    ) : (
                      <div className="w-24 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No thumb
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium line-clamp-2">{v.title ?? "Untitled"}</p>
                    {v.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[250px] mt-0.5">{v.description}</p>
                    )}
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
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(v.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-600"
                        disabled={actionLoading === v.id}
                        onClick={() => {
                          setActionLoading(v.id);
                          updateStatus.mutate({ videoId: v.id, status: "published" });
                        }}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600"
                        disabled={actionLoading === v.id}
                        onClick={() => {
                          setActionLoading(v.id);
                          updateStatus.mutate({
                            videoId: v.id,
                            status: "rejected",
                            rejectionReason: "Rejected by admin",
                          });
                        }}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
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
