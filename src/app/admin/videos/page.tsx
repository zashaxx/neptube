"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Check, X, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";

export default function AdminVideosPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "pending" | "published" | "rejected"
  >("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getVideos.useQuery({
    search: search || undefined,
    status: statusFilter,
    limit: 50,
  });

  const updateStatus = trpc.admin.updateVideoStatus.useMutation({
    onSuccess: () => {
      utils.admin.getVideos.invalidate();
      utils.admin.getStats.invalidate();
    },
  });

  const deleteVideo = trpc.admin.deleteVideo.useMutation({
    onSuccess: () => {
      utils.admin.getVideos.invalidate();
      utils.admin.getStats.invalidate();
    },
  });

  const handleApprove = (videoId: string) => {
    updateStatus.mutate({ videoId, status: "published" });
  };

  const handleReject = (videoId: string) => {
    setSelectedVideo(videoId);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedVideo) {
      updateStatus.mutate({
        videoId: selectedVideo,
        status: "rejected",
        rejectionReason: rejectionReason || undefined,
      });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedVideo(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "draft":
        return <Badge className="bg-muted text-foreground">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Videos</h1>
        <p className="text-muted-foreground mt-1">
          Review and moderate video content
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v: typeof statusFilter) => setStatusFilter(v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Videos Table */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Video</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No videos found
                </TableCell>
              </TableRow>
            ) : (
              data?.videos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
                        {video.thumbnailURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={video.thumbnailURL}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No thumb
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[200px]">
                          {video.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {video.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={video.user.imageURL} />
                        <AvatarFallback>{video.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{video.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(video.status)}</TableCell>
                  <TableCell>
                    {video.status === "published" ? (
                      <Badge className="bg-green-100 text-green-800">Approved</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">Unapproved</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      {video.viewCount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(video.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Badge className="bg-primary/10 text-primary">{video.status}</Badge>
                      {video.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleApprove(video.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {video.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleReject(video.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      )}
                      {video.status === "published" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatus.mutate({
                              videoId: video.id,
                              status: "pending",
                            })
                          }
                        >
                          Unpublish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (
                            confirm("Are you sure you want to delete this video?")
                          ) {
                            deleteVideo.mutate({ videoId: video.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {data && (
          <div className="px-4 py-3 border-t text-sm text-muted-foreground">
            Showing {data.videos.length} of {data.total} videos
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Video</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this video.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter rejection reason (optional)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Rejecting..." : "Reject Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
